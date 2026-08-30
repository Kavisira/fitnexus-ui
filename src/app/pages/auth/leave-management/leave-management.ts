import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { SelectModule } from 'primeng/select';
import { DialogModule } from 'primeng/dialog';
import { TextareaModule } from 'primeng/textarea';
import { InputNumberModule } from 'primeng/inputnumber';
import { TooltipModule } from 'primeng/tooltip';

import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { TranslationService } from '../../../core/i18n/translation.service';
import { ToastService } from '../../../core/toast/toast.service';
import { PermissionsService } from '../../../core/roles/permissions.service';
import { TokenStorage } from '../../../core/auth/token-storage.service';
import {
  LeaveApiService,
  LeaveAllocationConfig,
  LeaveRequest,
  LeaveRole,
  LeaveStatus,
  LeaveType,
} from '../../../core/leave/leave-api.service';

const LEAVE_TYPES: LeaveType[] = ['CASUAL', 'SICK', 'EARNED'];
const LEAVE_ROLES: LeaveRole[] = ['BRANCH_MANAGER', 'TRAINER', 'FRONT_DESK'];

/**
 * The approver-facing half of leave management: reviewing a team's
 * leave requests (approve/reject) and, for whoever has LEAVES write
 * access, configuring how many days each role accrues per month. The
 * employee-facing half (my balance, apply, my history) lives on the
 * Dashboard's Employee Portal tab instead — this screen is reached via
 * the sidenav and gated the normal way by the LEAVES permission.
 */
@Component({
  selector: 'app-leave-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    TagModule,
    SelectModule,
    DialogModule,
    TextareaModule,
    InputNumberModule,
    TooltipModule,
    TranslatePipe,
  ],
  templateUrl: './leave-management.html',
  styleUrls: ['./leave-management.css'],
})
export class LeaveManagement implements OnInit {
  private leaveApi = inject(LeaveApiService);
  private toast = inject(ToastService);
  private i18n = inject(TranslationService);
  private permissions = inject(PermissionsService);
  private tokenStorage = inject(TokenStorage);

  canWrite = computed(() => this.permissions.canWrite('LEAVES'));

  leaveTypes = LEAVE_TYPES;
  leaveRoles = LEAVE_ROLES;

  loading = signal(true);
  requests = signal<LeaveRequest[]>([]);
  statusFilter = signal<LeaveStatus | null>('PENDING');

  statusFilterOptions = computed(() => [
    { label: this.i18n.t('leaveManagement.allStatuses'), value: null },
    { label: this.i18n.t('leaveManagement.status.PENDING'), value: 'PENDING' as LeaveStatus },
    { label: this.i18n.t('leaveManagement.status.APPROVED'), value: 'APPROVED' as LeaveStatus },
    { label: this.i18n.t('leaveManagement.status.REJECTED'), value: 'REJECTED' as LeaveStatus },
    { label: this.i18n.t('leaveManagement.status.CANCELLED'), value: 'CANCELLED' as LeaveStatus },
  ]);

  decisionDialogVisible = signal(false);
  decisionTarget = signal<LeaveRequest | null>(null);
  decisionApprove = signal(true);
  decisionNote = signal('');
  deciding = signal(false);

  // ---- Allocation config (Owner / anyone with LEAVES write) ----
  // Edits are staged locally in configDraft and only sent to the
  // server when "Save changes" is clicked (same pattern as Roles &
  // Permissions) — saving row-by-row and reloading after every single
  // save was wiping out whatever you'd already typed into the OTHER
  // rows, which read as the cap "not clearing"/resetting itself.
  configLoading = signal(true);
  config = signal<LeaveAllocationConfig[]>([]);
  configDraft = signal<Record<string, { monthlyAllocation: number; carryForwardCap: number }>>({});
  configSavedSnapshot = signal<Record<string, { monthlyAllocation: number; carryForwardCap: number }>>({});
  savingConfig = signal(false);

