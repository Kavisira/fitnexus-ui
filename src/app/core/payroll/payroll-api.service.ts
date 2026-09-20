import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';

export interface PayslipComponentRow {
  name: string;
  type: 'EARNING' | 'DEDUCTION';
  percent: number;
  amount: number;
}

export interface Payslip {
  id: string;
  employeeId: string;
  employee?: { id: string; name: string; branchId: string; branch?: { id: string; location: string } };
  year: number;
  month: number;
  basicPay: string;
  componentsSnapshot: PayslipComponentRow[];
  grossEarnings: string;
  totalDeductions: string;
  lopDays: string;
  lopAmount: string;
  netPay: string;
  generatedAt: string;
}

export interface GeneratePayrollPayload {
  year: number;
  month: number;
  branchId?: string;
}

export interface GeneratePayrollResult {
  generated: number;
  results: { employeeId: string; employeeName: string; netPay: number }[];
}

@Injectable({ providedIn: 'root' })
export class PayrollApiService {
  private http = inject(HttpClient);
  private base = `${API_BASE_URL}/payroll`;

  // ---- Self-service: My Workspace's Payslips tab ----

  mine(): Observable<Payslip[]> {
    return this.http.get<Payslip[]>(`${this.base}/me`);
  }

  mineOne(id: string): Observable<Payslip> {
    return this.http.get<Payslip>(`${this.base}/me/${id}`);
  }

  /** Streams the rendered payslip PDF (see PayslipPdfService on the
   * backend) as a blob — plain <a href> can't carry the JWT auth
   * header, so the component turns this into an object URL to trigger
   * the browser's save dialog instead (see downloadBlob in
   * my-workspace.ts / payroll.ts). */
  mineOnePdf(id: string): Observable<Blob> {
    return this.http.get(`${this.base}/me/${id}/pdf`, { responseType: 'blob' });
  }

  // ---- Admin (Owner-only, enforced server-side) ----

  generate(payload: GeneratePayrollPayload): Observable<GeneratePayrollResult> {
    return this.http.post<GeneratePayrollResult>(`${this.base}/generate`, payload);
  }

  list(year: number, month: number, branchId?: string): Observable<Payslip[]> {
    let params = new HttpParams().set('year', year).set('month', month);
    if (branchId) params = params.set('branchId', branchId);
    return this.http.get<Payslip[]>(this.base, { params });
  }

  /** Admin equivalent of mineOnePdf — any payslip in the org, not just
   * the caller's own. */
  pdf(id: string): Observable<Blob> {
    return this.http.get(`${this.base}/${id}/pdf`, { responseType: 'blob' });
  }
}
