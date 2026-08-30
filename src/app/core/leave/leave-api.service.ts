import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';

export type LeaveType = 'CASUAL' | 'SICK' | 'EARNED';
export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type LeaveRole = 'BRANCH_MANAGER' | 'TRAINER' | 'FRONT_DESK';

export interface LeaveBalanceRow {
  leaveType: LeaveType;
  balance: number;
}

export interface LeaveRequest {
  id: string;
  organizationId: string;
  branchId: string;
  branch?: { id: string; location: string };
  employeeId: string;
  employee?: { id: string; name: string; photoUrl: string | null };
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  days: string; // Prisma Decimal serializes as a string over HTTP
  reason: string | null;
  status: LeaveStatus;
  approverUserId: string | null;
  decisionNote: string | null;
  decidedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApplyLeavePayload {
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  reason?: string;
}

export interface LeaveAllocationConfig {
  id: string;
  organizationId: string;
  role: LeaveRole;
  leaveType: LeaveType;
  monthlyAllocation: string;
  carryForwardCap: string;
  updatedAt: string;
}

export interface UpsertAllocationConfigPayload {
  role: LeaveRole;
  leaveType: LeaveType;
  monthlyAllocation: number;
  carryForwardCap: number;
}

/** Thin wrapper over `/api/leave/*`. Self-service calls (myBalance,
 * myRequests, apply, cancel) work for any staff login regardless of
 * the LEAVES permission — same as Dashboard being always readable.
 * Approver-side calls (teamRequests, approve, reject) and allocation
 * config require LEAVES read/write respectively, enforced server-side. */
@Injectable({ providedIn: 'root' })
export class LeaveApiService {
  private http = inject(HttpClient);
  private base = `${API_BASE_URL}/leave`;

  myBalance(): Observable<LeaveBalanceRow[]> {
    return this.http.get<LeaveBalanceRow[]>(`${this.base}/balance`);
  }

  myRequests(): Observable<LeaveRequest[]> {
    return this.http.get<LeaveRequest[]>(`${this.base}/requests/mine`);
  }

  apply(payload: ApplyLeavePayload): Observable<LeaveRequest> {
    return this.http.post<LeaveRequest>(`${this.base}/requests`, payload);
  }

  cancelMine(id: string): Observable<LeaveRequest> {
    return this.http.delete<LeaveRequest>(`${this.base}/requests/${id}`);
  }

  teamRequests(filters: { status?: LeaveStatus; branchId?: string } = {}): Observable<LeaveRequest[]> {
    let params = new HttpParams();
    if (filters.status) params = params.set('status', filters.status);
    if (filters.branchId) params = params.set('branchId', filters.branchId);
    return this.http.get<LeaveRequest[]>(`${this.base}/requests/team`, { params });
  }

  approve(id: string, decisionNote?: string): Observable<LeaveRequest> {
    return this.http.patch<LeaveRequest>(`${this.base}/requests/${id}/approve`, { decisionNote });
  }

  reject(id: string, decisionNote?: string): Observable<LeaveRequest> {
    return this.http.patch<LeaveRequest>(`${this.base}/requests/${id}/reject`, { decisionNote });
  }

  listConfig(): Observable<LeaveAllocationConfig[]> {
    return this.http.get<LeaveAllocationConfig[]>(`${this.base}/config`);
  }

  upsertConfig(payload: UpsertAllocationConfigPayload): Observable<LeaveAllocationConfig> {
    return this.http.post<LeaveAllocationConfig>(`${this.base}/config`, payload);
  }
}
