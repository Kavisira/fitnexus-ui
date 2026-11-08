import { Injectable, inject, signal } from '@angular/core';
import { Observable, of, map, tap, catchError } from 'rxjs';

import { BillingApiService } from '../billing/billing-api.service';

/** In-memory cache of "is this org's subscription currently expired",
 * backing the hard-lockout route guard (see subscriptionGuard in
 * auth.guard.ts). Re-fetches /billing/status at most once every
 * REFRESH_MS rather than on every single navigation, but still
 * refreshes often enough to catch an org expiring mid-session (not
 * just at next login) — see the "insist to pay" hard-lockout design
 * discussion this was built for.
 *
 * Deliberately separate from PermissionsService's own cache — this is
 * billing state, not the role/screen permission matrix, and the two
 * invalidate on entirely different events (a billing action vs. a
 * role change). */
@Injectable({ providedIn: 'root' })
export class SubscriptionStatusService {
  private billingApi = inject(BillingApiService);

  private loaded = false;
  private loadedAt = 0;
  private readonly REFRESH_MS = 2 * 60 * 1000;

  readonly isExpired = signal(false);

  /** Returns the cached value when it's still fresh, otherwise fetches
   * /billing/status first. Fails OPEN on a network hiccup — never lock
   * someone out of the app just because this one status check's
   * request failed (same reasoning as firstBranchGuard's catchError). */
  ensureLoaded(): Observable<boolean> {
    if (this.loaded && Date.now() - this.loadedAt < this.REFRESH_MS) {
      return of(this.isExpired());
    }
    return this.billingApi.status().pipe(
      tap((summary) => {
        this.isExpired.set(summary.isExpired);
        this.loaded = true;
        this.loadedAt = Date.now();
      }),
      map(() => this.isExpired()),
      catchError(() => of(this.isExpired())),
    );
  }

  /** Forces the next ensureLoaded() call to re-fetch rather than use
   * the cached value — call this right after a billing action
   * (checkout/sync/reset-trial) completes, so the very next navigation
   * reflects the new state instead of waiting out REFRESH_MS. */
  invalidate(): void {
    this.loaded = false;
  }

  /** Resets to the logged-out default — called on logout/session
   * replacement, same spots that already call PermissionsService.clear(). */
  clear(): void {
    this.loaded = false;
    this.isExpired.set(false);
  }
}
