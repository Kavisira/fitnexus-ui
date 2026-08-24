import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { TokenStorage } from './token-storage.service';
import { ToastService } from '../toast/toast.service';
import { PermissionsService } from '../roles/permissions.service';

/** Attaches the JWT to every outgoing request (if we have one), and
 * centrally handles the "session expired / unauthorized" case: if a
 * request comes back 401 while we believed we had a logged-in session,
 * clear it and bounce to /login with a toast — instead of every
 * feature having to check for this itself. A 401 on the login/register
 * endpoints (bad credentials, no session yet) is left alone so the
 * calling component can show its normal inline error. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenStorage = inject(TokenStorage);
  const router = inject(Router);
  const toast = inject(ToastService);
  const permissions = inject(PermissionsService);

  const token = tokenStorage.get();
  const authedReq = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(authedReq).pipe(
    catchError((error) => {
      if (error?.status === 401 && token) {
        tokenStorage.clear();
        permissions.clear();
        toast.warn('Your session has expired. Please log in again.', 'Session expired');
        router.navigate(['/login']);
      }
      return throwError(() => error);
    }),
  );
};
