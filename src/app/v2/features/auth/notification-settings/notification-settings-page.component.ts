import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';

import {
  NotificationApiService,
  NotificationConfig,
  NotificationSeverity,
  NotificationType,
} from '../../../../core/notifications/notification-api.service';
import { NotificationStore } from '../../../../core/notifications/notification-store.service';
import { PermissionsService } from '../../../../core/roles/permissions.service';
import { ToastService } from '../../../../core/toast/toast.service';

type OffsetUnit = 'MINUTES' | 'HOURS' | 'DAYS';

const TYPE_LABEL: Record<NotificationType, string> = {
  LEAD_OVERDUE: 'Lead overdue',
  LEAD_ASSIGNED: 'Lead assigned',
  BIRTHDAY_EMPLOYEE: 'Employee birthday',
  BIRTHDAY_MEMBER: 'Member birthday',
  MEMBERSHIP_EXPIRY: 'Membership expiry',
  PT_EXPIRY: 'PT expiry',
};

const SEVERITY_OPTIONS: { label: string; value: NotificationSeverity }[] = [
  { label: 'Info', value: 'INFO' },
  { label: 'Warning', value: 'WARNING' },
  { label: 'Urgent', value: 'URGENT' },
];

const UNIT_OPTIONS: { label: string; value: OffsetUnit }[] = [
  { label: 'Minutes', value: 'MINUTES' },
  { label: 'Hours', value: 'HOURS' },
  { label: 'Days', value: 'DAYS' },
];

/**
 * Notifications → Setup + Configuration, merged into one page with two
 * tabs (v1 had these as two separately-bookmarkable routes; v2 collapses
 * that into local tab state like a plain settings screen, since neither
 * side is ever deep-linked to from elsewhere in the app).
 *
 * Setup is the org-wide master switch — turning `enabled` off hides the
 * header bell entirely, regardless of what any individual type below
 * says. Configuration is the per-type rules (severity, channels, how long
 * before the event to fire reminders).
 */
