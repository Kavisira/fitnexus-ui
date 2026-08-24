import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Observable, map, of } from 'rxjs';

import { TokenStorage } from './token-storage.service';
import { ToastService } from '../toast/toast.service';
import { PermissionsService, PermissionScreen } from '../roles/permissions.service';

/** Protects every route nested under Layout (dashboard, branches,
 * members, ...). Typing an authenticated URL directly without a valid
 * (non-expired) session redirects to /login instead of rendering.
 *
 * Also the single place the permission matrix gets loaded for the
 * session — every other permission check (sidenav filtering, per-route
 * screen guards, per-action gating) assumes it's already in memory by
 * the time a child route/component runs, since Angular resolves an
 * ancestor route's canActivate before any of its children's. */
export const authGuard: CanActivateFn = (_route, state) => {
  const tokenStorage = inject(TokenStorage);
  const router = inject(Router);
  const toast = inject(ToastService);
  const permissions = inject(PermissionsService);

  if (!tokenStorage.hasValidSession()) {
    if (tokenStorage.get()) {
      // A token existed but had expired.
      toast.warn('Your session has expired. Please log in again.', 'Session expired');
    }
    return of(router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } }));
  }

  return permissions.ensureLoaded().pipe(map(() => true));
};

/** Opposite guard for the noauth pages (login/signup/forgot-password):
 * an already-logged-in user shouldn't be able to land back on them. */
export const noAuthGuard: CanActivateFn = () => {
  const tokenStorage = inject(TokenStorage);
  const router = inject(Router);

  if (tokenStorage.hasValidSession()) {
    return router.createUrlTree(['/dashboard']);
  }
  return true;
};

/** Per-route screen guard — reads `data: { screen: '...' }` off the
 * route and redirects to /dashboard if the current user's cached
 * permissions don't allow reading that screen. A route with no
 * `screen` in its data passes through unrestricted. Relies on the
 * parent Layout route's authGuard having already loaded the
 * permission matrix (see authGuard above) — Angular always resolves
 * that before evaluating a child route's own canActivate. */
export const permissionGuard: CanActivateFn = (route) => {
  const permissions = inject(PermissionsService);
  const router = inject(Router);

  const screen = route.data?.['screen'] as PermissionScreen | undefined;
  if (!screen) {
    return true;
  }
  if (permissions.canRead(screen)) {
    return true;
  }
  return router.createUrlTree(['/dashboard']);
};

/** Owner-only route guard — for screens (like the permission matrix
 * editor itself) that aren't part of the per-screen matrix at all and
 * are simply off-limits to anyone but the owner. */
export const ownerGuard: CanActivateFn = () => {
  const tokenStorage = inject(TokenStorage);
  const router = inject(Router);

  if (tokenStorage.isOwner()) {
    return true;
  }
  return router.createUrlTree(['/dashboard']);
};
