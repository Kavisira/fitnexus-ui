import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';

export interface BackendVersion {
  version: string;
  startedAt: string;
}

/** Thin wrapper over the public `/api/version` endpoint — deliberately
 * not behind auth (see VersionController's comment), so this can be
 * called even from the login screen if ever needed. */
@Injectable({ providedIn: 'root' })
export class VersionApiService {
  private http = inject(HttpClient);

  get(): Observable<BackendVersion> {
    return this.http.get<BackendVersion>(`${API_BASE_URL}/version`);
  }
}
