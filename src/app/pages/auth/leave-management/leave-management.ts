import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { TooltipModule } from 'primeng/tooltip';

import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { TranslationService } from '../../../core/i18n/translation.service';
import { PageHeaderService } from '../../../shared/page-header/page-header.service';
import { ToastService } from '../../../core/toast/toast.service';
import { PermissionsService } from '../../../core/roles/permissions.service';
import { LeaveApiService, LeaveAllocationConfig, LeaveRole, LeaveType } from '../../../core/leave/leave-api.service';

const LEAVE_TYPES: LeaveType[] = ['CASUAL', 'SICK', 'EARNED'];
const LEAVE_ROLES: LeaveRole[] = ['BRANCH_MANAGER', 'TRAINER', 'FRONT_DESK'];

interface AllocationDraftEntry {
  monthlyAllocation: number;
  // Only meaningful (and only shown in the UI) for Earned — that's the
  // one leave type that carries forward across years instead of
  // expiring, so it's the only one with anything to cap. For Casual
  // and Sick this always mirrors monthlyAllocation: they're wiped to 0
  // every January 1st (see the backend's yearly expiry job) rather
  // than being limited by a monthly cap.
  carryForwardCap: number;
}

/**
 * Leave allocation setup. Casual and Sick are simple: one number —
 * days credited per month — because unused balance is forfeited at
 * the start of each year. Earned is different by policy (accrues
 * across years, and in some organizations gets cashed out), so it
 * alone gets a second field for the maximum balance it can carry
 * forward to. Showing that second field only where it's actually
 * meaningful keeps Casual/Sick as simple as possible without hiding a
 * real distinction for Earned.
 */
@Component({
  selector: 'app-leave-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, InputNumberModule, TooltipModule, TranslatePipe],
  templateUrl: './leave-management.html',
  styleUrls: ['./leave-management.css'],
})
export class LeaveManagement implements OnInit {
  private leaveApi = inject(LeaveApiService);
  private toast = inject(ToastService);
  private i18n = inject(TranslationService);
  private destroyRef = inject(DestroyRef);
  private pageHeader = inject(PageHeaderService);
  private permissions = inject(PermissionsService);

  canWrite = computed(() => this.permissions.canWrite('LEAVES'));

  leaveTypes = LEAVE_TYPES;
  leaveRoles = LEAVE_ROLES;

  // Edits are staged locally and only sent to the server on "Save
  // changes" (same pattern as Roles & Permissions) — saving cell-by-cell
  // and reloading after every save was wiping out whatever was typed
  // into the OTHER cells in between.
  configLoading = signal(true);
  configDraft = signal<Record<string, AllocationDraftEntry>>({});
  configSavedSnapshot = signal<Record<string, AllocationDraftEntry>>({});
  savingConfig = signal(false);

  isCarryForwardType(leaveType: LeaveType): boolean {
    return leaveType === 'EARNED';
  }

  configKey(role: LeaveRole, leaveType: LeaveType): string {
    return `${role}:${leaveType}`;
  }

  configFor(role: LeaveRole, leaveType: LeaveType): AllocationDraftEntry {
    return this.configDraft()[this.configKey(role, leaveType)] ?? { monthlyAllocation: 0, carryForwardCap: 0 };
  }

  updateMonthlyAllocation(role: LeaveRole, leaveType: LeaveType, value: number): void {
    const key = this.configKey(role, leaveType);
    const monthlyAllocation = value ?? 0;
    this.configDraft.update((draft) => {
      const entry = this.configFor(role, leaveType);
      // Casual/Sick have no independent cap — keep it locked to the
      // monthly amount so there's nothing extra to remember to update.
      const carryForwardCap = this.isCarryForwardType(leaveType) ? Math.max(entry.carryForwardCap, monthlyAllocation) : monthlyAllocation;
      return { ...draft, [key]: { monthlyAllocation, carryForwardCap } };
    });
  }

  updateCarryForwardCap(role: LeaveRole, leaveType: LeaveType, value: number): void {
    const key = this.configKey(role, leaveType);
    this.configDraft.update((draft) => {
      const entry = this.configFor(role, leaveType);
      // Can't go below the monthly amount — the DTO rejects that combination.
      const carryForwardCap = Math.max(value ?? 0, entry.monthlyAllocation);
      return { ...draft, [key]: { ...entry, carryForwardCap } };
    });
  }

  isConfigDirty = computed(() => {
    const draft = this.configDraft();
    const saved = this.configSavedSnapshot();
    return Object.keys(draft).some(
      (key) => draft[key].monthlyAllocation !== saved[key]?.monthlyAllocation || draft[key].carryForwardCap !== saved[key]?.carryForwardCap,
    );
  });

  discardConfigChanges(): void {
    this.configDraft.set(structuredClone(this.configSavedSnapshot()));
  }

  saveAllConfig(): void {
    const draft = this.configDraft();
    const saved = this.configSavedSnapshot();
    const changedEntries = Object.entries(draft).filter(
      ([key, value]) => value.monthlyAllocation !== saved[key]?.monthlyAllocation || value.carryForwardCap !== saved[key]?.carryForwardCap,
    );
    if (!changedEntries.length) return;

    this.savingConfig.set(true);
    const calls = changedEntries.map(([key, value]) => {
      const [role, leaveType] = key.split(':') as [LeaveRole, LeaveType];
      return this.leaveApi
        .upsertConfig({ role, leaveType, monthlyAllocation: value.monthlyAllocation, carryForwardCap: value.carryForwardCap })
        .pipe(catchError(() => of(null)));
    });

    forkJoin(calls).subscribe((results) => {
      this.savingConfig.set(false);
      if (results.some((r) => r === null)) {
        this.toast.error(this.i18n.t('leaveManagement.configSaveError'));
      } else {
        this.toast.success(this.i18n.t('leaveManagement.configSaved'));
      }
      this.loadConfig();
    });
  }

  ngOnInit(): void {
    this.pageHeader.setTitleKey('leaveManagement.title');
    this.destroyRef.onDestroy(() => this.pageHeader.clear());
    this.loadConfig();
  }

  loadConfig(): void {
    this.configLoading.set(true);
    this.leaveApi.listConfig().subscribe({
      next: (rows: LeaveAllocationConfig[]) => {
        this.configLoading.set(false);
        const draft: Record<string, AllocationDraftEntry> = {};
        for (const role of LEAVE_ROLES) {
          for (const leaveType of LEAVE_TYPES) {
            const row = rows.find((r) => r.role === role && r.leaveType === leaveType);
            const monthlyAllocation = row ? Number(row.monthlyAllocation) : 0;
            const carryForwardCap = row ? Number(row.carryForwardCap) : 0;
            draft[this.configKey(role, leaveType)] = { monthlyAllocation, carryForwardCap };
          }
        }
        this.configDraft.set(draft);
        this.configSavedSnapshot.set(structuredClone(draft));
      },
      error: () => {
        this.configLoading.set(false);
      },
    });
  }

  leaveTypeLabel(type: LeaveType): string {
    return this.i18n.t(`leaveManagement.type.${type}`);
  }

  roleLabel(role: LeaveRole): string {
    return this.i18n.t(`rolePermissions.role.${role}`);
  }
}
