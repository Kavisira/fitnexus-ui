import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';

export type OfferType = 'PERCENT_DISCOUNT' | 'FLAT_DISCOUNT' | 'EXTRA_DURATION' | 'COUPLE';

/** Independent, org-wide offer — not attached to any plan or branch.
 * Any offer can be applied to any plan when a member signs up (that
 * step lives in the Members module, not built yet). */
export interface Offer {
  id: string;
  organizationId: string;
  name: string;
  type: OfferType;
  percentValue: string | null; // Prisma Decimal serializes as a string
  flatAmount: string | null;
  extraMonths: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OfferPayload {
  name: string;
  type: OfferType;
  percentValue?: number;
  flatAmount?: number;
  extraMonths?: number;
  isActive?: boolean;
}

/** Thin wrapper over `/api/offers` — the org-wide discount/promo
 * catalog. Definitions only for now; applying one to an actual member
 * signup needs the Members module. */
@Injectable({ providedIn: 'root' })
export class OfferApiService {
  private http = inject(HttpClient);
  private base = `${API_BASE_URL}/offers`;

  list(): Observable<Offer[]> {
    return this.http.get<Offer[]>(this.base);
  }

  create(payload: OfferPayload): Observable<Offer> {
    return this.http.post<Offer>(this.base, payload);
  }

  update(id: string, payload: Partial<OfferPayload>): Observable<Offer> {
    return this.http.patch<Offer>(`${this.base}/${id}`, payload);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
