import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';

import { Alert, AlertPayload, AlertsApiService, AssignableTargets } from '../../../../core/alerts/alerts-api.service';
import { SearchInputComponent } from '../../../shared/components/search-input/search-input.component';
import { ConfirmService } from '../../../../core/confirm/confirm.service';
import { ToastService } from '../../../../core/toast/toast.service';
import { AlertFormModalComponent } from './components/alert-form-modal.component';
import { AlertTableComponent } from './components/alert-table.component';

/** Owner-only: configure login alerts — org-wide notices shown right after
 * login until dismissed ("don't show again") or their window passes. */
@Component({
  selector: 'app-v2-alerts-page',
  imports: [SearchInputComponent, NzButtonModule, NzIconModule, AlertFormModalComponent, AlertTableComponent],
  template: `
    <div class="flex flex-col flex-1 min-w-0 min-h-0 gap-3">
      <div class="shrink-0 bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs">
        <div class="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          <div class="sm:col-span-5 min-w-0">
            <app-search-input placeholder="Search alerts by title or message..." [(value)]="search"></app-search-input>
          </div>
          <div class="sm:col-span-7 flex items-center justify-start sm:justify-end gap-2 flex-wrap min-w-0">
            <p class="text-xs text-gray-500 dark:text-gray-400 m-0 hidden xl:block mr-2">Shown to users right after they sign in.</p>
            <button nz-button nzType="primary" (click)="openCreate()" class="!rounded-xl text-xs font-semibold !h-9 !bg-blue-700 hover:!bg-blue-800 !inline-flex !items-center gap-1.5 shadow-xs">
              <span nz-icon nzType="plus"></span><span>Add Alert</span>
            </button>
          </div>
        </div>
      </div>

      <app-alert-table
        [alerts]="filteredAlerts()"
        [loading]="loading()"
        (editAlert)="openEdit($event)"
        (deleteAlert)="remove($event)"
      ></app-alert-table>

      @if (modalVisible()) {
        <app-alert-form-modal
          [alert]="editingAlert()"
          [targets]="targets()"
          [saving]="saving()"
          [serverError]="serverError()"
          (cancel)="modalVisible.set(false)"
          (save)="onSave($event)"
        ></app-alert-form-modal>
      }
    </div>
  `,
  host: { class: 'flex flex-col flex-1 min-h-0 min-w-0 w-full max-w-full' },
})
export class V2AlertsPageComponent implements OnInit {
  private alertsApi = inject(AlertsApiService);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);

  readonly alerts = signal<Alert[]>([]);
  readonly targets = signal<AssignableTargets>({ branches: [], users: [] });
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly serverError = signal<string | null>(null);
  readonly modalVisible = signal(false);
  readonly editingAlert = signal<Alert | null>(null);
  readonly search = signal('');

  readonly filteredAlerts = computed(() => {
    const term = this.search().trim().toLowerCase();
    if (!term) return this.alerts();
    return this.alerts().filter((a) => a.title.toLowerCase().includes(term) || a.message.toLowerCase().includes(term));
  });

  ngOnInit(): void {
    this.load();
    this.alertsApi.assignableTargets().subscribe({ next: (t) => this.targets.set(t), error: () => undefined });
  }

  load(): void {
    this.loading.set(true);
    this.alertsApi.list().subscribe({
      next: (rows) => { this.loading.set(false); this.alerts.set(rows); },
      error: () => { this.loading.set(false); this.toast.error('Could not load alerts.'); },
    });
  }

  openCreate(): void {
    this.editingAlert.set(null);
    this.serverError.set(null);
    this.modalVisible.set(true);
  }

  openEdit(alert: Alert): void {
    this.editingAlert.set(alert);
    this.serverError.set(null);
    this.modalVisible.set(true);
  }

  onSave(payload: AlertPayload): void {
    const id = this.editingAlert()?.id;
    this.saving.set(true);
    this.serverError.set(null);
    const req = id ? this.alertsApi.update(id, payload) : this.alertsApi.create(payload);
    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.modalVisible.set(false);
        this.toast.success(id ? 'Alert updated.' : 'Alert created.');
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        const msg = err?.error?.message ?? 'Could not save alert.';
        this.serverError.set(Array.isArray(msg) ? msg.join(' ') : msg);
      },
    });
  }

  async remove(alert: Alert): Promise<void> {
    const ok = await this.confirm.confirm({
      header: 'Delete Alert',
      message: `Delete "${alert.title}"? Users will no longer see it.`,
      acceptLabel: 'Delete',
      severity: 'danger',
    });
    if (!ok) return;
    this.alertsApi.remove(alert.id).subscribe({
      next: () => { this.toast.success('Alert deleted.'); this.load(); },
      error: () => this.toast.error('Could not delete alert.'),
    });
  }
}
