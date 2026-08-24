import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';

export type BranchStatus = 'ACTIVE' | 'INACTIVE';

export interface Branch {
  id: string;
  organizationId: string;
  // The branch's identifying field — free text ("12 MG Road, Chennai,
  // Tamil Nadu, India"). There's no separate name field.
  location: string;
  // Extra free-text detail, fully separate from location — always optional.
  address: string | null;
  phone: string | null;
  email: string | null;
  timezone: string;
  currency: string;
  taxRatePercent: string; // Prisma Decimal serializes as a string over HTTP
  defaultLanguage: string;
  status: BranchStatus;
  isMainBranch: boolean;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface BranchPayload {
  location: string;
  address?: string;
  phone?: string;
  email?: string;
  timezone?: string;
  currency?: string;
  taxRatePercent: number;
  defaultLanguage?: string;
  status?: BranchStatus;
  isMainBranch?: boolean;
  memberCount: number;
}

/** Thin wrapper over the NestJS `/api/branches` endpoints — every call
 * is implicitly scoped to the caller's organization server-side (via
 * the JWT), so there's no organizationId to pass here. */
@Injectable({ providedIn: 'root' })
export class BranchApiService {
  private http = inject(HttpClient);
  private base = `${API_BASE_URL}/branches`;

  list(): Observable<Branch[]> {
    return this.http.get<Branch[]>(this.base);
  }

  create(payload: BranchPayload): Observable<Branch> {
    return this.http.post<Branch>(this.base, payload);
  }

  update(id: string, payload: Partial<BranchPayload>): Observable<Branch> {
    return this.http.patch<Branch>(`${this.base}/${id}`, payload);
  }

  deactivate(id: string): Observable<Branch> {
    return this.http.delete<Branch>(`${this.base}/${id}`);
  }

  activate(id: string): Observable<Branch> {
    return this.http.patch<Branch>(`${this.base}/${id}/activate`, {});
  }
}
