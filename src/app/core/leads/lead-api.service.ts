import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';

export type LeadStatus = 'NEW' | 'CONTACTED' | 'TRIAL_SCHEDULED' | 'TRIAL_COMPLETED' | 'CONVERTED' | 'LOST';

export interface LeadActivity {
  id: string;
  leadId: string;
  note: string;
  // The follow-up date/time that was set at the moment this note was
  // logged — kept per-entry so the timeline shows what was scheduled at
  // each point in history, not just the lead's current value.
  nextFollowUpAt: string | null;
  createdAt: string;
}

export interface Lead {
  id: string;
  organizationId: string;
  branchId: string;
  // Embedded by the backend on list/detail responses — just enough to
  // display without a second lookup.
  branch?: { id: string; location: string };
  name: string;
  phone: string;
  email: string | null;
  source: string | null;
  interestedPlan: string | null;
  assignedToEmployeeId: string | null;
  // Embedded by the backend on list/detail responses, same pattern as
  // `branch` — just enough (id/name) to display without a second lookup.
  assignedToEmployee?: { id: string; name: string } | null;
  status: LeadStatus;
  lostReason: string | null;
  // Only meaningful when status is CONVERTED — the "Conclude" checkbox's
  // comment for the converted outcome (lostReason plays the same role
  // for the LOST outcome).
  concludeComment: string | null;
  nextFollowUpAt: string | null;
  createdAt: string;
  updatedAt: string;
  // Only present on the single-lead detail response (findOne) — most
  // recent first.
  activities?: LeadActivity[];
}

export interface LeadPayload {
  name: string;
  phone: string;
  email?: string;
  branchId: string;
  source?: string;
  interestedPlan?: string;
  assignedToEmployeeId?: string | null;
  status?: LeadStatus;
  lostReason?: string | null;
  concludeComment?: string | null;
  nextFollowUpAt?: string | null;
}

/** Thin wrapper over the NestJS `/api/leads` endpoints — mirrors
 * BranchApiService. Every call is implicitly scoped to the caller's
 * organization server-side (via the JWT). */
@Injectable({ providedIn: 'root' })
export class LeadApiService {
  private http = inject(HttpClient);
  private base = `${API_BASE_URL}/leads`;

  /** Leads are chain-wide by default — branchId is an optional filter,
   * not a required scope, matching "owners see chain-wide data". */
  list(branchId?: string | null): Observable<Lead[]> {
    let params = new HttpParams();
    if (branchId) {
      params = params.set('branchId', branchId);
    }
    return this.http.get<Lead[]>(this.base, { params });
  }

  get(id: string): Observable<Lead> {
    return this.http.get<Lead>(`${this.base}/${id}`);
  }

  create(payload: LeadPayload): Observable<Lead> {
    return this.http.post<Lead>(this.base, payload);
  }

  update(id: string, payload: Partial<LeadPayload>): Observable<Lead> {
    return this.http.patch<Lead>(`${this.base}/${id}`, payload);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  addActivity(id: string, note: string, nextFollowUpAt?: string | null): Observable<LeadActivity> {
    return this.http.post<LeadActivity>(`${this.base}/${id}/activities`, {
      note,
      ...(nextFollowUpAt ? { nextFollowUpAt } : {}),
    });
  }
}
