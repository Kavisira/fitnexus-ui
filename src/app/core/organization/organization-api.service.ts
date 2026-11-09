import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';

export interface OrganizationProfile {
  id: string;
  name: string;
  logoUrl: string | null;
}

// The full "click your profile" snapshot — everything OrganizationProfile
// has, plus the rest of the org's identity/subscription state. Kept as
// its own interface (rather than widening OrganizationProfile itself)
// since uploadLogo/removeLogo below only ever return the narrower
// shape — this is what mine() returns.
export interface OrganizationFullProfile extends OrganizationProfile {
  ownerName: string;
  email: string;
  phone: string;
  status: 'NOT_ACTIVE' | 'ACTIVE';
  createdAt: string;
  subscriptionTier: 'STARTER' | 'PLUS' | 'GROWTH' | 'PRO' | 'SCALE' | 'ENTERPRISE' | null;
  subscriptionStatus: 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'EXPIRED';
  billingCycle: 'MONTHLY' | 'ANNUAL' | null;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  branchCount: number;
}

/** Thin wrapper over `/api/organization/*`. `mine()` is readable by
 * any logged-in user (display-only identity); the logo upload/remove
 * calls are Owner-only, enforced server-side. */
@Injectable({ providedIn: 'root' })
export class OrganizationApiService {
  private http = inject(HttpClient);
  private base = `${API_BASE_URL}/organization`;

  mine(): Observable<OrganizationFullProfile> {
    return this.http.get<OrganizationFullProfile>(`${this.base}/me`);
  }

  uploadLogo(logoDataUrl: string): Observable<OrganizationProfile> {
    return this.http.post<OrganizationProfile>(`${this.base}/logo`, { logoDataUrl });
  }

  removeLogo(): Observable<OrganizationProfile> {
    return this.http.delete<OrganizationProfile>(`${this.base}/logo`);
  }
}
