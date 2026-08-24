import { Component, EventEmitter, inject, Input, Output, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { AvatarModule } from 'primeng/avatar';
import { MenuItem } from 'primeng/api';
import { Bars } from '@primeicons/angular/bars';

import { ThemeToggle } from '../theme-toggle/theme-toggle';
import { SettingsDialog } from '../settings-dialog/settings-dialog';
import { NotificationBell } from '../notification-bell/notification-bell';
import { TranslationService } from '../../core/i18n/translation.service';
import { TokenStorage } from '../../core/auth/token-storage.service';
import { ToastService } from '../../core/toast/toast.service';
import { NotificationStore } from '../../core/notifications/notification-store.service';
import { PermissionsService } from '../../core/roles/permissions.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [ButtonModule, MenuModule, AvatarModule, ThemeToggle, SettingsDialog, NotificationBell, Bars],
  templateUrl: './header.html',
  styleUrls: ['./header.css'],
})
export class Header {
  @Input() sidebarCollapsed = false;
  @Output() toggleSidebar = new EventEmitter<void>();

  private router = inject(Router);
  private i18n = inject(TranslationService);
  private tokenStorage = inject(TokenStorage);
  private toast = inject(ToastService);
  private permissions = inject(PermissionsService);
  notificationStore = inject(NotificationStore);

  settingsVisible = signal(false);

  // A getter (not a fixed array) so the labels are re-translated on every
  // change-detection pass — including right after the language changes.
  get profileMenuItems(): MenuItem[] {
    return [
      { label: this.i18n.t('common.profile'), icon: 'pi pi-user' },
      {
        label: this.i18n.t('common.settings'),
        icon: 'pi pi-cog',
        command: () => this.openSettings(),
      },
      { separator: true },
      {
        label: this.i18n.t('common.logout'),
        icon: 'pi pi-sign-out',
        command: () => this.logout(),
      },
    ];
  }

  onToggleSidebar(): void {
    this.toggleSidebar.emit();
  }

  openSettings(): void {
    this.settingsVisible.set(true);
  }

  private logout(): void {
    this.tokenStorage.clear();
    this.permissions.clear();
    this.toast.success('You have been logged out.');
    this.router.navigateByUrl('/login');
  }
}
