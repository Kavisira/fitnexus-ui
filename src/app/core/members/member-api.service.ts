import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';
import { PlanDuration } from '../plans/plan-api.service';
import { OfferType } from '../offers/offer-api.service';
import { Gender } from '../constants/genders';
import { BmiStatus } from '../constants/bmi';

export type MemberStatus = 'ACTIVE' | 'INACTIVE';

export interface MemberMetricEntry {
  id: string;
  memberId: string;
  recordedAt: string;
  weightKg: string; // Prisma Decimal serializes as a string
  chestCm: string | null;
  waistCm: string | null;
  hipsCm: string | null;
  bmi: string;
  bmiStatus: BmiStatus;
  // A progress photo, stored as a base64 data URL (see members.ts —
  // compressed client-side before upload). Optional.
  photoUrl: string | null;
  createdAt: string;
}

export interface MetricEntryPayload {
  weightKg: number;
  chestCm?: number;
  waistCm?: number;
  hipsCm?: number;
  recordedAt?: string;
  photoDataUrl?: string;
}

export interface Member {
  id: string;
  organizationId: string;
  branchId: string;
  branch?: { id: string; location: string; currency: string; taxRatePercent: string };
  name: string;
  phone: string;
  email: string | null;
  source: string | null;
  planId: string | null;
  plan?: { id: string; name: string; price: string; duration: PlanDuration } | null;
  offerId: string | null;
  offer?: { id: string; name: string; type: OfferType; percentValue: string | null; flatAmount: string | null; extraMonths: number | null } | null;
  assignedTrainerEmployeeId: string | null;
  assignedTrainerEmployee?: { id: string; name: string } | null;
  preferredLanguage: string;
  paymentMode: string | null;
  isTrial: boolean;
  startDate: string;
  endDate: string;
  price: string; // Prisma Decimal serializes as a string
  status: MemberStatus;
  partnerMemberId: string | null;

  // Health profile — all optional.
  dateOfBirth: string | null;
  gender: Gender | null;
  bloodGroup: string | null;
  heightCm: string | null;
  goalWeightKg: string | null;
  // Only the most recent check-in — see MEMBER_INCLUDE server-side.
  // The full history is fetched separately via listMetrics().
  metricEntries?: MemberMetricEntry[];

  createdAt: string;
  updatedAt: string;
}

export interface PartnerMemberPayload {
  name: string;
  phone: string;
  email?: string;
}

export interface MemberPayload {
  branchId: string;
  name: string;
  phone: string;
  email?: string;
  source?: string;
  planId: string;
  offerId?: string;
  assignedTrainerEmployeeId?: string;
  preferredLanguage?: string;
  paymentMode?: string;
  isTrial?: boolean;
  startDate: string;
  status?: MemberStatus;
  // Only meaningful when the selected offer is type COUPLE — mutually
  // exclusive, exactly one required in that case.
  partnerNew?: PartnerMemberPayload;
  partnerMemberId?: string;

  dateOfBirth?: string;
  gender?: Gender;
  bloodGroup?: string;
  heightCm?: number;
  goalWeightKg?: number;
}

export interface MemberFilters {
  branchId?: string | null;
  status?: MemberStatus | null;
  search?: string | null;
}

/** Thin wrapper over the NestJS `/api/members` endpoints — mirrors
 * PlanApiService/OfferApiService. Every call is implicitly scoped to the
 * caller's organization (and, for staff users, their own branch)
 * server-side. */
@Injectable({ providedIn: 'root' })
export class MemberApiService {
  private http = inject(HttpClient);
  private base = `${API_BASE_URL}/members`;

  list(filters?: MemberFilters): Observable<Member[]> {
    let params = new HttpParams();
    if (filters?.branchId) params = params.set('branchId', filters.branchId);
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.search) params = params.set('search', filters.search);
    return this.http.get<Member[]>(this.base, { params });
  }

  get(id: string): Observable<Member> {
    return this.http.get<Member>(`${this.base}/${id}`);
  }

  create(payload: MemberPayload): Observable<Member> {
    return this.http.post<Member>(this.base, payload);
  }

  update(id: string, payload: Partial<MemberPayload>): Observable<Member> {
    return this.http.patch<Member>(`${this.base}/${id}`, payload);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  addMetricEntry(memberId: string, payload: MetricEntryPayload): Observable<MemberMetricEntry> {
    return this.http.post<MemberMetricEntry>(`${this.base}/${memberId}/metrics`, payload);
  }

  listMetricEntries(memberId: string): Observable<MemberMetricEntry[]> {
    return this.http.get<MemberMetricEntry[]>(`${this.base}/${memberId}/metrics`);
  }
}
