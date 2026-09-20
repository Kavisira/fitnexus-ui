import { Component, computed, inject, signal } from '@angular/core';
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
import { ListCheck } from '@primeicons/angular/list-check';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { AvatarModule } from 'primeng/avatar';
import { MenuItem } from 'primeng/api';
import { TooltipModule } from 'primeng/tooltip';

import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { PermissionsService, PermissionScreen } from '../../core/roles/permissions.service';
import { TokenStorage } from '../../core/auth/token-storage.service';
import { SettingsDialog } from '../settings-dialog/settings-dialog';
import { VersionDialog } from '../version-dialog/version-dialog';
import { TranslationService } from '../../core/i18n/translation.service';
import { ToastService } from '../../core/toast/toast.service';
import { TodoBadgeService } from '../../core/todo/todo-badge.service';
import { SidebarStateService } from './sidebar-state.service';

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
 * Collapsible left sidebar (Option A from the nav redesign discussion):
 * icon-first, full width (~220px) or collapsed to an icon rail
 * (~64px) via the toggle in the header. Grouped by category (People,
 * Business, Workforce, Admin) exactly like the old top nav did — every
 * group's items are always shown (no accordion to click through), so
 * the whole nav is visible at a glance. Dashboard and My Workspace are
 * standalone entries, same as before. The profile menu (with
 * settings/version/logout) lives in the footer instead of a top bar,
 * since the brand + primary identity now both live in this rail. On
 * small screens it becomes an off-canvas drawer instead (see
 * SidebarStateService + the 768px breakpoint in sidebar.css).
 */
@Component({
  selector: 'app-sidebar',
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
    ListCheck,
    TranslatePipe,
    ButtonModule,
    MenuModule,
    AvatarModule,
    TooltipModule,
    SettingsDialog,
    VersionDialog,
  ],
  templateUrl: './sidebar.html',
  styleUrls: ['./sidebar.css'],
})
export class Sidebar {
  private permissions = inject(PermissionsService);
  private tokenStorage = inject(TokenStorage);
  private router = inject(Router);
  private i18n = inject(TranslationService);
  private toast = inject(ToastService);
  private todoBadge = inject(TodoBadgeService);
  // Collapse/expand + mobile drawer state now live here so the header's
  // nav-toggle button (see shared/header) can drive the same state.
  state = inject(SidebarStateService);

  constructor() {
    // Pending-count badge for the To-Do nav item below — fetched once
    // per sidebar lifetime (i.e. once per login session), same as the
    // rest of this component's data.
    this.todoBadge.refresh();
  }

  // Labels render whenever the rail isn't collapsed, OR it's open as a
  // mobile drawer — the drawer always shows full labels even if
  // `collapsed` was left true from an earlier desktop session, since
  // an icon-only strip isn't usable as a phone drawer.
  showLabels = computed(() => !this.state.collapsed() || this.state.mobileOpen());

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
    return role ? (Sidebar.ROLE_LABELS[role] ?? role) : '';
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

  private logout(): void {
    this.tokenStorage.clear();
    this.permissions.clear();
    this.toast.success('You have been logged out.');
    this.router.navigateByUrl('/login');
  }

  readonly dashboard: NavLeaf = {
    labelKey: 'common.dashboard',
    route: '/dashboard',
    icon: 'home',
    screen: 'DASHBOARD',
  };

  // Standalone, top-level entry (not tucked into a group) for anything
  // that currently needs a human decision — pending leave requests
  // today, more categories (review submissions, etc.) later. Gated by
  // LEAVES since that's the only wired-up category so far; as more
  // categories join, this should widen to "canRead any category this
  // page covers" rather than staying tied to one screen forever.
  readonly todo: NavLeaf = {
    labelKey: 'common.todo',
    route: '/todo',
    icon: 'list-check',
    screen: 'LEAVES',
  };

  // Last standalone nav item, same level as Dashboard — not tucked
  // inside a group, per the product decision that this deserves its
  // own always-visible entry.
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
        { labelKey: 'common.leaveSettings', route: '/leave-management', icon: 'calendar-clock', screen: 'LEAVES' },
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
  showTodo = computed(() => this.canSee(this.todo));
  showMyWorkspace = computed(() => this.canSee(this.myWorkspace));

  todoCount = this.todoBadge.pendingCount;

  visibleGroups = computed(() =>
    this.groups
      .map((group) => ({ ...group, items: group.items.filter((item) => this.canSee(item)) }))
      .filter((group) => group.items.length > 0),
  );

  isGroupActive(group: NavGroup): boolean {
    return group.items.some((item) => this.router.url.startsWith(item.route));
  }

  closeMobile(): void {
    this.state.closeMobile();
  }
}
