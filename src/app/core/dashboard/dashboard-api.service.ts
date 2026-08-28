import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';

export interface SeriesPoint {
  label: string;
  count?: number;
  amount?: number;
}

export interface GroupSum {
  key: string;
  value: number;
}

export interface BranchBreakdownRow {
  branchId: string;
  location: string;
  currency: string;
  activeMembers: number;
  revenueThisMonth: number;
  expensesThisMonth: number;
}

export interface AnalyticsSummary {
  view: 'ANALYTICS';
  organization: {
    name: string;
    totalBranches: number;
    totalEmployees: number;
    activeEmployees: number;
  };
  members: {
    activeCount: number;
    newThisMonth: number;
    expiringIn7: number;
    expiringIn30: number;
    signupSeries: SeriesPoint[];
  };
  finance: {
    revenueThisMonth: number;
    expensesThisMonth: number;
    netProfitThisMonth: number;
    revenueSeries: SeriesPoint[];
    expenseSeries: SeriesPoint[];
    netProfitSeries: SeriesPoint[];
    revenueByPlan: GroupSum[];
    expensesByCategory: GroupSum[];
  };
  leads: {
    total: number;
    newThisMonth: number;
    conversionRate: number;
    byStatus: GroupSum[];
  };
  branchBreakdown: BranchBreakdownRow[];
}

export interface BmiHighlight {
  id: string;
  name: string;
  bmi: number;
  bmiStatus: string;
}

export interface FollowUp {
  id: string;
  name: string;
  phone: string;
  status: string;
  nextFollowUpAt: string | null;
}

export interface OpsSummary {
  view: 'OPS';
  todaysCheckins: number;
  expiringSoon: number;
  bmiHighlights: BmiHighlight[];
  followUps: FollowUp[];
}

export type DashboardSummary = AnalyticsSummary | OpsSummary;

/** Thin wrapper over `/api/dashboard/summary` — the backend picks
 * ANALYTICS vs OPS shape based on the caller's role (see
 * DashboardService), so there's nothing role-specific to pass here. */
@Injectable({ providedIn: 'root' })
export class DashboardApiService {
  private http = inject(HttpClient);
  private base = `${API_BASE_URL}/dashboard`;

  summary(branchId?: string | null): Observable<DashboardSummary> {
    let params = new HttpParams();
    if (branchId) {
      params = params.set('branchId', branchId);
    }
    return this.http.get<DashboardSummary>(`${this.base}/summary`, { params });
  }
}
