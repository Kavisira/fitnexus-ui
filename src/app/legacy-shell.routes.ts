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
    path: 'attendance',
    loadComponent: () => import('./pages/auth/attendance/attendance').then((m) => m.Attendance),
    canActivate: [permissionGuard],
    data: { labelKey: 'common.attendance', screen: 'ATTENDANCE' },
    title: 'Attendance · FitNexus',
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
];
