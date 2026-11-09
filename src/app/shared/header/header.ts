import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { AvatarModule } from 'primeng/avatar';
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { PageHeaderService } from '../page-header/page-header.service';
import { ThemeToggle } from '../theme-toggle/theme-toggle';
import { NotificationBell } from '../notification-bell/notification-bell';
import { NotificationStore } from '../../core/notifications/notification-store.service';
import { SidebarStateService } from '../sidebar/sidebar-state.service';
import { TokenStorage } from '../../core/auth/token-storage.service';
import { AuthApiService } from '../../core/auth/auth-api.service';
import { PermissionsService } from '../../core/roles/permissions.service';
import { SubscriptionStatusService } from '../../core/auth/subscription-status.service';
import { ToastService } from '../../core/toast/toast.service';
import { TranslationService } from '../../core/i18n/translation.service';
import { SettingsDialog } from '../settings-dialog/settings-dialog';
import { VersionDialog } from '../version-dialog/version-dialog';
import { OrgInfoDialog } from '../org-info-dialog/org-info-dialog';

/**
 * Slim content-area top bar: a single nav-toggle button on the left
 * (collapses/expands the sidebar on desktop, opens it as a drawer on
 * mobile — see SidebarStateService), the current page's title
 * centered, and help / notifications / theme toggle / the user's own
 * profile avatar on the right — always on this side of the bar, never
 * in the sidebar (see shared/sidebar, which dropped its old footer
 * menu entirely).
 *
 * Clicking the avatar opens a 4-item popup menu — Profile, Settings,
 * Deployed version, Logout — each picking a different detail view
 * rather than the avatar itself jumping straight to one: Profile
 * opens OrgInfoDialog (the user's own identity + the organization's
 * full details), Settings/Deployed-version open their existing
 * dialogs, and Logout runs immediately (no dialog, same as the old
 * sidebar footer menu's behavior).
 */
@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    ButtonModule,
    TooltipModule,
    AvatarModule,
    MenuModule,
    ThemeToggle,
    NotificationBell,
    TranslatePipe,
    SettingsDialog,
    VersionDialog,
    OrgInfoDialog,
  ],
  templateUrl: './header.html',
  styleUrls: ['./header.css'],
})
export class Header {
  private router = inject(Router);
  private tokenStorage = inject(TokenStorage);
  private authApi = inject(AuthApiService);
  private permissions = inject(PermissionsService);
  private subscriptionStatus = inject(SubscriptionStatusService);
  private toast = inject(ToastService);
  private i18n = inject(TranslationService);
  pageHeader = inject(PageHeaderService);
  notificationStore = inject(NotificationStore);
  sidebarState = inject(SidebarStateService);

  orgInfoVisible = signal(false);
  settingsVisible = signal(false);
  versionVisible = signal(false);

  get userInitial(): string {
    const email = this.tokenStorage.getEmail() ?? '';
    return (email || 'U').charAt(0).toUpperCase();
  }

  // A getter (not a fixed array) so the labels re-translate on every
  // change-detection pass, same reasoning the old sidebar footer menu
  // used — including right after the language changes.
  get profileMenuItems(): MenuItem[] {
    return [
      {
        label: this.i18n.t('common.profile'),
        icon: 'pi pi-user',
        command: () => this.orgInfoVisible.set(true),
      },
      {
        label: this.i18n.t('common.settings'),
        icon: 'pi pi-cog',
        command: () => this.settingsVisible.set(true),
      },
      {
        label: this.i18n.t('common.deployedVersion'),
        icon: 'pi pi-info-circle',
        command: () => this.versionVisible.set(true),
      },
      { separator: true },
      {
        label: this.i18n.t('common.logout'),
        icon: 'pi pi-sign-out',
        command: () => this.logout(),
      },
    ];
  }

  openHelp(): void {
    this.router.navigateByUrl('/help');
  }

  private logout(): void {
    // Best effort — clears this login's server-side session marker so
    // the token can't be reused and a same-device re-login afterward
    // isn't mistaken for a "signed in elsewhere" kickout. The local
    // logout below happens either way, even if this call fails.
    this.authApi.logout().subscribe({ next: () => {}, error: () => {} });
    this.tokenStorage.clear();
    this.permissions.clear();
    this.subscriptionStatus.clear();
    this.toast.success('You have been logged out.');
    this.router.navigateByUrl('/login');
  }
}