@Component({
  selector: 'app-v2-notification-settings-page',
  imports: [
    FormsModule,
    NzAlertModule,
    NzButtonModule,
    NzIconModule,
    NzInputNumberModule,
    NzSelectModule,
    NzSwitchModule,
    NzTabsModule,
    NzTooltipModule,
  ],
  template: `
    <div class="flex flex-col flex-1 min-w-0 space-y-4">
      @if (!canWrite()) {
        <nz-alert
          nzType="info"
          nzShowIcon
          nzMessage="Read-only access"
          nzDescription="You don't have permission to view or edit notification settings."
        ></nz-alert>
      } @else {
        <div class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs overflow-hidden">
          <nz-tabs [nzTabBarStyle]="{ margin: '0', padding: '0 24px' }">
            <nz-tab nzTitle="Setup">
              <div class="px-6 pt-4 pb-5">
                @if (setupLoading()) {
                  <p class="text-sm text-gray-500 dark:text-gray-400 py-4">Loading...</p>
                } @else {
                  <div class="max-w-xl space-y-4">
                    <div class="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 shadow-xs p-3.5 space-y-2.5">
                      <div class="flex items-center justify-between gap-3">
                        <div class="flex flex-col gap-0.5 min-w-0">
                          <span class="text-sm font-semibold text-gray-900 dark:text-white">Notifications enabled</span>
                          <span class="text-xs text-gray-500 dark:text-gray-400">
                            Turns the bell icon and all notifications off for the whole organization when disabled.
                          </span>
                        </div>
                        <nz-switch [(ngModel)]="enabled" class="shrink-0"></nz-switch>
                      </div>

                      <div class="h-px bg-gray-100 dark:bg-gray-800"></div>

                      <div class="flex items-center justify-between gap-3">
                        <div class="flex flex-col gap-0.5 min-w-0">
                          <span class="text-sm font-semibold text-gray-900 dark:text-white">Auto-clean old notifications</span>
                          <span class="text-xs text-gray-500 dark:text-gray-400">Automatically remove read notifications after a set number of days.</span>
                        </div>
                        <nz-switch [(ngModel)]="autoCleanEnabled" class="shrink-0"></nz-switch>
                      </div>

                      @if (autoCleanEnabled()) {
                        <div class="flex items-center justify-between gap-3 pl-1">
                          <span class="text-xs font-semibold text-gray-600 dark:text-gray-300">Clean up after</span>
                          <nz-input-number [(ngModel)]="autoCleanDays" [nzMin]="1" [nzMax]="365" nzPlaceHolder="30" class="!w-28 !rounded-lg"></nz-input-number>
                        </div>
                      }

                      <div class="h-px bg-gray-100 dark:bg-gray-800"></div>

                      <div class="flex items-center justify-between gap-3">
                        <div class="flex flex-col gap-0.5 min-w-0">
                          <span class="text-sm font-semibold text-gray-900 dark:text-white">Notification sound</span>
                          <span class="text-xs text-gray-500 dark:text-gray-400">Play a sound when a new notification arrives.</span>
                        </div>
                        <nz-switch [(ngModel)]="soundEnabled" class="shrink-0"></nz-switch>
                      </div>
                    </div>

                    <div class="flex justify-end">
                      <button
                        nz-button nzType="primary" type="button"
                        [nzLoading]="savingSetup()"
                        (click)="saveSetup()"
                        class="!h-9 !rounded-lg !px-4 !bg-blue-700 hover:!bg-blue-800"
                      >
                        Save changes
                      </button>
                    </div>
                  </div>
                }
              </div>
            </nz-tab>

            <nz-tab nzTitle="Configuration">
              <div class="px-6 pt-4 pb-5">
                @if (configLoading()) {
                  <p class="text-sm text-gray-500 dark:text-gray-400 py-4">Loading...</p>
                } @else {
                  <div class="space-y-2.5">
                    @for (config of configs(); track config.type) {
                      <div class="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 shadow-xs p-3.5 space-y-2.5">
                        <div class="flex items-center justify-between gap-3">
                          <span class="text-sm font-bold text-gray-900 dark:text-white">{{ typeLabel(config.type) }}</span>
                          <nz-switch [ngModel]="config.enabled" (ngModelChange)="setEnabled(config, $event)"></nz-switch>
                        </div>

                        @if (config.enabled) {
                          <div class="space-y-2.5 pt-0.5">
                            <div class="flex flex-wrap items-center gap-x-6 gap-y-2">
                              <div class="flex items-center gap-2">
                                <label class="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Severity</label>
                                <nz-select
                                  [ngModel]="config.severity"
                                  (ngModelChange)="setSeverity(config, $event)"
                                  class="!w-36"
                                >
                                  @for (opt of severityOptions; track opt.value) {
                                    <nz-option [nzValue]="opt.value" [nzLabel]="opt.label"></nz-option>
                                  }
                                </nz-select>
                              </div>

                              <div class="flex items-center gap-2">
                                <label class="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Channels</label>
                                <div class="flex flex-wrap items-center gap-3">
                                  <label class="inline-flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                                    <nz-switch nzSize="small" [ngModel]="config.inAppEnabled" (ngModelChange)="setInAppEnabled(config, $event)"></nz-switch>
                                    In app
                                  </label>
                                  <label class="inline-flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                                    <nz-switch nzSize="small" [ngModel]="config.emailEnabled" (ngModelChange)="setEmailEnabled(config, $event)"></nz-switch>
                                    Email
                                  </label>
                                  <label class="inline-flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                                    <nz-switch nzSize="small" [ngModel]="config.whatsappEnabled" (ngModelChange)="setWhatsappEnabled(config, $event)"></nz-switch>
                                    WhatsApp
                                  </label>
                                </div>
                              </div>
                            </div>

                            <div class="flex items-start gap-2">
                              <label class="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 shrink-0 pt-1.5 inline-flex items-center gap-1">
                                Remind
                                <span
                                  nz-icon nzType="info-circle"
                                  class="!text-xs text-gray-400 dark:text-gray-500 cursor-help normal-case font-normal"
                                  nz-tooltip
                                  nzTooltipTitle="How long before the event this notification should fire. Add as many lead times as you need."
                                ></span>
                              </label>
                              <div class="flex flex-col gap-1.5 flex-1 min-w-0">
                                @if (offsets(config).length === 0) {
                                  <p class="text-xs italic text-gray-500 dark:text-gray-400 m-0">No reminders — fires only at the exact moment.</p>
                                }
                                @for (offset of offsets(config); track $index) {
                                  <div class="flex items-center gap-2">
                                    <nz-input-number
                                      [ngModel]="offset.value"
                                      (ngModelChange)="updateOffsetValue(config, $index, $event)"
                                      [nzMin]="0"
                                      class="!w-20"
                                    ></nz-input-number>
                                    <nz-select
                                      [ngModel]="offset.unit"
                                      (ngModelChange)="updateOffsetUnit(config, $index, $event)"
                                      class="!w-32"
                                    >
                                      @for (opt of unitOptions; track opt.value) {
                                        <nz-option [nzValue]="opt.value" [nzLabel]="opt.label"></nz-option>
                                      }
                                    </nz-select>
                                    <span class="text-xs text-gray-500 dark:text-gray-400">before event</span>
                                    <button
                                      nz-button nzType="text" nzDanger type="button"
                                      (click)="removeOffset(config, $index)"
                                      class="!h-8 !w-8 !px-0"
                                    >
                                      <span nz-icon nzType="delete"></span>
                                    </button>
                                  </div>
                                }
                                <button
                                  nz-button nzType="text" type="button"
                                  (click)="addOffset(config)"
                                  class="!h-8 self-start !px-1 text-blue-600 dark:text-blue-400"
                                >
                                  <span nz-icon nzType="plus"></span>
                                  Add reminder
                                </button>
                              </div>
                            </div>
                          </div>
                        }

                      </div>
                    }
                  </div>

                  <div class="flex items-center justify-end gap-2 pt-1">
                    @if (isConfigDirty()) {
                      <span class="text-xs text-gray-500 dark:text-gray-400">Unsaved changes</span>
                    }
                    <button
                      nz-button nzType="default" type="button"
                      [disabled]="!isConfigDirty() || savingConfigs()"
                      (click)="discardConfigChanges()"
                      class="!h-9 !rounded-lg !px-3"
                    >
                      Discard
                    </button>
                    <button
                      nz-button nzType="primary" type="button"
                      [disabled]="!isConfigDirty() || savingConfigs()"
                      [nzLoading]="savingConfigs()"
                      (click)="saveAllConfigs()"
                      class="!h-9 !rounded-lg !px-4 !bg-blue-700 hover:!bg-blue-800"
                    >
                      Save changes
                    </button>
                  </div>
                }
              </div>
            </nz-tab>
          </nz-tabs>
        </div>
      }
    </div>
  `,
  host: { class: 'flex flex-col flex-1 min-h-0 min-w-0 w-full max-w-full' },
})
export class V2NotificationSettingsPageComponent implements OnInit {
  private api = inject(NotificationApiService);
  private store = inject(NotificationStore);
  private permissions = inject(PermissionsService);
  private toast = inject(ToastService);

