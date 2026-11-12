import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { TokenStorage } from './token-storage.service';
import { ToastService } from '../toast/toast.service';
import { PermissionsService } from '../roles/permissions.service';
import { ConfirmService } from '../confirm/confirm.service';
import { SubscriptionStatusService } from './subscription-status.service';

// Module-level (not per-call) so it survives across every request this
// interceptor sees — several parallel requests can all come back 401
// with SESSION_REPLACED at once (e.g. a page firing multiple API calls
// together), and only the first should pop the dialog; the rest just
// clear/redirect silently once it's already up. Reset after the
// dialog closes so a later, unrelated kickout can show it again.
let sessionReplacedDialogOpen = false;

/** Attaches the JWT to every outgoing request (if we have one), and
 * centrally handles the "session expired / unauthorized" case: if a
 * request comes back 401 while we believed we had a logged-in session,
 * clear it and bounce to /login — instead of every feature having to
 * check for this itself. A 401 on the login/register endpoints (bad
 * credentials, no session yet) is left alone so the calling component
 * can show its normal inline error.
 *
 * A 401 with `code: 'SESSION_REPLACED'` (see JwtStrategy.validate on
 * the backend — one device per login at a time) gets a blocking modal
 * instead of the usual silent toast, since this one needs explaining:
 * the account wasn't just idle too long, it was actively logged in
 * somewhere else. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // /platform-admin/* runs its own entirely separate auth world (see
  // AdminPortalApiService) — it attaches its own Authorization header
  // itself and must never have it overwritten by a tenant token that
  // might also be sitting in this browser, nor trigger this
  // interceptor's tenant-session 401 handling (which would otherwise
  // clear/redirect the UNRELATED tenant session on an admin-portal
  // auth failure).
  if (req.url.includes('/platform-admin')) {
    return next(req);
  }

  const tokenStorage = inject(TokenStorage);
  const router = inject(Router);
  const toast = inject(ToastService);
  const permissions = inject(PermissionsService);
  const confirmDialog = inject(ConfirmService);
  const subscriptionStatus = inject(SubscriptionStatusService);

  const token = tokenStorage.get();
  const authedReq = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  const logoutLocally = (): void => {
    tokenStorage.clear();
    permissions.clear();
    subscriptionStatus.clear();
  };

  return next(authedReq).pipe(
    catchError((error) => {
      // Not a 401 (the account is still validly logged in) — the
      // subscription itself has run out, so this is a 403 from
      // SubscriptionGuard instead. This is purely a backstop: the
      // route guard (subscriptionGuard, re-checked at most every 2
      // minutes — see SubscriptionStatusService) is what's meant to
      // catch this on the very next navigation, but a write/read can
      // slip through in the gap between periodic re-checks, so this
      // interceptor catches it immediately instead of waiting. No
      // dialog here — just mark the cache expired and let the
      // dedicated lock page (reachable for Owner and staff alike) show
      // the actual message, since staff can't reach /billing at all
      // (ownerGuard) and a dialog offering "Go to Billing" would be
      // wrong for them.
      if (error?.status === 403 && error?.error?.code === 'SUBSCRIPTION_EXPIRED') {
        subscriptionStatus.isExpired.set(true);
        if (!router.url.startsWith('/subscription-locked') && !router.url.startsWith('/billing')) {
          router.navigate(['/subscription-locked']);
        }
        return throwError(() => error);
      }

      if (error?.status === 401 && token) {
        const sessionReplaced = error?.error?.code === 'SESSION_REPLACED';

        if (sessionReplaced) {
          logoutLocally();
          if (!sessionReplacedDialogOpen) {
            sessionReplacedDialogOpen = true;
            confirmDialog
              .alert({
                header: 'Logged out',
                message: 'This account was signed in on another device, so you were signed out here.',
              })
              .then(() => {
                sessionReplacedDialogOpen = false;
                router.navigate(['/login']);
              });
          }
        } else {
          logoutLocally();
          toast.warn('Your session has expired. Please log in again.', 'Session expired');
          router.navigate(['/login']);
        }
      }
      return throwError(() => error);
    }),
  );
};
