import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';

import { LeaveAllocationConfig, LeaveApiService, LeaveRole, LeaveType } from '../../../../core/leave/leave-api.service';
import { PermissionsService } from '../../../../core/roles/permissions.service';
import { ToastService } from '../../../../core/toast/toast.service';
import {
  AllocationDraftEntry,
  LEAVE_ROLES,
  LEAVE_TYPES,
  configKey,
  isCarryForwardType,
  buildConfigDraft,
  leaveTypeLabel,
  roleLabel,
  validateCarryForwardCap,
} from './services/leave-management.utils';

/**
 * Leave allocation setup — the admin CONFIGURATION side of the leave
 * system (how many days of Casual/Sick/Earned each staff role accrues per
 * month, plus a carry-forward cap for Earned). This is distinct from Todo,
 * which is the approve/reject queue for individual leave REQUESTS built on
 * the same LeaveApiService — this screen never touches a leave request.
 *
 * Casual and Sick are simple: one number — days credited per month —
 * because unused balance is forfeited every January 1st (backend yearly
 * expiry cron). Earned is different (accrues across years), so it alone
 * gets a second field for the maximum balance it can carry forward to.
 *
 * Edits are staged locally in a draft and only sent to the server on
 * "Save changes" (same pattern as the old UI / Roles & Permissions) —
 * saving cell-by-cell and reloading after every save would wipe out
 * whatever was typed into the OTHER cells in between.
 */
