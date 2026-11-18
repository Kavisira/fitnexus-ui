import { Routes } from '@angular/router';

import { ownerGuard, permissionGuard } from './core/auth/auth.guard';

/**
 * v1 (PrimeNG) screens NOT yet migrated to NG-ZORRO. They render inside the
 * v2 shell at their original URLs so nothing breaks during the migration.
 * When a screen gets its v2 version: add it to app.routes.ts, delete its
 * entry here, and delete its folder under src/app/pages. Once this list is
 * empty, PrimeNG and its global styles can be removed.
 */
export const LEGACY_SHELL_ROUTES: Routes = [
  {
    path: 'branches',
    loadComponent: () => import('./pages/auth/branches/branches').then((m) => m.Branches),
    canActivate: [permissionGuard],
    data: { screen: 'BRANCHES' },
    title: 'Branches · FitNexus',
  },
  {
    path: 'plans',
    loadComponent: () => import('./pages/auth/plans/plans').then((m) => m.Plans),
    canActivate: [permissionGuard],
    data: { screen: 'PLANS' },
    title: 'Plans & Packages · FitNexus',
  },
  {
    path: 'leads',
    loadComponent: () => import('./pages/auth/leads/leads').then((m) => m.Leads),
    canActivate: [permissionGuard],
    data: { screen: 'LEADS' },
    title: 'Leads · FitNexus',
  },
  {
    path: 'forms',
    loadComponent: () => import('./pages/auth/forms-admin/forms-admin').then((m) => m.FormsAdmin),
    canActivate: [permissionGuard],
    data: { screen: 'FORMS' },
    title: 'Forms · FitNexus',
  },
  {
    path: 'attendance',
    loadComponent: () => import('./pages/auth/attendance/attendance').then((m) => m.Attendance),
    canActivate: [permissionGuard],
    data: { labelKey: 'common.attendance', screen: 'ATTENDANCE' },
    title: 'Attendance · FitNexus',
  },
  {
    path: 'leave-management',
    loadComponent: () => import('./pages/auth/leave-management/leave-management').then((m) => m.LeaveManagement),
    canActivate: [permissionGuard],
    data: { screen: 'LEAVES' },
    title: 'Leave Settings · FitNexus',
  },
  {
    // Editing the role×screen matrix is Owner-only (not part of the matrix it edits).
    path: 'roles-permissions',
    loadComponent: () => import('./pages/auth/role-permissions/role-permissions').then((m) => m.RolePermissions),
    canActivate: [ownerGuard],
    title: 'Roles & Permissions · FitNexus',
  },
  {
    path: 'payroll',
    loadComponent: () => import('./pages/auth/payroll/payroll').then((m) => m.Payroll),
    canActivate: [ownerGuard],
    title: 'Payroll · FitNexus',
  },
  {
    path: 'billing',
    loadComponent: () => import('./pages/auth/billing/billing').then((m) => m.Billing),
    canActivate: [ownerGuard],
    title: 'Billing · FitNexus',
  },
  {
    // Self-service area for any logged-in employee — no permission screen.
    path: 'my-workspace',
    loadComponent: () => import('./pages/auth/my-workspace/my-workspace').then((m) => m.MyWorkspace),
    title: 'My Workspace · FitNexus',
  },
  {
    path: 'notifications',
    loadComponent: () =>
      import('./pages/auth/notification-settings/notification-settings-layout').then((m) => m.NotificationSettingsLayout),
    canActivate: [permissionGuard],
    data: { screen: 'NOTIFICATIONS' },
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'setup' },
      {
        path: 'setup',
        loadComponent: () => import('./pages/auth/settings/notification-setup/notification-setup').then((m) => m.NotificationSetup),
        title: 'Notification Setup · FitNexus',
      },
      {
        path: 'configuration',
        loadComponent: () =>
          import('./pages/auth/settings/notification-configuration/notification-configuration').then(
            (m) => m.NotificationConfiguration,
          ),
        title: 'Notification Configuration · FitNexus',
      },
    ],
  },
];
