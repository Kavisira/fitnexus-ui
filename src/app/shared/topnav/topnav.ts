import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Home } from '@primeicons/angular/home';
import { Building } from '@primeicons/angular/building';
import { Users } from '@primeicons/angular/users';
import { IdCard } from '@primeicons/angular/id-card';
import { UserPlus } from '@primeicons/angular/user-plus';
import { CalendarClock } from '@primeicons/angular/calendar-clock';
import { Bell } from '@primeicons/angular/bell';
import { Shield } from '@primeicons/angular/shield';
import { Tags } from '@primeicons/angular/tags';
import { Percentage } from '@primeicons/angular/percentage';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { AvatarModule } from 'primeng/avatar';
import { MenuItem } from 'primeng/api';
import { TooltipModule } from 'primeng/tooltip';

import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { PermissionsService, PermissionScreen } from '../../core/roles/permissions.service';
import { TokenStorage } from '../../core/auth/token-storage.service';
import { ThemeToggle } from '../theme-toggle/theme-toggle';
import { SettingsDialog } from '../settings-dialog/settings-dialog';
import { VersionDialog } from '../version-dialog/version-dialog';
import { NotificationBell } from '../notification-bell/notification-bell';
import { TranslationService } from '../../core/i18n/translation.service';
import { ToastService } from '../../core/toast/toast.service';
import { NotificationStore } from '../../core/notifications/notification-store.service';

interface NavLeaf {
  labelKey: string;
  route: string;
  icon: string;
  // Every real screen declares which permission-matrix screen governs
  // it — the item only shows if the current user can read that screen.
  // Owner-only items (the matrix editor itself) set ownerOnly instead,
  // since they aren't part of the matrix they'd be governed by.
  screen?: PermissionScreen;
  ownerOnly?: boolean;
  // Reference/documentation items (e.g. Help) aren't part of the
  // permission matrix at all — every logged-in user sees them.
  alwaysVisible?: boolean;
  // My Workspace: the inverse of ownerOnly — visible to every
  // logged-in user EXCEPT the Owner, who has no Employee record and
  // so has nothing self-service to see there.
  hiddenForOwner?: boolean;
}

interface NavGroup {
  labelKey: string;
  icon: string;
  items: NavLeaf[];
}

/**
 * Horizontal top nav strip: sits directly under the app header, full
 * width. Grouped by category (People, Business, Workforce, Admin) so
 * the bar itself stays short and never needs to scroll — Dashboard is
 * the one standalone entry, everything else lives one level down inside
 * its group's dropdown, opened by hover (desktop) or click (touch/every
 * device — hover alone wouldn't work without it). Kept deliberately
 * short in height — see topnav.css — since this now costs vertical
 * space every page has, instead of horizontal space on the side.
 */
@Component({
  selector: 'app-topnav',
  standalone: true,
  imports: [
    RouterLink,
    RouterLinkActive,
    Home,
    Building,
    Users,
    IdCard,
    UserPlus,
    CalendarClock,
    Bell,
    Shield,
    Tags,
    Percentage,
    TranslatePipe,
    ButtonModule,
    MenuModule,
    AvatarModule,
    TooltipModule,
    ThemeToggle,
    SettingsDialog,
    VersionDialog,
    NotificationBell,
  ],
  templateUrl: './topnav.html',
  styleUrls: ['./topnav.css'],
})
export class Topnav {
  private permissions = inject(PermissionsService);
  private tokenStorage = inject(TokenStorage);
  private router = inject(Router);
  private i18n = inject(TranslationService);
  private toast = inject(ToastService);
  notificationStore = inject(NotificationStore);

  // Notification bell / theme toggle / profile menu live here (not in
  // the app header) so they sit on the right side of this same bar,
  // alongside the centered nav links, per the approved nav mockup.
  settingsVisible = signal(false);
  versionVisible = signal(false);

  get userEmail(): string {
    return this.tokenStorage.getEmail() ?? '';
  }

  get userInitial(): string {
    return (this.userEmail || 'U').charAt(0).toUpperCase();
  }

  private static readonly ROLE_LABELS: Record<string, string> = {
    OWNER: 'Owner',
    BRANCH_MANAGER: 'Branch Manager',
    TRAINER: 'Trainer',
    FRONT_DESK: 'Front Desk',
  };

