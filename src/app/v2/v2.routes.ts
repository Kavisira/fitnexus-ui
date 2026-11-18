import { Routes } from '@angular/router';
import { authGuard, noAuthGuard, ownerGuard, permissionGuard } from '../core/auth/auth.guard';

export const V2_ROUTES: Routes = [
  // Public unauthenticated routes
  {
    path: 'login',
    loadComponent: () =>
      import('./features/noauth/login/login.component').then(
        (m) => m.V2LoginComponent
      ),
    canActivate: [noAuthGuard],
    title: 'Sign in (v2) · FitNexus',
  },
  {
    path: 'signup',
    loadComponent: () =>
      import('./features/noauth/signup/signup.component').then(
        (m) => m.V2SignupComponent
      ),
    canActivate: [noAuthGuard],
    title: 'Create Account (v2) · FitNexus',
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./features/noauth/forgot-password/forgot-password.component').then(
        (m) => m.V2ForgotPasswordComponent
      ),
    canActivate: [noAuthGuard],
    title: 'Reset Password (v2) · FitNexus',
  },
  {
    path: 'verify-otp',
    loadComponent: () =>
      import('./features/noauth/verify-otp/verify-otp.component').then(
        (m) => m.V2VerifyOtpComponent
      ),
    canActivate: [noAuthGuard],
    title: 'Verify Account (v2) · FitNexus',
  },

  // Authenticated routes inside V2 Shell Layout
  {
    path: '',
    loadComponent: () =>
      import('./shared/layout/auth-layout.component').then(
        (m) => m.V2AuthLayoutComponent
      ),
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/auth/dashboard/dashboard.component').then(
            (m) => m.V2DashboardComponent
          ),
        title: 'Dashboard (v2) · FitNexus',
      },
      {
        path: 'members',
        loadComponent: () =>
          import('./features/auth/members/members-page.component').then(
            (m) => m.V2MembersPageComponent
          ),
        title: 'Members (v2) · FitNexus',
      },
      {
        path: 'employees',
        loadComponent: () =>
          import('./features/auth/employees/employees-page.component').then(
            (m) => m.V2EmployeesPageComponent
          ),
        title: 'Employees (v2) · FitNexus',
      },
      {
        path: 'todo',
        loadComponent: () =>
          import('./features/auth/todo/todo-page.component').then(
            (m) => m.V2TodoPageComponent
          ),
        canActivate: [permissionGuard],
        data: { screen: 'LEAVES' },
        title: 'To-Do (v2) · FitNexus',
      },
      {
        path: 'offers',
        loadComponent: () =>
          import('./features/auth/offers/offers-page.component').then(
            (m) => m.V2OffersPageComponent
          ),
        canActivate: [permissionGuard],
        data: { screen: 'PLANS' },
        title: 'Offers (v2) · FitNexus',
      },
      {
        path: 'expenses',
        loadComponent: () =>
          import('./features/auth/expenses/expenses-page.component').then(
            (m) => m.V2ExpensesPageComponent
          ),
        canActivate: [permissionGuard],
        data: { screen: 'EXPENSES' },
        title: 'Expenses (v2) · FitNexus',
      },
      {
        path: 'alerts',
        loadComponent: () =>
          import('./features/auth/alerts/alerts-page.component').then(
            (m) => m.V2AlertsPageComponent
          ),
        canActivate: [ownerGuard],
        title: 'Alerts (v2) · FitNexus',
      },
      {
        path: 'help',
        loadComponent: () =>
          import('./features/auth/help/help-page.component').then(
            (m) => m.V2HelpPageComponent
          ),
        title: 'Help (v2) · FitNexus',
      },
    ],
  },
];
