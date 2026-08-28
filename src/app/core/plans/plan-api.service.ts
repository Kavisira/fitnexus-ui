import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';

export type PlanDuration = 'MONTHLY' | 'QUARTERLY' | 'ANNUAL' | 'CLASS_PACK' | 'DROP_IN';

export interface Plan {
  id: string;
  organizationId: string;
  branchId: string;
  // Embedded by the backend on every response — includes currency and
  // tax rate since a plan's price is always shown/entered in its
  // branch's currency and taxed at its branch's rate (there's no
  // separate currency/tax field on the plan itself).
  branch?: { id: string; location: string; currency: string; taxRatePercent: string };
  name: string;
  price: string; // Prisma Decimal serializes as a string over HTTP
  duration: PlanDuration;
  createdAt: string;
  updatedAt: string;
}

export interface PlanPayload {
  branchId: string;
  name: string;
  price: number;
  duration: PlanDuration;
}

/** Thin wrapper over the NestJS `/api/plans` endpoints — mirrors
 * BranchApiService/LeadApiService. Every call is implicitly scoped to
 * the caller's organization server-side (via the JWT). */
@Injectable({ providedIn: 'root' })
export class PlanApiService {
  private http = inject(HttpClient);
  private base = `${API_BASE_URL}/plans`;

  list(branchId?: string | null): Observable<Plan[]> {
    let params = new HttpParams();
    if (branchId) {
      params = params.set('branchId', branchId);
    }
    return this.http.get<Plan[]>(this.base, { params });
  }

  get(id: string): Observable<Plan> {
    return this.http.get<Plan>(`${this.base}/${id}`);
  }

  create(payload: PlanPayload): Observable<Plan> {
    return this.http.post<Plan>(this.base, payload);
  }

  update(id: string, payload: Partial<PlanPayload>): Observable<Plan> {
    return this.http.patch<Plan>(`${this.base}/${id}`, payload);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
