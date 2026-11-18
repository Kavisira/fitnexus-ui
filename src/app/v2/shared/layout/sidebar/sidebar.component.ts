import { Component, computed, inject, input } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';

import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { PermissionsService, PermissionScreen } from '../../../../core/roles/permissions.service';
import { TokenStorage } from '../../../../core/auth/token-storage.service';
import { TodoBadgeService } from '../../../../core/todo/todo-badge.service';
import { SidebarStateService } from '../../../../shared/sidebar/sidebar-state.service';

export interface NavLeaf {
  labelKey: string; route: string; icon: string;
  screen?: PermissionScreen; ownerOnly?: boolean; alwaysVisible?: boolean; hiddenForOwner?: boolean;
}

export interface NavGroup {
  labelKey: string; icon: string; items: NavLeaf[];
}

@Component({
  selector: 'app-v2-sidebar',
  imports: [RouterLink, RouterLinkActive, NzIconModule, NzTooltipModule, TranslatePipe],
  host: {
    class: 'block h-full shrink-0 z-20',
  },
  template: `
    <!-- Desktop & Mobile Drawer Sidebar Shell -->
    <aside
      class="flex flex-col h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-300 z-20 shrink-0"
      [class.w-56]="showLabels()"
      [class.w-16]="!showLabels()"
      [class.fixed]="state.mobileOpen()"
      [class.inset-y-0]="state.mobileOpen()"
      [class.left-0]="state.mobileOpen()"
      [class.shadow-xl]="state.mobileOpen()"
    >
      <!-- Brand Logo Bar -->
      <div class="flex items-center h-14 px-4 border-b border-gray-100 dark:border-gray-800 gap-2.5 overflow-hidden shrink-0">
        <div class="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600 text-white shrink-0 shadow-xs">
          <span nz-icon nzType="thunderbolt" class="text-lg"></span>
        </div>
        @if (showLabels()) {
          <span class="text-base font-bold text-gray-900 dark:text-white tracking-tight truncate">
            FitNexus
          </span>
        }
      </div>

      <!-- Navigation Items Container -->
      <nav class="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-1">
        <!-- Dashboard Link -->
        @if (showDashboard()) {
          <a
            [routerLink]="buildRoute(dashboard.route)"
            data-tour="nav-DASHBOARD"
            routerLinkActive="bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 font-semibold"
            class="flex items-center gap-3 px-3 py-2 rounded-xl text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            nz-tooltip
            [nzTooltipTitle]="!showLabels() ? (dashboard.labelKey | translate) : ''"
            nzTooltipPlacement="right"
            (click)="closeMobile()"
          >
            <span nz-icon [nzType]="dashboard.icon" class="text-lg shrink-0"></span>
            @if (showLabels()) {
              <span class="text-sm truncate">{{ dashboard.labelKey | translate }}</span>
            }
          </a>
        }

        <!-- To-Do Link -->
        @if (showTodo()) {
          <a
            [routerLink]="buildRoute(todo.route)"
            routerLinkActive="bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 font-semibold"
            class="flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            nz-tooltip
            [nzTooltipTitle]="!showLabels() ? (todo.labelKey | translate) : ''"
            nzTooltipPlacement="right"
            (click)="closeMobile()"
          >
            <div class="flex items-center gap-3 min-w-0">
              <span nz-icon [nzType]="todo.icon" class="text-lg shrink-0"></span>
              @if (showLabels()) {
                <span class="text-sm truncate">{{ todo.labelKey | translate }}</span>
              }
            </div>
            @if (todoCount() > 0) {
              <span class="flex items-center justify-center min-w-5 h-5 px-1.5 text-xs font-semibold rounded-full bg-red-500 text-white shrink-0">
                {{ todoCount() }}
              </span>
            }
          </a>
        }

        <!-- Grouped Navigation -->
        @for (group of visibleGroups(); track group.labelKey) {
          <div class="pt-3">
            @if (showLabels()) {
              <div class="px-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {{ group.labelKey | translate }}
              </div>
            }
            <div class="space-y-0.5">
              @for (item of group.items; track item.route) {
                <a
                  [routerLink]="buildRoute(item.route)"
                  [attr.data-tour]="item.screen ? 'nav-' + item.screen : null"
                  routerLinkActive="bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 font-semibold"
                  class="flex items-center gap-3 px-3 py-1.5 rounded-xl text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  nz-tooltip
                  [nzTooltipTitle]="!showLabels() ? (item.labelKey | translate) : ''"
                  nzTooltipPlacement="right"
                  (click)="closeMobile()"
                >
                  <span nz-icon [nzType]="item.icon" class="text-base shrink-0"></span>
                  @if (showLabels()) {
                    <span class="text-sm truncate">{{ item.labelKey | translate }}</span>
                  }
                </a>
              }
            </div>
          </div>
        }

        <!-- My Workspace Link -->
        @if (showMyWorkspace()) {
          <div class="pt-2">
            <a
              [routerLink]="buildRoute(myWorkspace.route)"
              routerLinkActive="bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 font-semibold"
              class="flex items-center gap-3 px-3 py-2 rounded-xl text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              nz-tooltip
              [nzTooltipTitle]="!showLabels() ? (myWorkspace.labelKey | translate) : ''"
              nzTooltipPlacement="right"
              (click)="closeMobile()"
            >
              <span nz-icon [nzType]="myWorkspace.icon" class="text-lg shrink-0"></span>
              @if (showLabels()) {
                <span class="text-sm truncate">{{ myWorkspace.labelKey | translate }}</span>
              }
            </a>
          </div>
        }
      </nav>
    </aside>

    <!-- Mobile Dimming Backdrop -->
    @if (state.mobileOpen()) {
      <div
        class="fixed inset-0 bg-black/40 backdrop-blur-xs z-10 transition-opacity"
        (click)="closeMobile()"
        aria-hidden="true"
      ></div>
    }
  `,
})
export class V2SidebarComponent {
  readonly routePrefix = input<string>('');