  readonly canWrite = computed(() => this.permissions.canWrite('NOTIFICATIONS'));

  readonly severityOptions = SEVERITY_OPTIONS;
  readonly unitOptions = UNIT_OPTIONS;

  // ---- Setup ----
  readonly setupLoading = signal(true);
  readonly savingSetup = signal(false);

  readonly enabled = signal(true);
  readonly autoCleanEnabled = signal(false);
  readonly autoCleanDays = signal<number>(30);
  readonly soundEnabled = signal(true);

  // ---- Configuration ----
  readonly configLoading = signal(true);
  readonly savingConfigs = signal(false);
  readonly configs = signal<NotificationConfig[]>([]);
  private configsSnapshot = signal<NotificationConfig[]>([]);

  readonly isConfigDirty = computed(() => JSON.stringify(this.configs()) !== JSON.stringify(this.configsSnapshot()));

  ngOnInit(): void {
    this.loadSetup();
    this.loadConfigs();
  }

  private loadSetup(): void {
    this.setupLoading.set(true);
    this.api.getSetup().subscribe({
      next: (setup) => {
        this.enabled.set(setup.enabled);
        this.autoCleanEnabled.set(setup.autoCleanDays !== null);
        this.autoCleanDays.set(setup.autoCleanDays ?? 30);
        this.soundEnabled.set(setup.soundEnabled);
        this.setupLoading.set(false);
      },
      error: () => {
        this.setupLoading.set(false);
        this.toast.error('Could not load notification setup.');
      },
    });
  }

