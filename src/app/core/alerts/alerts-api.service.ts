import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';

export type AlertAudienceType = 'ALL' | 'BRANCH' | 'USER';

export interface Alert {
  id: string;
  organizationId: string;
  title: string;
  message: string;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  audienceType: AlertAudienceType;
  audienceBranchId: string | null;
  audienceBranch?: { id: string; location: string } | null;
  audienceUserId: string | null;
  audienceUser?: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface AlertPayload {
  title: string;
  message: string;
  startDate: string;
  endDate?: string | null;
  isActive?: boolean;
  audienceType?: AlertAudienceType;
  audienceBranchId?: string | null;
  audienceUserId?: string | null;
}

export interface AssignableTargets {
  branches: { id: string; location: string }[];
  users: { id: string; name: string; role: string }[];
}

/** Thin wrapper over `/api/alerts/*`. Admin routes (list/create/update/
 * remove/assignable-targets) are Owner-only, enforced server-side.
 * `pending`/`dismiss` are available to any logged-in user — that's the
 * login-popup flow. */
@Injectable({ providedIn: 'root' })
export class AlertsApiService {
  private http = inject(HttpClient);
  private base = `${API_BASE_URL}/alerts`;

  list(): Observable<Alert[]> {
    return this.http.get<Alert[]>(this.base);
  }

  assignableTargets(): Observable<AssignableTargets> {
    return this.http.get<AssignableTargets>(`${this.base}/assignable-targets`);
  }

  create(payload: AlertPayload): Observable<Alert> {
    return this.http.post<Alert>(this.base, payload);
  }

  update(id: string, payload: Partial<AlertPayload>): Observable<Alert> {
    return this.http.patch<Alert>(`${this.base}/${id}`, payload);
  }

  remove(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.base}/${id}`);
  }

  pending(): Observable<Alert[]> {
    return this.http.get<Alert[]>(`${this.base}/pending`);
  }

  dismiss(id: string): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${this.base}/${id}/dismiss`, {});
  }
}
