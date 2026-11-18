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

const NAV_ACTIVE =
  'bg-blue-700/10 text-blue-800 shadow-[inset_3px_0_0_0_#1d4ed8] dark:bg-blue-500/15 dark:text-blue-300 dark:shadow-[inset_3px_0_0_0_#60a5fa] font-semibold';
const NAV_BASE =
  'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-blue-50/70 dark:hover:bg-blue-900/20 hover:text-gray-900 dark:hover:text-white transition-all duration-200';
const NAV_BASE_COMPACT =
  'group flex items-center gap-3 px-3 py-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-blue-50/70 dark:hover:bg-blue-900/20 hover:text-gray-900 dark:hover:text-white transition-all duration-200';
const NAV_BASE_BETWEEN =
  'group flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-blue-50/70 dark:hover:bg-blue-900/20 hover:text-gray-900 dark:hover:text-white transition-all duration-200';

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
      <div class="flex items-center h-16 px-4 border-b border-gray-100 dark:border-gray-800 gap-3 overflow-hidden shrink-0">
        <div
          class="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 text-white shrink-0 shadow-sm ring-1 ring-blue-900/10"
        >
          <span nz-icon nzType="thunderbolt" class="text-lg"></span>
        </div>
        @if (showLabels()) {
          <div class="flex flex-col justify-center min-w-0 leading-tight">
            <span class="text-base font-bold text-gray-900 dark:text-white tracking-tight truncate">FitNexus</span>
            <span class="text-[11px] font-medium text-gray-400 dark:text-gray-500 truncate">Workspace</span>
          </div>
        }
      </div>

      <!-- Navigation Items Container -->
      <nav class="flex-1 overflow-y-auto overflow-x-hidden px-2.5 py-3 space-y-0.5">
        <!-- Dashboard Link -->
        @if (showDashboard()) {
          <a
            [routerLink]="buildRoute(dashboard.route)"
            data-tour="nav-DASHBOARD"
            routerLinkActive="${NAV_ACTIVE}"
            class="${NAV_BASE}"
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
            routerLinkActive="${NAV_ACTIVE}"
            class="${NAV_BASE_BETWEEN}"
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
              <span
                class="flex items-center justify-center min-w-5 h-5 px-1.5 text-xs font-semibold rounded-full bg-red-500 text-white shrink-0 shadow-xs"
              >
                {{ todoCount() }}
              </span>
            }
          </a>
        }

        <!-- Hairline divider before grouped nav -->
        <div class="h-px bg-gray-100 dark:bg-gray-800 mx-1 my-2"></div>

        <!-- Grouped Navigation -->
        @for (group of visibleGroups(); track group.labelKey) {
          <div class="pt-1">
            @if (showLabels()) {
              <div class="px-3 pb-1.5 pt-2 text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                {{ group.labelKey | translate }}
              </div>
            }
            <div class="space-y-0.5">
              @for (item of group.items; track item.route) {
                <a
                  [routerLink]="buildRoute(item.route)"
                  [attr.data-tour]="item.screen ? 'nav-' + item.screen : null"
                  routerLinkActive="${NAV_ACTIVE}"
                  class="${NAV_BASE_COMPACT}"
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
            <div class="h-px bg-gray-100 dark:bg-gray-800 mx-1 mb-2"></div>
            <a
              [routerLink]="buildRoute(myWorkspace.route)"
              routerLinkActive="${NAV_ACTIVE}"
              class="${NAV_BASE}"
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
