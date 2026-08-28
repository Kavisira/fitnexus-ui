import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';

// Staff roles the permission matrix governs — OWNER always has full
// access and never appears here (see RolesService.can on the backend).
export type StaffRole = 'BRANCH_MANAGER' | 'TRAINER' | 'FRONT_DESK';

export type PermissionScreen =
  | 'DASHBOARD'
  | 'EMPLOYEES'
  | 'ATTENDANCE'
  | 'LEADS'
  | 'NOTIFICATIONS'
  | 'BRANCHES'
  | 'MEMBERS'
  | 'PLANS'
  | 'EXPENSES';

export interface RolePermission {
  id: string;
  organizationId: string;
  role: StaffRole;
  screen: PermissionScreen;
  canRead: boolean;
  canWrite: boolean;
}

/** Thin wrapper over `/api/roles/permissions` — the editable role x
 * screen matrix (see RolesService on the backend). */
@Injectable({ providedIn: 'root' })
export class RolePermissionApiService {
  private http = inject(HttpClient);
  private base = `${API_BASE_URL}/roles/permissions`;

  list(): Observable<RolePermission[]> {
    return this.http.get<RolePermission[]>(this.base);
  }

  update(role: StaffRole, screen: PermissionScreen, canRead: boolean, canWrite: boolean): Observable<RolePermission> {
    return this.http.patch<RolePermission>(this.base, { role, screen, canRead, canWrite });
  }
}
