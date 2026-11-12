import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

import { API_BASE_URL } from '../config/api.config';
import { AdminPortalTokenStorage } from './admin-portal-token-storage.service';

export type PlatformExpenseCategory =
  | 'HOSTING'
  | 'SERVER'
  | 'DATABASE'
  | 'MARKETING'
  | 'DEVELOPMENT'
  | 'WHATSAPP'
  | 'PAYMENT_GATEWAY'
  | 'OTHER';

export type PlatformExpenseFrequency = 'ONE_TIME' | 'MONTHLY' | 'ANNUAL';

export interface PlatformExpense {
  id: string;
  category: PlatformExpenseCategory;
  label: string;
  amountInr: string;
  frequency: PlatformExpenseFrequency;
  incurredAt: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PlatformExpenseInput {
  category: PlatformExpenseCategory;
  label: string;
  amountInr: number;
  frequency: PlatformExpenseFrequency;
  incurredAt: string;
  notes?: string;
}

export interface PlatformOverview {
  totalOrganizations: number;
  byStatus: Record<string, number>;
  byTier: Record<string, number>;
  bySubscriptionStatus: Record<string, number>;
  signupsLast30Days: number;
  signupsLast7Days: number;
  signupWowDeltaPct: number;
  signupTrend: { date: string; count: number }[];
  checkoutFunnel: { started: number; failed: number; converted: number };
  mrrInr: number;
  mrrByTier: Record<string, number>;
  activePayingByTier: Record<string, number>;
  trialingByTier: Record<string, number>;
  arpaInr: number;
  activePayingCount: number;
  trialingCount: number;
  trialToPaidRate: number | null;
  churnedLast30Days: number;
  monthlyRecurringExpenseInr: number;
  totalOneTimeExpenseInr: number;
  monthlyProfitInr: number;
  expenseByCategory: Record<string, number>;
  recentOrganizations: {
    id: string;
    name: string;
    ownerName: string;
    email: string;
    status: string;
    subscriptionTier: string | null;
    subscriptionStatus: string;
    createdAt: string;
    branchCount: number;
    memberCount: number;
    employeeCount: number;
  }[];
}

export interface PlatformOrganizationDetail {
  id: string;
  name: string;
  ownerName: string;
  email: string;
  status: string;
  subscriptionTier: string | null;
  subscriptionStatus: string;
  billingCycle: string;
  createdAt: string;
  branchCount: number;
  memberCount: number;
  employeeCount: number;
}

export interface PlatformCheckoutEventDetail {
  id: string;
  eventType: string;
  createdAt: string;
  organizationId: string | null;
  organizationName: string | null;
  ownerName: string | null;
  email: string | null;
  subscriptionStatus: string | null;
}

/** Thin wrapper over `/api/platform-admin/*`. Deliberately bypasses the
 * app's normal auth interceptor (which attaches the TENANT token) —
 * this service attaches the separate platform-admin token itself on
 * every call, so the two auth worlds never cross. */
@Injectable({ providedIn: 'root' })
export class AdminPortalApiService {
  private http = inject(HttpClient);
  private tokenStorage = inject(AdminPortalTokenStorage);
  private base = `${API_BASE_URL}/platform-admin`;

  login(email: string, password: string): Observable<{ accessToken: string; email: string }> {
    return this.http
      .post<{ accessToken: string; email: string }>(`${this.base}/auth/login`, { email, password })
      .pipe(tap((res) => this.tokenStorage.set(res.accessToken)));
  }

  overview(): Observable<PlatformOverview> {
    return this.http.get<PlatformOverview>(`${this.base}/overview`, { headers: this.authHeaders() });
  }

  listExpenses(): Observable<PlatformExpense[]> {
    return this.http.get<PlatformExpense[]>(`${this.base}/expenses`, { headers: this.authHeaders() });
  }

  createExpense(input: PlatformExpenseInput): Observable<PlatformExpense> {
    return this.http.post<PlatformExpense>(`${this.base}/expenses`, input, { headers: this.authHeaders() });
  }

  updateExpense(id: string, input: PlatformExpenseInput): Observable<PlatformExpense> {
    return this.http.put<PlatformExpense>(`${this.base}/expenses/${id}`, input, { headers: this.authHeaders() });
  }

  deleteExpense(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/expenses/${id}`, { headers: this.authHeaders() });
  }

  /** Detail-list drill-down for a clickable KPI card or breakdown row.
   * segment: 'all' | 'signups7' | 'signups30' | 'trialing' |
   * 'activePaying' | 'churned30' | 'status:<X>' | 'tier:<X>'|'tier:UNSET' | 'substatus:<X>'. */
  organizationsBySegment(segment: string): Observable<PlatformOrganizationDetail[]> {
    return this.http.get<PlatformOrganizationDetail[]>(`${this.base}/organizations`, {
      headers: this.authHeaders(),
      params: { segment },
    });
  }

  /** Detail-list drill-down for the checkout funnel card. */
  checkoutEventsByOutcome(outcome: 'started' | 'failed' | 'converted'): Observable<PlatformCheckoutEventDetail[]> {
    return this.http.get<PlatformCheckoutEventDetail[]>(`${this.base}/checkout-events`, {
      headers: this.authHeaders(),
      params: { outcome },
    });
  }

  private authHeaders(): HttpHeaders {
    const token = this.tokenStorage.get();
    return new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {});
  }
}
