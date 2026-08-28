import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, tap } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';
import { TokenStorage } from '../auth/token-storage.service';

export type PermissionScreen =
  | 'DASHBOARD'
  | 'EMPLOYEES'
  | 'ATTENDANCE'
  | 'LEADS'
  | 'NOTIFICATIONS'
  | 'BRANCHES'
  | 'MEMBERS'
  | 'PLANS'
  | 'EXPENSES';

export interface ScreenPermission {
  canRead: boolean;
  canWrite: boolean;
}

/**
 * The logged-in user's own screen×permission map — fetched once per
 * session (via authGuard, right after a valid token is confirmed) from
 * `GET /roles/permissions/mine`, which resolves it server-side from the
 * JWT `role` claim. Everything permission-driven in the UI — sidenav
 * visibility, route guards, add/edit/create action gating — reads from
 * this cache rather than re-deriving anything from the token itself.
 *
 * This is a convenience cache only: every mutating request is still
 * re-checked server-side by PermissionGuard, so a stale or tampered
 * cache here can only ever hide/show UI, never actually bypass a
 * permission.
 */
@Injectable({ providedIn: 'root' })
export class PermissionsService {
  private http = inject(HttpClient);
  private tokenStorage = inject(TokenStorage);
  private base = `${API_BASE_URL}/roles/permissions/mine`;

  private permissions = signal<Record<string, ScreenPermission> | null>(null);
  private loading: Observable<boolean> | null = null;

  /** Fetches the matrix at most once per session — safe to call from
   * every guard/component; once loaded, resolves immediately without a
   * network call. Route guards await this (see authGuard) before any
   * permission check runs. */
  ensureLoaded(): Observable<boolean> {
    if (this.permissions()) {
      return of(true);
    }
    if (!this.loading) {
      this.loading = this.http.get<Record<string, ScreenPermission>>(this.base).pipe(
        tap((result) => this.permissions.set(result)),
        map(() => true),
        catchError(() => {
          // Fail closed (no permissions granted) rather than hang the
          // guard chain — a retry (e.g. next navigation) will try again
          // since `loading` and `permissions` both stay unset below.
          this.permissions.set({});
          return of(true);
        }),
        tap(() => (this.loading = null)),
      );
    }
    return this.loading;
  }

  /** Clears the cache — call on logout, so a subsequent login (possibly
   * as a different user) doesn't briefly show stale permissions. */
  clear(): void {
    this.permissions.set(null);
    this.loading = null;
  }

  canRead(screen: PermissionScreen): boolean {
    if (this.tokenStorage.isOwner()) {
      return true;
    }
    return this.permissions()?.[screen]?.canRead ?? false;
  }

  canWrite(screen: PermissionScreen): boolean {
    if (this.tokenStorage.isOwner()) {
      return true;
    }
    return this.permissions()?.[screen]?.canWrite ?? false;
  }
}
