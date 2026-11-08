import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';

export type SubscriptionTier =
  | 'BASIC'
  | 'STARTER'
  | 'PLUS'
  | 'PLUS_PLUS'
  | 'PRO'
  | 'GROWTH'
  | 'GROWTH_PLUS'
  | 'SCALE'
  | 'ENTERPRISE';

export type BillingCycle = 'MONTHLY' | 'ANNUAL';

export interface SubscriptionSummary {
  tier: SubscriptionTier | null;
  status: string;
  billingCycle: BillingCycle | null;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  isExpired: boolean;
}

export interface CheckoutResponse {
  subscriptionSessionId: string;
  cfSubscriptionId: string;
}

export type SubscriptionEventOutcome = 'SUCCESS' | 'FAILED' | 'INFO';
export type SubscriptionEventSource = 'WEBHOOK' | 'SYNC' | 'CHECKOUT';

export interface SubscriptionEvent {
  id: string;
  eventType: string;
  outcome: SubscriptionEventOutcome;
  source: SubscriptionEventSource;
  tier: SubscriptionTier | null;
  billingCycle: BillingCycle | null;
  amountInr: string | null;
  description: string | null;
  createdAt: string;
}

/** Thin wrapper over `/api/billing/*` — matches BillingController
 * exactly. The webhook endpoint has no frontend counterpart (Cashfree
 * calls it directly, server-to-server). */
@Injectable({ providedIn: 'root' })
export class BillingApiService {
  private http = inject(HttpClient);
  private base = `${API_BASE_URL}/billing`;

  status(): Observable<SubscriptionSummary> {
    return this.http.get<SubscriptionSummary>(`${this.base}/status`);
  }

  /** Pulls the subscription's current state straight from Cashfree —
   * called right after the /billing?checkout=return redirect lands,
   * since the push webhook can't reach a local-dev PUBLIC_API_URL
   * (see BillingService.syncFromCashfree on the backend). */
  sync(): Observable<SubscriptionSummary> {
    return this.http.post<SubscriptionSummary>(`${this.base}/sync`, {});
  }

  /** TEST-ONLY — resets the org back to a trial so the checkout flow
   * (or trial-expiry behavior) can be re-run while testing.
   * `days` omitted = a fresh 30-day trial; a small number (1-3) sets
   * it to expire soon so the dashboard countdown can be watched
   * ticking down; 0 or negative backdates it to simulate an
   * already-expired trial instantly. Hard-disabled on the backend
   * once CASHFREE_ENV=PROD (see BillingService.resetToTrial). */
  resetToTrial(days?: number): Observable<SubscriptionSummary> {
    return this.http.post<SubscriptionSummary>(`${this.base}/reset-trial`, days !== undefined ? { days } : {});
  }

  /** The org's full billing/payment history — invoice list + audit
   * trail, newest first. Never includes resetToTrial activity — see
   * BillingService.history on the backend. */
  history(): Observable<SubscriptionEvent[]> {
    return this.http.get<SubscriptionEvent[]>(`${this.base}/history`);
  }

  checkout(tier: SubscriptionTier, billingCycle: BillingCycle): Observable<CheckoutResponse> {
    // Sent so the backend can send Cashfree's post-payment return_url
    // back to wherever this checkout actually started (localhost
    // during local dev, the real domain in production) instead of one
    // hardcoded URL — see BillingService.checkout, which only honors
    // this when it matches the server's own CORS allowlist.
    return this.http.post<CheckoutResponse>(`${this.base}/checkout`, {
      tier,
      billingCycle,
      returnOrigin: window.location.origin,
    });
  }
}
