import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';

// Free-form now — matched against the org's managed job title list
// (see JobTitle below) rather than a fixed set of values.
export type EmployeeRole = string;
export type EmploymentStatus = 'ACTIVE' | 'INACTIVE';

export interface JobTitle {
  id: string;
  organizationId: string;
  name: string;
  createdAt: string;
}

export type SalaryComponentType = 'EARNING' | 'DEDUCTION';

// One configurable line in an employee's salary structure — always a
// percentage of basicPay (see the backend SalaryComponent model
// comment for why: no per-component base, no shared template by role
// or branch — every employee's structure is entirely their own).
export interface SalaryComponent {
  id?: string;
  name: string;
  type: SalaryComponentType;
  percent: number | string;
}

export interface EmployeeActivity {
  id: string;
  employeeId: string;
  note: string;
  createdAt: string;
}

export interface Employee {
  id: string;
  organizationId: string;
  branchId: string;
  branch?: { id: string; location: string };
  name: string;
  email: string | null;
  phone: string;
  photoUrl: string | null;
  role: EmployeeRole;
  status: EmploymentStatus;
  joinDate: string;
  dateOfBirth: string | null;
  basicPay: string | null;
  createdAt: string;
  updatedAt: string;
  // Only present on the single-employee detail response (findOne) — most
  // recent first.
  activities?: EmployeeActivity[];
  // Present once this employee has a login (see EmployeesService).
  user?: { id: string; email: string } | null;
  // Only present on the single-employee detail response (findOne) — see
  // SalaryComponent above.
  salaryComponents?: SalaryComponent[];
}

export interface EmployeePayload {
  name: string;
  phone: string;
  email?: string;
  branchId: string;
  role?: EmployeeRole;
  status?: EmploymentStatus;
  joinDate: string;
  dateOfBirth?: string | null;
  photoUrl?: string | null;
  basicPay?: string | null;
  // "Create login" checkbox on the create form — see EmployeesService
  // for the username/password auto-generation this triggers.
  createLogin?: boolean;
  // Full replace-set on every save — omit on create to start blank, omit
  // on update to leave the existing list untouched, send [] to clear it.
  components?: SalaryComponent[];
}

export interface GeneratedLogin {
  username: string;
  password: string;
}

export interface CreateEmployeeResult {
  employee: Employee;
  login: GeneratedLogin | null;
}

export interface EmployeeListFilters {
  branchId?: string | null;
  role?: string | null;
  status?: string | null;
  search?: string | null;
}

// ---- Bulk import (CSV) — see the Employees page's import dialog. ----

export interface ImportedEmployeeRowData {
  name: string;
  phone: string;
  email?: string;
  role?: string;
  joinDate?: string;
  dateOfBirth?: string;
  basicPay?: string;
}

export interface ImportedEmployeeRow {
  rowNumber: number;
  data: ImportedEmployeeRowData;
  errors: string[];
}

export interface EmployeeImportCommitResultRow {
  rowNumber: number;
  success: boolean;
  employeeId?: string;
  error?: string;
}

/** Thin wrapper over the NestJS `/api/employees` endpoints — mirrors
 * LeadApiService. Every call is implicitly scoped to the caller's
 * organization server-side (via the JWT). */
@Injectable({ providedIn: 'root' })
export class EmployeeApiService {
  private http = inject(HttpClient);
  private base = `${API_BASE_URL}/employees`;

  list(filters: EmployeeListFilters = {}): Observable<Employee[]> {
    let params = new HttpParams();
    if (filters.branchId) {
      params = params.set('branchId', filters.branchId);
    }
    if (filters.role) {
      params = params.set('role', filters.role);
    }
    if (filters.status) {
      params = params.set('status', filters.status);
    }
    if (filters.search) {
      params = params.set('search', filters.search);
    }
    return this.http.get<Employee[]>(this.base, { params });
  }

  get(id: string): Observable<Employee> {
    return this.http.get<Employee>(`${this.base}/${id}`);
  }

  create(payload: EmployeePayload): Observable<CreateEmployeeResult> {
    return this.http.post<CreateEmployeeResult>(this.base, payload);
  }

  /** Retroactively creates a login for an employee that doesn't have one
   * yet (e.g. created before this feature existed, or with the "Create
   * login" checkbox left unchecked). Same generation rules as the
   * checkbox — requires the employee to already have a DOB and an
   * eligible role. */
  createLogin(id: string): Observable<GeneratedLogin> {
    return this.http.post<GeneratedLogin>(`${this.base}/${id}/create-login`, {});
  }

  /** Owner-only (enforced server-side) — the username and password for
   * this employee's login, viewable any time rather than just once. */
  getCredentials(id: string): Observable<GeneratedLogin> {
    return this.http.get<GeneratedLogin>(`${this.base}/${id}/credentials`);
  }

  update(id: string, payload: Partial<EmployeePayload>): Observable<Employee> {
    return this.http.patch<Employee>(`${this.base}/${id}`, payload);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  addActivity(id: string, note: string): Observable<EmployeeActivity> {
    return this.http.post<EmployeeActivity>(`${this.base}/${id}/activities`, { note });
  }

  // ---- Job titles (managed per-org list backing the role dropdown) ----

  listJobTitles(): Observable<JobTitle[]> {
    return this.http.get<JobTitle[]>(`${this.base}/job-titles`);
  }

  createJobTitle(name: string): Observable<JobTitle> {
    return this.http.post<JobTitle>(`${this.base}/job-titles`, { name });
  }

  // ---- Bulk import (CSV) ----

  parseImportCsv(branchId: string, csvContent: string): Observable<{ rows: ImportedEmployeeRow[] }> {
    return this.http.post<{ rows: ImportedEmployeeRow[] }>(`${this.base}/import/parse`, { branchId, csvContent });
  }

  commitImport(rows: EmployeePayload[]): Observable<{ results: EmployeeImportCommitResultRow[] }> {
    return this.http.post<{ results: EmployeeImportCommitResultRow[] }>(`${this.base}/import/commit`, { rows });
  }
}
