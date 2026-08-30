import { Component, EventEmitter, Input, Output, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
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

import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { PermissionsService, PermissionScreen } from '../../core/roles/permissions.service';
import { TokenStorage } from '../../core/auth/token-storage.service';

interface NavItem {
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
}

@Component({
  selector: 'app-sidenav',
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
  ],
  templateUrl: './sidenav.html',
  styleUrls: ['./sidenav.css'],
})
export class Sidenav {
  @Input() collapsed = false;

  // Mobile only (see the media query in sidenav.css) — whether the
  // overlay drawer is currently slid into view.
  @Input() mobileOpen = false;

  // Fired when a nav link is tapped, so the layout can close the mobile
  // overlay after navigating instead of leaving it open over the page.
  @Output() navigated = new EventEmitter<void>();

  private permissions = inject(PermissionsService);
  private tokenStorage = inject(TokenStorage);

  readonly navItems: NavItem[] = [
    { labelKey: 'common.dashboard', route: '/dashboard', icon: 'home', screen: 'DASHBOARD' },
    { labelKey: 'common.branches', route: '/branches', icon: 'building', screen: 'BRANCHES' },
    { labelKey: 'common.plans', route: '/plans', icon: 'tags', screen: 'PLANS' },
    { labelKey: 'common.offers', route: '/offers', icon: 'percentage', screen: 'PLANS' },
    { labelKey: 'common.members', route: '/members', icon: 'users', screen: 'MEMBERS' },
    { labelKey: 'common.expenses', route: '/expenses', icon: 'wallet', screen: 'EXPENSES' },
    { labelKey: 'common.employees', route: '/employees', icon: 'id-card', screen: 'EMPLOYEES' },
    { labelKey: 'common.leads', route: '/leads', icon: 'user-plus', screen: 'LEADS' },
    { labelKey: 'common.attendance', route: '/attendance', icon: 'calendar-clock', screen: 'ATTENDANCE' },
    { labelKey: 'common.notifications', route: '/notifications', icon: 'bell', screen: 'NOTIFICATIONS' },
    { labelKey: 'common.leaveManagement', route: '/leave-management', icon: 'calendar-clock', screen: 'LEAVES' },
    { labelKey: 'common.rolePermissions', route: '/roles-permissions', icon: 'shield', ownerOnly: true },
    { labelKey: 'common.alerts', route: '/alerts', icon: 'alert', ownerOnly: true },
  ];

  // Only the screens the current user can actually read — recomputed
  // whenever the permission cache updates (it's a signal underneath),
  // so navigating right after the matrix loads reflects it immediately.
  visibleNavItems = computed(() =>
    this.navItems.filter((item) =>
      item.alwaysVisible ? true : item.ownerOnly ? this.tokenStorage.isOwner() : this.permissions.canRead(item.screen!),
    ),
  );
}
