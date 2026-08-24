import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import {
  NotificationApiService,
  NotificationConfig,
  NotificationSeverity,
  NotificationType,
} from '../../../../core/notifications/notification-api.service';
import { ToastService } from '../../../../core/toast/toast.service';
import { TranslationService } from '../../../../core/i18n/translation.service';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';

type OffsetUnit = 'MINUTES' | 'HOURS' | 'DAYS';

const TYPE_LABEL_KEY: Record<NotificationType, string> = {
  LEAD_OVERDUE: 'notificationConfig.typeLeadOverdue',
  LEAD_ASSIGNED: 'notificationConfig.typeLeadAssigned',
  BIRTHDAY_EMPLOYEE: 'notificationConfig.typeBirthdayEmployee',
  BIRTHDAY_MEMBER: 'notificationConfig.typeBirthdayMember',
  MEMBERSHIP_EXPIRY: 'notificationConfig.typeMembershipExpiry',
};

// Not wired up yet — Employees/Members modules don't exist, so these
// have nothing to check. Shown in the list (per the earlier product
// decision) but visually marked "not available yet".
const NOT_READY_TYPES = new Set<NotificationType>(['BIRTHDAY_EMPLOYEE', 'BIRTHDAY_MEMBER', 'MEMBERSHIP_EXPIRY']);

@Component({
  selector: 'app-notification-configuration',
  standalone: true,
  imports: [FormsModule, ButtonModule, ToggleSwitchModule, SelectModule, InputNumberModule, CardModule, TagModule, TooltipModule, TranslatePipe],
  templateUrl: './notification-configuration.html',
  styleUrls: ['./notification-configuration.css'],
})
export class NotificationConfiguration implements OnInit {
  private api = inject(NotificationApiService);
  private toast = inject(ToastService);
  private i18n = inject(TranslationService);

  loading = signal(true);
  savingType = signal<NotificationType | null>(null);

  configs = signal<NotificationConfig[]>([]);

  severityOptions: { label: string; value: NotificationSeverity }[] = [
    { label: 'Info', value: 'INFO' },
    { label: 'Warning', value: 'WARNING' },
    { label: 'Urgent', value: 'URGENT' },
  ];

  unitOptions: { label: string; value: OffsetUnit }[] = [
    { label: 'Minutes', value: 'MINUTES' },
    { label: 'Hours', value: 'HOURS' },
    { label: 'Days', value: 'DAYS' },
  ];

  ngOnInit(): void {
    this.api.listConfigs().subscribe({
      next: (configs) => {
        this.configs.set(configs);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error(this.i18n.t('notificationConfig.loadError'));
      },
    });
  }

  typeLabel(type: NotificationType): string {
    return this.i18n.t(TYPE_LABEL_KEY[type]);
  }

  isNotReady(type: NotificationType): boolean {
    return NOT_READY_TYPES.has(type);
  }

  offsets(config: NotificationConfig): { value: number; unit: OffsetUnit }[] {
    return config.rule?.offsets ?? [];
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

  save(config: NotificationConfig): void {
    this.savingType.set(config.type);
    this.api
      .updateConfig(config.type, {
        enabled: config.enabled,
        severity: config.severity,
        inAppEnabled: config.inAppEnabled,
        rule: config.rule,
      })
      .subscribe({
        next: () => {
          this.savingType.set(null);
          this.toast.success(this.i18n.t('notificationConfig.savedSuccess'));
        },
        error: () => {
          this.savingType.set(null);
          this.toast.error(this.i18n.t('notificationConfig.saveError'));
        },
      });
  }
}
