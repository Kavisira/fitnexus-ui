import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { CheckboxModule } from 'primeng/checkbox';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';

import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { TranslationService } from '../../../core/i18n/translation.service';
import { ToastService } from '../../../core/toast/toast.service';
import { AlertsApiService, Alert, AlertAudienceType, AssignableTargets } from '../../../core/alerts/alerts-api.service';

/** Owner-only screen for configuring login alerts — org-wide notices
 * shown right after login until a user permanently dismisses one
 * ("don't show again") or its validity window (startDate, optional
 * endDate) passes. */
@Component({
  selector: 'app-alerts',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, TagModule, DialogModule, InputTextModule, TextareaModule, CheckboxModule, DatePickerModule, SelectModule, TranslatePipe],
  templateUrl: './alerts.html',
  styleUrls: ['./alerts.css'],
})
export class Alerts implements OnInit {
  private alertsApi = inject(AlertsApiService);
  private toast = inject(ToastService);
  private i18n = inject(TranslationService);

  loading = signal(true);
  alerts = signal<Alert[]>([]);

  dialogVisible = signal(false);
  editingId = signal<string | null>(null);
  formTitle = signal('');
  formMessage = signal('');
  formStartDate = signal<Date | null>(null);
  formEndDate = signal<Date | null>(null);
  formIsActive = signal(true);
  saving = signal(false);

  formAudienceType = signal<AlertAudienceType>('ALL');
  formAudienceBranchId = signal<string | null>(null);
  formAudienceUserId = signal<string | null>(null);
  assignableTargets = signal<AssignableTargets>({ branches: [], users: [] });

  audienceOptions: { label: string; value: AlertAudienceType }[] = [
    { label: 'Everyone in the organization', value: 'ALL' },
    { label: 'One branch', value: 'BRANCH' },
    { label: 'One specific user', value: 'USER' },
  ];

  ngOnInit(): void {
    this.load();
    this.alertsApi.assignableTargets().subscribe({ next: (t) => this.assignableTargets.set(t), error: () => {} });
  }

  load(): void {
    this.loading.set(true);
    this.alertsApi.list().subscribe({
      next: (rows) => {
        this.loading.set(false);
        this.alerts.set(rows);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error(this.i18n.t('alerts.loadError'));
      },
    });
  }

  openCreate(): void {
    this.editingId.set(null);
    this.formTitle.set('');
    this.formMessage.set('');
    this.formStartDate.set(new Date());
    this.formEndDate.set(null);
    this.formIsActive.set(true);
    this.formAudienceType.set('ALL');
    this.formAudienceBranchId.set(null);
    this.formAudienceUserId.set(null);
    this.dialogVisible.set(true);
  }

  openEdit(alert: Alert): void {
    this.editingId.set(alert.id);
    this.formTitle.set(alert.title);
    this.formMessage.set(alert.message);
    this.formStartDate.set(new Date(alert.startDate));
    this.formEndDate.set(alert.endDate ? new Date(alert.endDate) : null);
    this.formIsActive.set(alert.isActive);
    this.formAudienceType.set(alert.audienceType);
    this.formAudienceBranchId.set(alert.audienceBranchId);
    this.formAudienceUserId.set(alert.audienceUserId);
    this.dialogVisible.set(true);
  }

  closeDialog(): void {
    this.dialogVisible.set(false);
  }

  save(): void {
    const title = this.formTitle().trim();
    const message = this.formMessage().trim();
    const startDate = this.formStartDate();
    if (!title || !message || !startDate) {
      this.toast.error(this.i18n.t('alerts.validationError'));
      return;
    }
    const endDate = this.formEndDate();
    if (endDate && endDate < startDate) {
      this.toast.error(this.i18n.t('alerts.endBeforeStartError'));
      return;
    }

    const audienceType = this.formAudienceType();
    if (audienceType === 'BRANCH' && !this.formAudienceBranchId()) {
      this.toast.error(this.i18n.t('alerts.branchRequiredError'));
      return;
    }
    if (audienceType === 'USER' && !this.formAudienceUserId()) {
      this.toast.error(this.i18n.t('alerts.userRequiredError'));
      return;
    }

    const payload = {
      title,
      message,
      startDate: startDate.toISOString(),
      endDate: endDate ? endDate.toISOString() : null,
      isActive: this.formIsActive(),
      audienceType,
      audienceBranchId: audienceType === 'BRANCH' ? this.formAudienceBranchId() : null,
      audienceUserId: audienceType === 'USER' ? this.formAudienceUserId() : null,
    };

    this.saving.set(true);
    const id = this.editingId();
    const call = id ? this.alertsApi.update(id, payload) : this.alertsApi.create(payload);
    call.subscribe({
      next: () => {
        this.saving.set(false);
        this.dialogVisible.set(false);
        this.toast.success(this.i18n.t(id ? 'alerts.updateSuccess' : 'alerts.createSuccess'));
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error(err?.error?.message ?? this.i18n.t('alerts.saveError'));
      },
    });
  }

  remove(alert: Alert): void {
    this.alertsApi.remove(alert.id).subscribe({
      next: () => {
        this.toast.success(this.i18n.t('alerts.removeSuccess'));
        this.load();
      },
      error: () => this.toast.error(this.i18n.t('alerts.removeError')),
    });
  }

  windowLabel(alert: Alert): string {
    const start = new Date(alert.startDate).toLocaleDateString();
    if (!alert.endDate) return `${start} → ${this.i18n.t('alerts.noEndDate')}`;
    return `${start} → ${new Date(alert.endDate).toLocaleDateString()}`;
  }

  audienceLabel(alert: Alert): string {
    if (alert.audienceType === 'BRANCH') return alert.audienceBranch?.location ?? this.i18n.t('alerts.audience.BRANCH');
    if (alert.audienceType === 'USER') return alert.audienceUser?.name ?? this.i18n.t('alerts.audience.USER');
    return this.i18n.t('alerts.audience.ALL');
  }
}