  private permissions = inject(PermissionsService);
  private tokenStorage = inject(TokenStorage);
  private router = inject(Router);
  private todoBadge = inject(TodoBadgeService);
  readonly state = inject(SidebarStateService);

  constructor() {
    this.todoBadge.refresh();
  }

  readonly showLabels = computed(() => !this.state.collapsed() || this.state.mobileOpen());

  readonly dashboard: NavLeaf = { labelKey: 'common.dashboard', route: '/dashboard', icon: 'dashboard', screen: 'DASHBOARD' };
  readonly todo: NavLeaf = { labelKey: 'common.todo', route: '/todo', icon: 'check-square', screen: 'LEAVES' };
  readonly myWorkspace: NavLeaf = { labelKey: 'common.myWorkspace', route: '/my-workspace', icon: 'user', alwaysVisible: true, hiddenForOwner: true };

  readonly groups: NavGroup[] = [
    {
      labelKey: 'common.navGroupPeople',
      icon: 'team',
      items: [
        { labelKey: 'common.members', route: '/members', icon: 'team', screen: 'MEMBERS' },
        { labelKey: 'common.employees', route: '/employees', icon: 'solution', screen: 'EMPLOYEES' },
        { labelKey: 'common.leads', route: '/leads', icon: 'usergroup-add', screen: 'LEADS' },
        { labelKey: 'common.forms', route: '/forms', icon: 'file-text', screen: 'FORMS' },
      ],
    },
    {
      labelKey: 'common.navGroupBusiness',
      icon: 'branches',
      items: [
        { labelKey: 'common.branches', route: '/branches', icon: 'branches', screen: 'BRANCHES' },
        { labelKey: 'common.plans', route: '/plans', icon: 'tags', screen: 'PLANS' },
        { labelKey: 'common.offers', route: '/offers', icon: 'dollar', screen: 'PLANS' },
        { labelKey: 'common.expenses', route: '/expenses', icon: 'wallet', screen: 'EXPENSES' },
      ],
    },
    {
      labelKey: 'common.navGroupWorkforce',
      icon: 'calendar',
      items: [
        { labelKey: 'common.attendance', route: '/attendance', icon: 'calendar', screen: 'ATTENDANCE' },
        { labelKey: 'common.leaveSettings', route: '/leave-management', icon: 'calendar', screen: 'LEAVES' },
      ],
    },
    {
      labelKey: 'common.navGroupAdmin',
      icon: 'safety-certificate',
      items: [
        { labelKey: 'common.notifications', route: '/notifications', icon: 'bell', screen: 'NOTIFICATIONS' },
        { labelKey: 'common.rolePermissions', route: '/roles-permissions', icon: 'safety-certificate', ownerOnly: true },
        { labelKey: 'common.alerts', route: '/alerts', icon: 'alert', ownerOnly: true },
        { labelKey: 'common.payroll', route: '/payroll', icon: 'dollar', ownerOnly: true },
        { labelKey: 'common.billing', route: '/billing', icon: 'credit-card', ownerOnly: true },
      ],
    },
  ];

  private canSee(item: NavLeaf): boolean {
    if (item.hiddenForOwner && this.tokenStorage.isOwner()) return false;
    return item.alwaysVisible ? true : item.ownerOnly ? this.tokenStorage.isOwner() : this.permissions.canRead(item.screen!);
  }

  readonly showDashboard = computed(() => this.canSee(this.dashboard));
  readonly showTodo = computed(() => this.canSee(this.todo));
  readonly showMyWorkspace = computed(() => this.canSee(this.myWorkspace));
  readonly todoCount = this.todoBadge.pendingCount;

  readonly visibleGroups = computed(() =>
    this.groups
      .map((group) => ({ ...group, items: group.items.filter((item) => this.canSee(item)) }))
      .filter((group) => group.items.length > 0),
  );

  buildRoute(path: string): string {
    const prefix = this.routePrefix();
    return prefix ? `${prefix}${path}` : path;
  }

  closeMobile(): void {
    this.state.closeMobile();
  }
}