  get userRoleLabel(): string {
    const role = this.tokenStorage.getRole();
    return role ? (Topnav.ROLE_LABELS[role] ?? role) : '';
  }

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
      {
        label: this.i18n.t('common.deployedVersion'),
        icon: 'pi pi-info-circle',
        command: () => this.openVersion(),
      },
      { separator: true },
      {
        label: this.i18n.t('common.logout'),
        icon: 'pi pi-sign-out',
        command: () => this.logout(),
      },
    ];
  }

  openSettings(): void {
    this.settingsVisible.set(true);
  }

  openVersion(): void {
    this.versionVisible.set(true);
  }

  openHelp(): void {
    this.router.navigateByUrl('/help');
  }

  private logout(): void {
    this.tokenStorage.clear();
    this.permissions.clear();
    this.toast.success('You have been logged out.');
    this.router.navigateByUrl('/login');
  }

  // Label (key) of whichever group's dropdown is currently open, or
  // null if none is. Only one can be open at a time.
  openGroup = signal<string | null>(null);

  readonly dashboard: NavLeaf = {
    labelKey: 'common.dashboard',
    route: '/dashboard',
    icon: 'home',
    screen: 'DASHBOARD',
  };

  // Last standalone nav item, same level as Dashboard — not tucked
  // inside a group dropdown, per the product decision that this
  // deserves its own always-visible entry.
  readonly myWorkspace: NavLeaf = {
    labelKey: 'common.myWorkspace',
    route: '/my-workspace',
    icon: 'id-card',
    alwaysVisible: true,
    hiddenForOwner: true,
  };

  readonly groups: NavGroup[] = [
    {
      labelKey: 'common.navGroupPeople',
      icon: 'users',
      items: [
        { labelKey: 'common.members', route: '/members', icon: 'users', screen: 'MEMBERS' },
        { labelKey: 'common.employees', route: '/employees', icon: 'id-card', screen: 'EMPLOYEES' },
        { labelKey: 'common.leads', route: '/leads', icon: 'user-plus', screen: 'LEADS' },
      ],
    },
    {
      labelKey: 'common.navGroupBusiness',
      icon: 'building',
      items: [
        { labelKey: 'common.branches', route: '/branches', icon: 'building', screen: 'BRANCHES' },
        { labelKey: 'common.plans', route: '/plans', icon: 'tags', screen: 'PLANS' },
        { labelKey: 'common.offers', route: '/offers', icon: 'percentage', screen: 'PLANS' },
        { labelKey: 'common.expenses', route: '/expenses', icon: 'wallet', screen: 'EXPENSES' },
      ],
    },
    {
      labelKey: 'common.navGroupWorkforce',
      icon: 'calendar-clock',
      items: [
        { labelKey: 'common.attendance', route: '/attendance', icon: 'calendar-clock', screen: 'ATTENDANCE' },
        { labelKey: 'common.leaveManagement', route: '/leave-management', icon: 'calendar-clock', screen: 'LEAVES' },
      ],
    },
    {
      labelKey: 'common.navGroupAdmin',
      icon: 'shield',
      items: [
        { labelKey: 'common.notifications', route: '/notifications', icon: 'bell', screen: 'NOTIFICATIONS' },
        { labelKey: 'common.rolePermissions', route: '/roles-permissions', icon: 'shield', ownerOnly: true },
        { labelKey: 'common.alerts', route: '/alerts', icon: 'alert', ownerOnly: true },
        { labelKey: 'common.payroll', route: '/payroll', icon: 'wallet', ownerOnly: true },
      ],
    },
  ];

  private canSee(item: NavLeaf): boolean {
    if (item.hiddenForOwner && this.tokenStorage.isOwner()) {
      return false;
    }
    return item.alwaysVisible ? true : item.ownerOnly ? this.tokenStorage.isOwner() : this.permissions.canRead(item.screen!);
  }

  // Only the screens the current user can actually read — recomputed
  // whenever the permission cache updates (it's a signal underneath),
  // so navigating right after the matrix loads reflects it immediately.
  showDashboard = computed(() => this.canSee(this.dashboard));
  showMyWorkspace = computed(() => this.canSee(this.myWorkspace));

  visibleGroups = computed(() =>
    this.groups
      .map((group) => ({ ...group, items: group.items.filter((item) => this.canSee(item)) }))
      .filter((group) => group.items.length > 0),
  );

  isGroupActive(group: NavGroup): boolean {
    return group.items.some((item) => this.router.url.startsWith(item.route));
  }

  toggleGroup(label: string, event: Event): void {
    event.stopPropagation();
    this.openGroup.update((current) => (current === label ? null : label));
  }

  openGroupOnHover(label: string): void {
    this.openGroup.set(label);
  }

  closeGroup(): void {
    this.openGroup.set(null);
  }

  // Any click outside the nav (including outside an open dropdown)
  // closes whichever group is open — clicks inside the dropdown/toggle
  // stop propagation before they reach here (see toggleGroup / the
  // dropdown's own click handler in the template).
  @HostListener('document:click')
  onDocumentClick(): void {
    this.closeGroup();
  }
}