  configKey(role: LeaveRole, leaveType: LeaveType): string {
    return `${role}:${leaveType}`;
  }

  configFor(role: LeaveRole, leaveType: LeaveType) {
    const key = this.configKey(role, leaveType);
    return this.configDraft()[key] ?? { monthlyAllocation: 0, carryForwardCap: 0 };
  }

  updateConfigDraft(role: LeaveRole, leaveType: LeaveType, field: 'monthlyAllocation' | 'carryForwardCap', value: number): void {
    const key = this.configKey(role, leaveType);
    this.configDraft.update((draft) => ({ ...draft, [key]: { ...this.configFor(role, leaveType), [field]: value } }));
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

    const invalid = changedEntries.find(([, value]) => value.carryForwardCap < value.monthlyAllocation);
    if (invalid) {
      this.toast.error(this.i18n.t('leaveManagement.capBelowAllocationError'));
      return;
    }

    this.savingConfig.set(true);
    const calls = changedEntries.map(([key, value]) => {
      const [role, leaveType] = key.split(':') as [LeaveRole, LeaveType];
      return this.leaveApi.upsertConfig({ role, leaveType, ...value }).pipe(catchError(() => of(null)));
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
    this.loadRequests();
    this.loadConfig();
  }

  loadRequests(): void {
    this.loading.set(true);
    this.leaveApi.teamRequests({ status: this.statusFilter() ?? undefined }).subscribe({
      next: (requests) => {
        this.loading.set(false);
        this.requests.set(requests);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error(this.i18n.t('leaveManagement.loadError'));
      },
    });
  }

  onStatusFilterChange(status: LeaveStatus | null): void {
    this.statusFilter.set(status);
    this.loadRequests();
  }

  loadConfig(): void {
    this.configLoading.set(true);
    this.leaveApi.listConfig().subscribe({
      next: (rows) => {
        this.configLoading.set(false);
        this.config.set(rows);
        const draft: Record<string, { monthlyAllocation: number; carryForwardCap: number }> = {};
        for (const role of LEAVE_ROLES) {
          for (const leaveType of LEAVE_TYPES) {
            const row = rows.find((r) => r.role === role && r.leaveType === leaveType);
            draft[this.configKey(role, leaveType)] = {
              monthlyAllocation: row ? Number(row.monthlyAllocation) : 0,
              carryForwardCap: row ? Number(row.carryForwardCap) : 0,
            };
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

  openDecision(request: LeaveRequest, approve: boolean): void {
    this.decisionTarget.set(request);
    this.decisionApprove.set(approve);
    this.decisionNote.set('');
    this.decisionDialogVisible.set(true);
  }

  closeDecision(): void {
    this.decisionDialogVisible.set(false);
  }

  confirmDecision(): void {
    const target = this.decisionTarget();
    if (!target) return;
    this.deciding.set(true);
    const call = this.decisionApprove()
      ? this.leaveApi.approve(target.id, this.decisionNote() || undefined)
      : this.leaveApi.reject(target.id, this.decisionNote() || undefined);
    call.subscribe({
      next: () => {
        this.deciding.set(false);
        this.decisionDialogVisible.set(false);
        this.toast.success(this.i18n.t(this.decisionApprove() ? 'leaveManagement.approvedSuccess' : 'leaveManagement.rejectedSuccess'));
        this.loadRequests();
      },
      error: (err) => {
        this.deciding.set(false);
        this.toast.error(err?.error?.message ?? this.i18n.t('leaveManagement.decisionError'));
      },
    });
  }

  statusSeverity(status: LeaveStatus): 'success' | 'danger' | 'warn' | 'secondary' {
    if (status === 'APPROVED') return 'success';
    if (status === 'REJECTED') return 'danger';
    if (status === 'CANCELLED') return 'secondary';
    return 'warn';
  }

  leaveTypeLabel(type: LeaveType): string {
    return this.i18n.t(`leaveManagement.type.${type}`);
  }
}
