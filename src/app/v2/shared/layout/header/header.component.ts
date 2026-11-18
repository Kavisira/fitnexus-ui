import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDropdownModule } from 'ng-zorro-antd/dropdown';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';

import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { TranslationService } from '../../../../core/i18n/translation.service';
import { PageHeaderService } from '../../../../shared/page-header/page-header.service';
import { SidebarStateService } from '../../../../shared/sidebar/sidebar-state.service';
import { TokenStorage } from '../../../../core/auth/token-storage.service';
import { AuthApiService } from '../../../../core/auth/auth-api.service';
import { PermissionsService } from '../../../../core/roles/permissions.service';
import { SubscriptionStatusService } from '../../../../core/auth/subscription-status.service';
import { ToastService } from '../../../../core/toast/toast.service';
import { ThemeToggleComponent } from '../../components/theme-toggle/theme-toggle.component';

import { SettingsDialog } from '../../../../shared/settings-dialog/settings-dialog';
import { VersionDialog } from '../../../../shared/version-dialog/version-dialog';
import { OrgInfoDialog } from '../../../../shared/org-info-dialog/org-info-dialog';
// v1 (PrimeNG) bell — kept until it gets an NG-ZORRO version.
import { NotificationBell } from '../../../../shared/notification-bell/notification-bell';
import { NotificationStore } from '../../../../core/notifications/notification-store.service';

@Component({
  selector: 'app-v2-header',
  imports: [
    NzButtonModule,
    NzDropdownModule,
    NzIconModule,
    NzAvatarModule,
    NzTooltipModule,
    TranslatePipe,
    ThemeToggleComponent,
    SettingsDialog,
    VersionDialog,
    OrgInfoDialog,
    NotificationBell,
  ],
  template: `
    <header class="flex items-center justify-between h-14 px-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 z-10 shrink-0">
      <div class="flex items-center gap-3">
        <button
          nz-button
          nz-tooltip
          nzType="text"
          nzShape="circle"
          class="!flex items-center justify-center text-gray-600 dark:!text-gray-100 hover:text-blue-600 dark:hover:!text-blue-400"
          [nzTooltipTitle]="(sidebarState.collapsed() ? 'common.expandNav' : 'common.collapseNav') | translate"
          nzTooltipPlacement="bottom"
          (click)="sidebarState.toggleForViewport()"
          aria-label="Toggle navigation"
        >
          <span nz-icon [nzType]="sidebarState.collapsed() ? 'menu-unfold' : 'menu-fold'" class="text-lg"></span>
        </button>

        @if (pageHeader.titleKey(); as key) {
          <h2 class="text-base font-semibold text-gray-800 dark:text-gray-100 m-0">
            {{ key | translate }}
          </h2>
        }
      </div>

      <div class="flex items-center gap-2">
        <button
          nz-button
          nz-tooltip
          nzType="text"
          nzShape="circle"
          class="!flex items-center justify-center text-gray-600 dark:!text-gray-100 hover:text-blue-600 dark:hover:!text-blue-400"
          [nzTooltipTitle]="'common.help' | translate"
          nzTooltipPlacement="bottom"
          (click)="openHelp()"
          aria-label="Help"
        >
          <span nz-icon nzType="question-circle" class="text-lg"></span>
        </button>

        @if (notificationStore.enabled()) {
          <app-notification-bell></app-notification-bell>
        }

        <app-theme-toggle></app-theme-toggle>

        <!-- Profile Avatar & Dropdown -->
        <button
          nz-dropdown
          [nzDropdownMenu]="profileMenu"
          nzTrigger="click"
          nzPlacement="bottomRight"
          class="flex items-center justify-center p-0 ml-1 rounded-full border-0 bg-transparent cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          aria-label="User Profile"
        >
          <nz-avatar
            [nzText]="userInitial"
            nzSize="default"
            class="!bg-blue-600 !text-white font-semibold cursor-pointer"
          ></nz-avatar>
        </button>

        <nz-dropdown-menu #profileMenu="nzDropdownMenu">
          <ul nz-menu class="min-w-44 py-1">
            <li nz-menu-item (click)="orgInfoVisible.set(true)" class="flex items-center gap-2 py-2">
              <span nz-icon nzType="user" class="text-base text-gray-500"></span>
              <span>{{ 'common.profile' | translate }}</span>
            </li>
            <li nz-menu-item (click)="settingsVisible.set(true)" class="flex items-center gap-2 py-2">
              <span nz-icon nzType="setting" class="text-base text-gray-500"></span>
              <span>{{ 'common.settings' | translate }}</span>
            </li>
            <li nz-menu-item (click)="versionVisible.set(true)" class="flex items-center gap-2 py-2">
              <span nz-icon nzType="info-circle" class="text-base text-gray-500"></span>
              <span>{{ 'common.deployedVersion' | translate }}</span>
            </li>
            <li nz-menu-divider></li>
            <li nz-menu-item (click)="logout()" class="flex items-center gap-2 py-2 !text-red-600 dark:!text-red-400">
              <span nz-icon nzType="logout" class="text-base"></span>
              <span>{{ 'common.logout' | translate }}</span>
            </li>
          </ul>
        </nz-dropdown-menu>
      </div>
    </header>

    <app-org-info-dialog [(visible)]="orgInfoVisible"></app-org-info-dialog>
    <app-settings-dialog [(visible)]="settingsVisible"></app-settings-dialog>
    <app-version-dialog [(visible)]="versionVisible"></app-version-dialog>
  `,
  host: {
    class: 'block w-full',
  },
})
export class V2HeaderComponent {
  private router = inject(Router);
  private tokenStorage = inject(TokenStorage);
  private authApi = inject(AuthApiService);
  private permissions = inject(PermissionsService);
  private subscriptionStatus = inject(SubscriptionStatusService);
  private toast = inject(ToastService);
  private i18n = inject(TranslationService);
  readonly pageHeader = inject(PageHeaderService);
  readonly sidebarState = inject(SidebarStateService);
  readonly notificationStore = inject(NotificationStore);

  readonly orgInfoVisible = signal(false);
  readonly settingsVisible = signal(false);
  readonly versionVisible = signal(false);

  get userInitial(): string {
    const email = this.tokenStorage.getEmail() ?? '';
    return (email || 'U').charAt(0).toUpperCase();
  }

  openHelp(): void {
    this.router.navigateByUrl('/help');
  }

  logout(): void {
    this.authApi.logout().subscribe({ next: () => {}, error: () => {} });
    this.tokenStorage.clear();
    this.permissions.clear();
    this.subscriptionStatus.clear();
    this.toast.success('You have been logged out.');
    this.router.navigateByUrl('/login');
  }
}