  saveSetup(): void {
    this.savingSetup.set(true);
    this.api
      .updateSetup({
        enabled: this.enabled(),
        autoCleanDays: this.autoCleanEnabled() ? this.autoCleanDays() : null,
        soundEnabled: this.soundEnabled(),
      })
      .subscribe({
        next: (updated) => {
          this.savingSetup.set(false);
          // Keeps the header bell's visibility in sync immediately,
          // without requiring a full page reload.
          this.store.enabled.set(updated.enabled);
          this.toast.success('Notification setup saved.');
        },
        error: () => {
          this.savingSetup.set(false);
          this.toast.error('Could not save notification setup.');
        },
      });
  }

  private loadConfigs(): void {
    this.configLoading.set(true);
    this.api.listConfigs().subscribe({
      next: (configs) => {
        this.configs.set(configs);
        this.configsSnapshot.set(structuredClone(configs));
        this.configLoading.set(false);
      },
      error: () => {
        this.configLoading.set(false);
        this.toast.error('Could not load notification configuration.');
      },
    });
  }

  discardConfigChanges(): void {
    this.configs.set(structuredClone(this.configsSnapshot()));
  }

  typeLabel(type: NotificationType): string {
    return TYPE_LABEL[type];
  }

  offsets(config: NotificationConfig): { value: number; unit: OffsetUnit }[] {
    return (config.rule?.offsets as { value: number; unit: OffsetUnit }[] | undefined) ?? [];
  }

  private patchConfig(type: NotificationType, changes: Partial<NotificationConfig>): void {
    this.configs.update((list) => list.map((c) => (c.type === type ? { ...c, ...changes } : c)));
  }

  setEnabled(config: NotificationConfig, value: boolean): void {
    this.patchConfig(config.type, { enabled: value });
  }

  setSeverity(config: NotificationConfig, value: NotificationSeverity): void {
    this.patchConfig(config.type, { severity: value });
  }

  setInAppEnabled(config: NotificationConfig, value: boolean): void {
    this.patchConfig(config.type, { inAppEnabled: value });
  }

  setEmailEnabled(config: NotificationConfig, value: boolean): void {
    this.patchConfig(config.type, { emailEnabled: value });
  }

  setWhatsappEnabled(config: NotificationConfig, value: boolean): void {
    this.patchConfig(config.type, { whatsappEnabled: value });
  }

  addOffset(config: NotificationConfig): void {
    const offsets = [...this.offsets(config), { value: 15, unit: 'MINUTES' as OffsetUnit }];
    this.patchConfig(config.type, { rule: { offsets } });
  }

  removeOffset(config: NotificationConfig, index: number): void {
    const offsets = this.offsets(config).filter((_, i) => i !== index);
    this.patchConfig(config.type, { rule: { offsets } });
  }

  updateOffsetValue(config: NotificationConfig, index: number, value: number): void {
    const offsets = this.offsets(config).map((o, i) => (i === index ? { ...o, value } : o));
    this.patchConfig(config.type, { rule: { offsets } });
  }

  updateOffsetUnit(config: NotificationConfig, index: number, unit: OffsetUnit): void {
    const offsets = this.offsets(config).map((o, i) => (i === index ? { ...o, unit } : o));
    this.patchConfig(config.type, { rule: { offsets } });
  }

  saveAllConfigs(): void {
    const current = this.configs();
    const snapshot = this.configsSnapshot();
    const changed = current.filter((c, i) => JSON.stringify(c) !== JSON.stringify(snapshot[i]));
    if (!changed.length) return;

    this.savingConfigs.set(true);
    const calls = changed.map((config) =>
      this.api
        .updateConfig(config.type, {
          enabled: config.enabled,
          severity: config.severity,
          inAppEnabled: config.inAppEnabled,
          emailEnabled: config.emailEnabled,
          whatsappEnabled: config.whatsappEnabled,
          rule: config.rule,
        })
        .pipe(catchError((err) => of({ error: err }))),
    );

    forkJoin(calls).subscribe((results) => {
      this.savingConfigs.set(false);
      const failed = results.find((r): r is { error: unknown } => !!r && typeof r === 'object' && 'error' in r);
      if (failed) {
        this.toast.error('Could not save one or more notification types. Please try again.');
      } else {
        this.toast.success('Notification configuration saved.');
      }
      this.loadConfigs();
    });
  }
}
