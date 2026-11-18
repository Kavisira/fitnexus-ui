import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSwitchModule } from 'ng-zorro-antd/switch';

import { Alert, AlertsApiService } from '../../../../core/alerts/alerts-api.service';

/**
 * Login announcements — v2 replacement for the v1 one-dialog-per-alert flow.
 * Mounted once in the authenticated v2 layout, so it shows once per app
 * session after login. Every pending alert (not permanently dismissed, still
 * inside its window) is listed in ONE modal; each has a "Don't show again"
 * switch, and the choices are saved when the modal is closed.
 */
@Component({
  selector: 'app-login-alerts-modal',
  imports: [DatePipe, FormsModule, NzButtonModule, NzIconModule, NzModalModule, NzSwitchModule],
  template: `
    @if (visible()) {
      <nz-modal
        [nzVisible]="true"
        [nzTitle]="titleTpl"
        [nzFooter]="footerTpl"
        [nzWidth]="560"
        [nzMaskClosable]="false"
        (nzOnCancel)="close()"
      >
        <ng-template #titleTpl>
          <span class="inline-flex items-center gap-2">
            <span nz-icon nzType="notification" class="text-blue-600 dark:text-blue-400"></span>
            Announcements
            <span class="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">{{ alerts().length }}</span>
          </span>
        </ng-template>

        <div *nzModalContent class="space-y-3">
          @if (alerts().length > 1) {
            <label class="flex items-center justify-between gap-3 px-1 pb-2 border-b border-gray-100 dark:border-gray-800 cursor-pointer">
              <span class="text-xs font-semibold text-gray-600 dark:text-gray-300">Don't show any of these again</span>
              <nz-switch nzSize="small" [ngModel]="allMuted()" (ngModelChange)="setAll($event)"></nz-switch>
            </label>
          }

          <div class="max-h-[55vh] overflow-y-auto space-y-3 pr-1">
            @for (a of alerts(); track a.id) {
              <article class="rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/40 p-4 transition-opacity" [class.opacity-60]="muted().has(a.id)">
                <h3 class="text-sm font-bold text-gray-900 dark:text-white m-0">{{ a.title }}</h3>
                <p class="text-sm leading-relaxed text-gray-700 dark:text-gray-300 mt-1.5 mb-3 whitespace-pre-line">{{ a.message }}</p>
                <div class="flex items-center justify-between gap-3 flex-wrap">
                  <span class="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                    <span nz-icon nzType="calendar"></span>
                    {{ a.startDate | date: 'mediumDate' }}@if (a.endDate) { – {{ a.endDate | date: 'mediumDate' }} }
                  </span>
                  <label class="inline-flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300 cursor-pointer">
                    Don't show again
                    <nz-switch nzSize="small" [ngModel]="muted().has(a.id)" (ngModelChange)="toggle(a.id, $event)"></nz-switch>
                  </label>
                </div>
              </article>
            }
          </div>
        </div>

        <ng-template #footerTpl>
          <div class="flex items-center justify-between gap-3">
            <span class="text-xs text-gray-500 dark:text-gray-400">
              @if (muted().size) { {{ muted().size }} will be hidden from now on }
            </span>
            <button nz-button nzType="primary" [nzLoading]="saving()" (click)="close()" class="!rounded-xl !bg-blue-600 hover:!bg-blue-500">Got it</button>
          </div>
        </ng-template>
      </nz-modal>
    }
  `,
})
export class LoginAlertsModalComponent implements OnInit {
  private alertsApi = inject(AlertsApiService);

  readonly alerts = signal<Alert[]>([]);
  readonly muted = signal<Set<string>>(new Set());
  readonly saving = signal(false);
  readonly visible = signal(false);

  readonly allMuted = computed(() => this.alerts().length > 0 && this.muted().size === this.alerts().length);

  ngOnInit(): void {
    this.alertsApi.pending().subscribe({
      next: (rows) => {
        if (!rows.length) return;
        this.alerts.set([...rows].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()));
        this.visible.set(true);
      },
      error: () => undefined,
    });
  }

  toggle(id: string, on: boolean): void {
    this.muted.update((s) => {
      const next = new Set(s);
      if (on) next.add(id); else next.delete(id);
      return next;
    });
  }

  setAll(on: boolean): void {
    this.muted.set(on ? new Set(this.alerts().map((a) => a.id)) : new Set());
  }

  /** Persist "don't show again" choices (if any), then hide for this session. */
  close(): void {
    if (this.saving()) return;
    const ids = [...this.muted()];
    if (!ids.length) { this.visible.set(false); return; }
    this.saving.set(true);
    forkJoin(ids.map((id) => this.alertsApi.dismiss(id))).subscribe({
      // Hide either way — a failed dismiss just means the alert shows again next login.
      next: () => { this.saving.set(false); this.visible.set(false); },
      error: () => { this.saving.set(false); this.visible.set(false); },
    });
  }
}
