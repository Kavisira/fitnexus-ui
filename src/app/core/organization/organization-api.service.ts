import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';

export interface OrganizationProfile {
  id: string;
  name: string;
  logoUrl: string | null;
}

/** Thin wrapper over `/api/organization/*`. `mine()` is readable by
 * any logged-in user (display-only identity); the logo upload/remove
 * calls are Owner-only, enforced server-side. */
@Injectable({ providedIn: 'root' })
export class OrganizationApiService {
  private http = inject(HttpClient);
  private base = `${API_BASE_URL}/organization`;

  mine(): Observable<OrganizationProfile> {
    return this.http.get<OrganizationProfile>(`${this.base}/me`);
  }

  uploadLogo(logoDataUrl: string): Observable<OrganizationProfile> {
    return this.http.post<OrganizationProfile>(`${this.base}/logo`, { logoDataUrl });
  }

  removeLogo(): Observable<OrganizationProfile> {
    return this.http.delete<OrganizationProfile>(`${this.base}/logo`);
  }
}
