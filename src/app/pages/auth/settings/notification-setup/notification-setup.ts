import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { InputNumberModule } from 'primeng/inputnumber';
import { CardModule } from 'primeng/card';

import { NotificationApiService } from '../../../../core/notifications/notification-api.service';
import { NotificationStore } from '../../../../core/notifications/notification-store.service';
import { ToastService } from '../../../../core/toast/toast.service';
import { TranslationService } from '../../../../core/i18n/translation.service';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { PermissionsService } from '../../../../core/roles/permissions.service';

/**
 * Settings → Notification Setup — the org-wide master switch, separate
 * from the per-type Configuration screen. Toggling `enabled` off here
 * hides the bell icon from the header entirely (not just an empty
 * dropdown), regardless of what any individual type's config says.
 */
@Component({
  selector: 'app-notification-setup',
  standalone: true,
  imports: [FormsModule, ButtonModule, ToggleSwitchModule, InputNumberModule, CardModule, TranslatePipe],
  templateUrl: './notification-setup.html',
  styleUrls: ['./notification-setup.css'],
})
export class NotificationSetup implements OnInit {
  private api = inject(NotificationApiService);
  private store = inject(NotificationStore);
  private toast = inject(ToastService);
  private i18n = inject(TranslationService);
  private permissions = inject(PermissionsService);

  readonly canWrite = this.permissions.canWrite('NOTIFICATIONS');

  loading = signal(true);
  saving = signal(false);

  enabled = signal(true);
  autoCleanEnabled = signal(false);
  autoCleanDays = signal<number>(30);
  soundEnabled = signal(true);

  ngOnInit(): void {
    this.api.getSetup().subscribe({
      next: (setup) => {
        this.enabled.set(setup.enabled);
        this.autoCleanEnabled.set(setup.autoCleanDays !== null);
        this.autoCleanDays.set(setup.autoCleanDays ?? 30);
        this.soundEnabled.set(setup.soundEnabled);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error(this.i18n.t('notificationSetup.loadError'));
      },
    });
  }

  save(): void {
    this.saving.set(true);
    this.api
      .updateSetup({
        enabled: this.enabled(),
        autoCleanDays: this.autoCleanEnabled() ? this.autoCleanDays() : null,
        soundEnabled: this.soundEnabled(),
      })
      .subscribe({
        next: (updated) => {
          this.saving.set(false);
          // Keeps the header bell's visibility in sync immediately,
          // without requiring a full page reload.
          this.store.enabled.set(updated.enabled);
          this.toast.success(this.i18n.t('notificationSetup.savedSuccess'));
        },
        error: () => {
          this.saving.set(false);
          this.toast.error(this.i18n.t('notificationSetup.saveError'));
        },
      });
  }
}
