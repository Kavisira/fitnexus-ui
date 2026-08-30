import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';

import { AlertsApiService, Alert } from '../../core/alerts/alerts-api.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

/**
 * Shown once per app session (mounted inside the authenticated Layout,
 * which itself only ever loads after a successful login). Fetches
 * every alert this user hasn't permanently dismissed and is still
 * inside its start/end window, then shows them one at a time —
 * closing one immediately reveals the next, if any.
 */
@Component({
  selector: 'app-login-alerts',
  standalone: true,
  imports: [CommonModule, FormsModule, DialogModule, ButtonModule, CheckboxModule, TranslatePipe],
  templateUrl: './login-alerts.html',
  styleUrls: ['./login-alerts.css'],
})
export class LoginAlerts implements OnInit {
  private alertsApi = inject(AlertsApiService);

  queue = signal<Alert[]>([]);
  dontShowAgain = signal(false);

  current = () => this.queue()[0] ?? null;

  ngOnInit(): void {
    this.alertsApi.pending().subscribe({
      next: (alerts) => this.queue.set(alerts),
      error: () => {},
    });
  }

  closeCurrent(): void {
    const alert = this.current();
    if (!alert) return;
    const shouldDismissPermanently = this.dontShowAgain();
    this.dontShowAgain.set(false);
    this.queue.update((q) => q.slice(1));
    if (shouldDismissPermanently) {
      this.alertsApi.dismiss(alert.id).subscribe({ error: () => {} });
    }
  }
}
