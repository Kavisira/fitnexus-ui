import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';
import { PlanDuration } from '../plans/plan-api.service';
import { OfferType } from '../offers/offer-api.service';
import { Gender } from '../constants/genders';
import { BmiStatus } from '../constants/bmi';

export type MemberStatus = 'ACTIVE' | 'INACTIVE';
export type PtDuration = 'MONTHLY' | 'QUARTERLY' | 'HALF_YEARLY' | 'YEARLY';

export interface MemberMetricEntry {
  id: string;
  memberId: string;
  recordedAt: string;
  weightKg: string; // Prisma Decimal serializes as a string
  chestCm: string | null;
  waistCm: string | null;
  hipsCm: string | null;
  armsCm: string | null;
  thighCm: string | null;
  calfCm: string | null;
  shouldersCm: string | null;
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
  armsCm?: number;
  thighCm?: number;
  calfCm?: number;
  shouldersCm?: number;
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
  photoUrl: string | null;
  source: string | null;
  planId: string | null;
  plan?: { id: string; name: string; price: string; duration: PlanDuration } | null;
  offerId: string | null;
  offer?: { id: string; name: string; type: OfferType; percentValue: string | null; flatAmount: string | null; extraMonths: number | null } | null;
  assignedTrainerEmployeeId: string | null;
  assignedTrainerEmployee?: { id: string; name: string } | null;

  // Personal Training add-on — see schema.prisma's
  // Member.hasPersonalTrainer doc comment. ptEndDate/ptTotal are
  // always server-computed, never sent in a payload.
  hasPersonalTrainer: boolean;
  ptDuration: PtDuration | null;
  ptRatePerMonth: string | null;
  ptStartDate: string | null;
  ptEndDate: string | null;
  ptTotal: string | null;

  preferredLanguage: string;
  paymentMode: string | null;

  // Partial-payment capture — amountPaid null means "fully paid" (see
  // the Member.amountPaid doc comment in schema.prisma); balanceDue is
  // always price - (amountPaid ?? price), computed client-side where
  // needed rather than sent separately.
  amountPaid: string | null;
  paymentFollowUpDate: string | null;
  notifyMemberOnPaymentDue: boolean;
  notifyGymOnPaymentDue: boolean;

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
  photoDataUrl?: string;
  source?: string;
  planId: string;
  offerId?: string;
  assignedTrainerEmployeeId?: string;

  // Personal Training add-on — hasPersonalTrainer: true requires
  // assignedTrainerEmployeeId above plus ptDuration/ptRatePerMonth;
  // ptStartDate is optional (server defaults it — see
  // CreateMemberDto/UpdateMemberDto server-side).
  hasPersonalTrainer?: boolean;
  ptDuration?: PtDuration;
  ptRatePerMonth?: number;
  ptStartDate?: string;

  preferredLanguage?: string;
  paymentMode?: string;

  // Partial-payment capture — omitted amountPaid means "paid in full".
  amountPaid?: number;
  paymentFollowUpDate?: string;
  notifyMemberOnPaymentDue?: boolean;
  notifyGymOnPaymentDue?: boolean;

  // The "Settle balance" checkbox in the edit flow — sent only on a
  // PATCH, not create. When true the server ignores amountPaid/
  // paymentFollowUpDate above and clears the balance itself; see
  // UpdateMemberDto.settleBalance server-side.
  settleBalance?: boolean;

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

  // Optional initial check-in, captured in the wizard's measurements
  // step — see CreateMemberDto's matching fields server-side.
  weightKg?: number;
  chestCm?: number;
  waistCm?: number;
  hipsCm?: number;
  armsCm?: number;
  thighCm?: number;
  calfCm?: number;
  shouldersCm?: number;
  metricPhotoDataUrl?: string;
}

export interface MemberFilters {
  // Multi-select filter panel — 0+ branches/statuses; empty/undefined = no filter.
  branchIds?: string[] | null;
  statuses?: MemberStatus[] | null;
  // Personal Training filter — undefined/null = no filter (both PT and
  // non-PT members); true/false narrows to just one.
  hasPersonalTrainer?: boolean | null;
  search?: string | null;
  page?: number;
  pageSize?: number;
}

export interface MemberListResult {
  data: Member[];
  total: number;
  page: number;
  pageSize: number;
}

// ---- Bulk import (CSV) — see the Members page's import dialog. ----

export interface ImportedMemberRowData {
  name: string;
  phone: string;
  email?: string;
  dateOfBirth?: string;
  gender?: string;
  bloodGroup?: string;
  heightCm?: number;
  goalWeightKg?: number;
  startDate?: string;
  status?: string;
  source?: string;
  paymentMode?: string;
}

export interface ImportedMemberRow {
  rowNumber: number;
  data: ImportedMemberRowData;
  errors: string[];
}

export interface ImportCommitResultRow {
  rowNumber: number;
  success: boolean;
  memberId?: string;
  error?: string;
}

/** Thin wrapper over the NestJS `/api/members` endpoints — mirrors
 * PlanApiService/OfferApiService. Every call is implicitly scoped to the
 * caller's organization (and, for staff users, their own branch)
 * server-side. */
@Injectable({ providedIn: 'root' })
export class MemberApiService {
  private http = inject(HttpClient);
  private base = `${API_BASE_URL}/members`;

  list(filters?: MemberFilters): Observable<MemberListResult> {
    let params = new HttpParams();
    if (filters?.branchIds && filters.branchIds.length > 0) params = params.set('branchId', filters.branchIds.join(','));
    if (filters?.statuses && filters.statuses.length > 0) params = params.set('status', filters.statuses.join(','));
    if (filters?.hasPersonalTrainer !== undefined && filters?.hasPersonalTrainer !== null) {
      params = params.set('hasPersonalTrainer', String(filters.hasPersonalTrainer));
    }
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.page) params = params.set('page', String(filters.page));
    if (filters?.pageSize) params = params.set('pageSize', String(filters.pageSize));
    return this.http.get<MemberListResult>(this.base, { params });
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

  // Downloadable PDF invoice — built server-side from the member's
  // MemberPayment ledger (see MembersController's invoice/pdf route).
  // 400s if no payment has been recorded yet (trial members, or a
  // member created but not yet paid) — callers should hide/disable
  // the download action in that case rather than relying on this call
  // failing gracefully.
  downloadInvoicePdf(memberId: string): Observable<Blob> {
    return this.http.get(`${this.base}/${memberId}/invoice/pdf`, { responseType: 'blob' });
  }

  // ---- Bulk import (CSV) ----

  parseImportCsv(branchId: string, csvContent: string): Observable<{ rows: ImportedMemberRow[] }> {
    return this.http.post<{ rows: ImportedMemberRow[] }>(`${this.base}/import/parse`, { branchId, csvContent });
  }

  commitImport(rows: MemberPayload[]): Observable<{ results: ImportCommitResultRow[] }> {
    return this.http.post<{ results: ImportCommitResultRow[] }>(`${this.base}/import/commit`, { rows });
  }
}
