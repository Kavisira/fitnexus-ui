import { Routes } from '@angular/router';
import { Login } from './pages/noauth/login/login';
import { ForgotPassword } from './pages/noauth/forgot-password/forgot-password';
import { Signup } from './pages/noauth/signup/signup';
import { VerifyOtp } from './pages/noauth/verify-otp/verify-otp';
import { Layout } from './pages/auth/layout/layout';
import { Dashboard } from './pages/auth/dashboard/dashboard';
import { Branches } from './pages/auth/branches/branches';
import { Plans } from './pages/auth/plans/plans';
import { Offers } from './pages/auth/offers/offers';
import { Leads } from './pages/auth/leads/leads';
import { Employees } from './pages/auth/employees/employees';
import { Members } from './pages/auth/members/members';
import { Expenses } from './pages/auth/expenses/expenses';
import { NotificationSettingsLayout } from './pages/auth/notification-settings/notification-settings-layout';
import { NotificationSetup } from './pages/auth/settings/notification-setup/notification-setup';
import { NotificationConfiguration } from './pages/auth/settings/notification-configuration/notification-configuration';
import { RolePermissions } from './pages/auth/role-permissions/role-permissions';
import { Help } from './pages/auth/help/help';
import { Placeholder } from './shared/placeholder/placeholder';
import { authGuard, noAuthGuard, ownerGuard, permissionGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  // Public (no auth required) routes. noAuthGuard bounces an already
  // logged-in user (valid, non-expired token) straight to /dashboard.
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: 'login', component: Login, canActivate: [noAuthGuard], title: 'Sign in · FitNexus' },
  {
    path: 'forgot-password',
    component: ForgotPassword,
    canActivate: [noAuthGuard],
    title: 'Forgot password · FitNexus',
  },
  { path: 'signup', component: Signup, canActivate: [noAuthGuard], title: 'Create account · FitNexus' },
  {
    path: 'verify-otp',
    component: VerifyOtp,
    canActivate: [noAuthGuard],
    title: 'Verify account · FitNexus',
  },

  // Authenticated routes — everything nested under Layout requires a
  // valid, non-expired session (authGuard), which also loads the
  // logged-in user's permission matrix before any child route's own
  // guard runs. Each child route below declares `data: { screen }` and
  // `canActivate: [permissionGuard]`, so typing a screen's URL directly
  // without read access on it redirects to /dashboard instead of
  // rendering — the same matrix the sidenav uses to hide the link in
  // the first place.
  {
    path: '',
    component: Layout,
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        component: Dashboard,
        canActivate: [permissionGuard],
        data: { screen: 'DASHBOARD' },
        title: 'Dashboard · FitNexus',
      },
      {
        path: 'branches',
        component: Branches,
        canActivate: [permissionGuard],
        data: { screen: 'BRANCHES' },
        title: 'Branches · FitNexus',
      },
      {
        path: 'plans',
        component: Plans,
        canActivate: [permissionGuard],
        data: { screen: 'PLANS' },
        title: 'Plans & Packages · FitNexus',
      },
      {
        // Offers are part of Plans management (same PLANS permission),
        // just kept on their own screen rather than inside the Plans
        // dialog — see the doc comment on the Offers component.
        path: 'offers',
        component: Offers,
        canActivate: [permissionGuard],
        data: { screen: 'PLANS' },
        title: 'Offers · FitNexus',
      },
      {
        path: 'members',
        component: Members,
        canActivate: [permissionGuard],
        data: { screen: 'MEMBERS' },
        title: 'Members · FitNexus',
      },
      {
        path: 'expenses',
        component: Expenses,
        canActivate: [permissionGuard],
        data: { screen: 'EXPENSES' },
        title: 'Expenses · FitNexus',
      },
      {
        path: 'employees',
        component: Employees,
        canActivate: [permissionGuard],
        data: { screen: 'EMPLOYEES' },
        title: 'Employees · FitNexus',
      },
      {
        path: 'leads',
        component: Leads,
        canActivate: [permissionGuard],
        data: { screen: 'LEADS' },
        title: 'Leads · FitNexus',
      },
      {
        path: 'attendance',
        component: Placeholder,
        canActivate: [permissionGuard],
        data: { labelKey: 'common.attendance', screen: 'ATTENDANCE' },
        title: 'Attendance · FitNexus',
      },
      {
        // Editing the role×screen matrix itself is owner-only — it
        // isn't part of the matrix it edits, so it uses ownerGuard
        // instead of permissionGuard.
        path: 'roles-permissions',
        component: RolePermissions,
        canActivate: [ownerGuard],
        title: 'Roles & Permissions · FitNexus',
      },
      {
        // Help is reference documentation, not a data screen — every
        // logged-in user can open it regardless of role, so it has no
        // permissionGuard/screen data like the other children here.
        path: 'help',
        component: Help,
        title: 'Help & Guide · FitNexus',
      },
      {
        // Setup and Configuration are two tabs of one page, each with
        // its own bookmarkable route — not tucked inside the Settings
        // dialog. Both are gated by the same NOTIFICATIONS screen.
        path: 'notifications',
        component: NotificationSettingsLayout,
        canActivate: [permissionGuard],
        data: { screen: 'NOTIFICATIONS' },
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'setup' },
          { path: 'setup', component: NotificationSetup, title: 'Notification Setup · FitNexus' },
          { path: 'configuration', component: NotificationConfiguration, title: 'Notification Configuration · FitNexus' },
        ],
      },
    ],
  },
];
