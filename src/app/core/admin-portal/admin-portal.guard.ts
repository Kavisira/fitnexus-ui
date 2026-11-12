import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AdminPortalTokenStorage } from './admin-portal-token-storage.service';

/** Protects /admin-portal/overview. Client-side check only (UX, so an
 * expired/missing session bounces straight to the admin-portal login
 * instead of rendering an empty/error dashboard) — PlatformAdminJwtGuard
 * on the backend is the actual enforcement. */
export const adminPortalGuard: CanActivateFn = () => {
  const tokenStorage = inject(AdminPortalTokenStorage);
  const router = inject(Router);

  if (!tokenStorage.hasValidSession()) {
    return router.createUrlTree(['/admin-portal/login']);
  }
  return true;
};
