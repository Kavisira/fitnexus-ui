import { Routes } from '@angular/router';

import { authGuard, firstBranchGuard, noAuthGuard, ownerGuard, permissionGuard, planSelectionGuard, subscriptionGuard } from './core/auth/auth.guard';
import { adminPortalGuard } from './core/admin-portal/admin-portal.guard';
import { LEGACY_SHELL_ROUTES } from './legacy-shell.routes';

/**
 * App routes. The NG-ZORRO + Tailwind app (src/app/v2) now serves every URL
 * at the root — /login, /dashboard, /members, ... (the old /v2 prefix is gone).
 * Screens not migrated yet still render their v1 (PrimeNG) component, but
 * inside the v2 shell — see legacy-shell.routes.ts; delete each entry there as
 * its v2 version lands.
 */
export const routes: Routes = [
  // ---- Platform-operator portal (own login/token/guard; lazy, not yet migrated) ----
  {
    path: 'admin-portal/login',
    loadComponent: () => import('./pages/admin-portal/login/admin-portal-login').then((m) => m.AdminPortalLogin),
    title: 'Platform sign-in · FitNexus',
  },
  {
    path: 'admin-portal/overview',
    loadComponent: () => import('./pages/admin-portal/dashboard/admin-portal-dashboard').then((m) => m.AdminPortalDashboard),
    canActivate: [adminPortalGuard],
    title: 'Platform overview · FitNexus',
  },
  {
    path: 'admin-portal/expenses',
    loadComponent: () => import('./pages/admin-portal/expenses/admin-portal-expenses').then((m) => m.AdminPortalExpenses),
    canActivate: [adminPortalGuard],
    title: 'Platform expenses · FitNexus',
  },

  // ---- Public auth pages (noAuthGuard bounces a logged-in user to /dashboard) ----
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  {
    path: 'login',
    loadComponent: () => import('./v2/features/noauth/login/login.component').then((m) => m.V2LoginComponent),
    canActivate: [noAuthGuard],
    title: 'Sign in · FitNexus',
  },
  {
    path: 'signup',
    loadComponent: () => import('./v2/features/noauth/signup/signup.component').then((m) => m.V2SignupComponent),
    canActivate: [noAuthGuard],
    title: 'Create account · FitNexus',
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('./v2/features/noauth/forgot-password/forgot-password.component').then((m) => m.V2ForgotPasswordComponent),
    canActivate: [noAuthGuard],
    title: 'Reset password · FitNexus',
  },
  {
    path: 'verify-otp',
    loadComponent: () => import('./v2/features/noauth/verify-otp/verify-otp.component').then((m) => m.V2VerifyOtpComponent),
    canActivate: [noAuthGuard],
    title: 'Verify account · FitNexus',
  },

  // ---- Public share-link pages (no guard: links/QR codes already sent out; not yet migrated) ----
  {
    path: 'public-forms/:token',
    loadComponent: () => import('./pages/noauth/public-form-fill/public-form-fill').then((m) => m.PublicFormFill),
    title: 'Feedback form · FitNexus',
  },
  {
    path: 'public-fitness/:token',
    loadComponent: () => import('./pages/noauth/public-member-plans/public-member-plans').then((m) => m.PublicMemberPlans),
    title: 'My plans · FitNexus',
  },

  // ---- Full-page gates: outside the shell, still behind authGuard (not yet migrated) ----
  {
    path: 'subscription-locked',
    loadComponent: () => import('./pages/auth/subscription-locked/subscription-locked').then((m) => m.SubscriptionLocked),
    canActivate: [authGuard],
    title: 'Subscription expired · FitNexus',
  },
  {
    path: 'select-plan',
    loadComponent: () => import('./pages/auth/select-plan/select-plan').then((m) => m.SelectPlan),
    canActivate: [authGuard],
    title: 'Choose your plan · FitNexus',
  },

  // ---- Authenticated app inside the v2 shell ----
  {
    path: '',
    loadComponent: () => import('./v2/shared/layout/auth-layout.component').then((m) => m.V2AuthLayoutComponent),
    canActivate: [authGuard],
    // planSelectionGuard first (no tier yet → /select-plan), then the
    // subscription-expiry check, then first-branch onboarding — each
    // short-circuits the next when it redirects (see auth.guard.ts).
    canActivateChild: [planSelectionGuard, subscriptionGuard, firstBranchGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./v2/features/auth/dashboard/dashboard.component').then((m) => m.V2DashboardComponent),
        canActivate: [permissionGuard],
        data: { screen: 'DASHBOARD' },
        title: 'Dashboard · FitNexus',
      },
      {
        path: 'members',
        loadComponent: () => import('./v2/features/auth/members/members-page.component').then((m) => m.V2MembersPageComponent),
        canActivate: [permissionGuard],
        data: { screen: 'MEMBERS' },
        title: 'Members · FitNexus',
      },
      {
        path: 'employees',
        loadComponent: () => import('./v2/features/auth/employees/employees-page.component').then((m) => m.V2EmployeesPageComponent),
        canActivate: [permissionGuard],
        data: { screen: 'EMPLOYEES' },
        title: 'Employees · FitNexus',
      },
      {
        path: 'offers',
        loadComponent: () => import('./v2/features/auth/offers/offers-page.component').then((m) => m.V2OffersPageComponent),
        canActivate: [permissionGuard],
        data: { screen: 'PLANS' },
        title: 'Offers · FitNexus',
      },
      {
        path: 'expenses',
        loadComponent: () => import('./v2/features/auth/expenses/expenses-page.component').then((m) => m.V2ExpensesPageComponent),
        canActivate: [permissionGuard],
        data: { screen: 'EXPENSES' },
        title: 'Expenses · FitNexus',
      },
      {
        path: 'todo',
        loadComponent: () => import('./v2/features/auth/todo/todo-page.component').then((m) => m.V2TodoPageComponent),
        canActivate: [permissionGuard],
        data: { screen: 'LEAVES' },
        title: 'To-Do · FitNexus',
      },
      {
        // Org-wide login alerts — Owner-only, like Roles & Permissions.
        path: 'alerts',
        loadComponent: () => import('./v2/features/auth/alerts/alerts-page.component').then((m) => m.V2AlertsPageComponent),
        canActivate: [ownerGuard],
        title: 'Login Alerts · FitNexus',
      },
      {
        // Reference docs — every logged-in user, no permission screen.
        path: 'help',
        loadComponent: () => import('./v2/features/auth/help/help-page.component').then((m) => m.V2HelpPageComponent),
        title: 'Help & Guide · FitNexus',
      },
      ...LEGACY_SHELL_ROUTES,
    ],
  },

  // Old bookmarks from the migration period (/v2/members → /members).
  { path: 'v2', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: 'v2/:rest', redirectTo: ':rest' },
];