@Component({
  selector: 'app-v2-leave-management-page',
  imports: [FormsModule, NzAlertModule, NzButtonModule, NzIconModule, NzInputNumberModule, NzTooltipModule],
  template: `
    <div class="flex flex-col flex-1 min-w-0 space-y-4">
      @if (!canWrite()) {
        <nz-alert
          nzType="info"
          nzShowIcon
          nzMessage="Read-only access"
          nzDescription="You don't have permission to view or edit leave allocation."
        ></nz-alert>
      } @else {
        <div class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs overflow-hidden">
          <!-- Header -->
          <div class="flex items-center gap-3 px-6 pt-4 pb-3">
            <span class="flex items-center justify-center w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-900/30 shrink-0 leading-none">
              <span nz-icon nzType="calendar" class="!text-base !leading-none text-amber-600 dark:text-amber-300"></span>
            </span>
            <div class="flex flex-col justify-center min-w-0 flex-1">
              <h2 class="text-base font-bold m-0 leading-tight text-gray-900 dark:text-white">Monthly allocation</h2>
              <p class="text-xs m-0 leading-tight text-gray-500 dark:text-gray-400">
                Days credited automatically to every active employee of that role on the 1st of each month.
              </p>
            </div>
            @if (!configLoading()) {
              <div class="flex items-center gap-2 shrink-0">
                @if (isConfigDirty()) {
                  <span class="text-xs text-gray-500 dark:text-gray-400">Unsaved changes</span>
                }
                <button
                  nz-button nzType="default" type="button"
                  [disabled]="!isConfigDirty() || savingConfig()"
                  (click)="discardConfigChanges()"
                  class="!h-9 !rounded-lg !px-3"
                >
                  Discard
                </button>
                <button
                  nz-button nzType="primary" type="button"
                  [disabled]="!isConfigDirty() || savingConfig()"
                  [nzLoading]="savingConfig()"
                  (click)="saveAllConfig()"
                  class="!h-9 !rounded-lg !px-4 !bg-blue-700 hover:!bg-blue-800"
                >
                  Save changes
                </button>
              </div>
            }
          </div>

          <div class="px-6 pb-4">
            @if (configLoading()) {
              <p class="text-sm text-gray-500 dark:text-gray-400 py-4">Loading...</p>
            } @else {
              <div class="overflow-x-auto">
                <table class="w-full min-w-[42rem] border-collapse">
                  <thead>
                    <tr class="border-b border-gray-100 dark:border-gray-800">
                      <th class="text-left py-1.5 px-2 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Role</th>
                      @for (leaveType of leaveTypes; track leaveType) {
                        <th class="text-center py-1.5 px-2 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          <span class="inline-flex items-center gap-1">
                            {{ leaveTypeLabel(leaveType) }}
                            @if (isCarryForwardType(leaveType)) {
                              <span
                                nz-icon nzType="info-circle"
                                class="!text-xs text-gray-400 dark:text-gray-500 cursor-help normal-case font-normal"
                                nz-tooltip
                                [nzTooltipTitle]="earnedHint"
                              ></span>
                            }
                          </span>
                          @if (!isCarryForwardType(leaveType)) {
                            <span class="block mt-0.5 text-[0.65rem] font-medium normal-case tracking-normal text-gray-400 dark:text-gray-500">
                              Expires every year
                            </span>
                          }
                        </th>
                      }
                    </tr>
                  </thead>
                  <tbody>
                    @for (role of leaveRoles; track role) {
                      <tr class="border-b border-gray-50 dark:border-gray-800/60">
                        <td class="py-2 px-2 text-sm font-semibold text-gray-900 dark:text-white whitespace-nowrap">{{ roleLabel(role) }}</td>
                        @for (leaveType of leaveTypes; track leaveType) {
                          <td class="py-2 px-2 text-center">
                            <div class="flex flex-col items-center gap-1">
                              <nz-input-number
                                [ngModel]="configFor(role, leaveType).monthlyAllocation"
                                (ngModelChange)="updateMonthlyAllocation(role, leaveType, $event)"
                                [nzMin]="0"
                                [nzStep]="1"
                                [nzPrecision]="1"
                                nzPlaceHolder="0"
                                class="!w-24 !rounded-lg"
                              ></nz-input-number>
                              <span class="text-[0.65rem] text-gray-400 dark:text-gray-500">/ month</span>
                              @if (isCarryForwardType(leaveType)) {
                                <span class="text-[0.65rem] text-gray-400 dark:text-gray-500">
                                  {{ configFor(role, leaveType).monthlyAllocation * 12 }} / year
                                </span>
                                <label class="text-[0.65rem] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mt-0.5">
                                  Maximum balance
                                </label>
                                <nz-input-number
                                  [ngModel]="configFor(role, leaveType).carryForwardCap"
                                  (ngModelChange)="updateCarryForwardCap(role, leaveType, $event)"
                                  [nzMin]="configFor(role, leaveType).monthlyAllocation"
                                  [nzStep]="1"
                                  [nzPrecision]="1"
                                  nzPlaceHolder="0"
                                  class="!w-24 !rounded-lg opacity-85"
                                  nz-tooltip
                                  [nzTooltipTitle]="carryForwardCapTooltip"
                                ></nz-input-number>
                              }
                            </div>
                          </td>
                        }
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  host: { class: 'flex flex-col flex-1 min-h-0 min-w-0 w-full max-w-full' },
})
export class V2LeaveManagementPageComponent implements OnInit {
  private leaveApi = inject(LeaveApiService);
  private permissions = inject(PermissionsService);
  private toast = inject(ToastService);

  readonly canWrite = computed(() => this.permissions.canWrite('LEAVES'));

  readonly leaveTypes = LEAVE_TYPES;
  readonly leaveRoles = LEAVE_ROLES;

  readonly configLoading = signal(true);
  readonly configDraft = signal<Record<string, AllocationDraftEntry>>({});
  readonly configSavedSnapshot = signal<Record<string, AllocationDraftEntry>>({});
  readonly savingConfig = signal(false);

  readonly earnedHint =
    "Earned leave never expires — it carries forward every year, up to the maximum balance you set below. " +
    'Example: 2/month = 24/year. If the maximum is 30, year 1 ends at 24 (fully carried forward); year 2 keeps ' +
    "adding 2/month but stops growing once it reaches 30 — the rest isn't banked, even though 48 days were " +
    'nominally earned across the two years.';
  readonly carryForwardCapTooltip =
    'The most this balance can ever hold. Unused days keep carrying forward year after year, but once the ' +
    "balance reaches this number, further monthly credit isn't added on top — it's forfeited, not saved for later.";

  readonly isCarryForwardType = isCarryForwardType;
  readonly roleLabel = roleLabel;
  readonly leaveTypeLabel = leaveTypeLabel;

  configFor(role: LeaveRole, leaveType: LeaveType): AllocationDraftEntry {
    return this.configDraft()[configKey(role, leaveType)] ?? { monthlyAllocation: 0, carryForwardCap: 0 };
  }

  updateMonthlyAllocation(role: LeaveRole, leaveType: LeaveType, value: number | null): void {
    const key = configKey(role, leaveType);
    const monthlyAllocation = value ?? 0;
    this.configDraft.update((draft) => {
      const entry = this.configFor(role, leaveType);
      // Casual/Sick have no independent cap — keep it locked to the
      // monthly amount so there's nothing extra to remember to update.
      const carryForwardCap = isCarryForwardType(leaveType) ? Math.max(entry.carryForwardCap, monthlyAllocation) : monthlyAllocation;
      return { ...draft, [key]: { monthlyAllocation, carryForwardCap } };
    });
  }

  updateCarryForwardCap(role: LeaveRole, leaveType: LeaveType, value: number | null): void {
    const key = configKey(role, leaveType);
    this.configDraft.update((draft) => {
      const entry = this.configFor(role, leaveType);
      // Can't go below the monthly amount — the DTO rejects that combination server-side.
      const carryForwardCap = Math.max(value ?? 0, entry.monthlyAllocation);
      return { ...draft, [key]: { ...entry, carryForwardCap } };
    });
  }

  readonly isConfigDirty = computed(() => {
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

    // Soft client-side pre-check mirroring the backend's hard block, so a
    // bad combination (shouldn't be reachable via the UI, since the cap
    // input's own min is clamped to the monthly amount) still gets a clear
    // message instead of an unexplained 400.
    for (const [, value] of changedEntries) {
      const err = validateCarryForwardCap(value.monthlyAllocation, value.carryForwardCap);
      if (err) {
        this.toast.error(err);
        return;
      }
    }

    this.savingConfig.set(true);
    const calls = changedEntries.map(([key, value]) => {
      const [role, leaveType] = key.split(':') as [LeaveRole, LeaveType];
      return this.leaveApi
        .upsertConfig({ role, leaveType, monthlyAllocation: value.monthlyAllocation, carryForwardCap: value.carryForwardCap })
        .pipe(catchError((err) => of({ error: err })));
    });

    forkJoin(calls).subscribe((results) => {
      this.savingConfig.set(false);
      const failed = results.find((r): r is { error: unknown } => !!r && typeof r === 'object' && 'error' in r);
      if (failed) {
        const msg = (failed.error as any)?.error?.message ?? 'Could not save allocation. Please try again.';
        this.toast.error(Array.isArray(msg) ? msg.join(' ') : msg);
      } else {
        // upsertConfig credits every current employee of that role
        // immediately on the server (not just from next month), so the
        // success message reflects that rather than implying a delay.
        this.toast.success('Allocation saved — applied immediately to every current employee of that role.');
      }
      // Reload either way so the grid reflects exactly what the server has,
      // including any entries that did save even if one in the batch failed.
      this.loadConfig();
    });
  }

  ngOnInit(): void {
    this.loadConfig();
  }

  loadConfig(): void {
    this.configLoading.set(true);
    this.leaveApi.listConfig().subscribe({
      next: (rows: LeaveAllocationConfig[]) => {
        this.configLoading.set(false);
        const draft = buildConfigDraft(rows);
        this.configDraft.set(draft);
        this.configSavedSnapshot.set(structuredClone(draft));
      },
      error: () => {
        this.configLoading.set(false);
        this.toast.error('Could not load leave allocation.');
      },
    });
  }
}
