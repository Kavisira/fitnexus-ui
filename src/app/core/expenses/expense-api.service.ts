import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';
import { ExpenseCategory } from '../constants/expense-categories';

export interface ExpenseBranch {
  id: string;
  location: string;
  currency: string;
}

export interface Expense {
  id: string;
  organizationId: string;
  branchId: string;
  branch: ExpenseBranch;
  category: ExpenseCategory;
  amount: string; // Prisma Decimal serializes as a string over HTTP
  expenseDate: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExpensePayload {
  branchId: string;
  category: ExpenseCategory;
  amount: number;
  expenseDate?: string;
  note?: string;
}

export interface ExpenseFilters {
  // Multi-select filter panel — 0+ branches/categories; empty/undefined = no filter.
  branchIds?: string[];
  categories?: ExpenseCategory[];
  from?: string;
  to?: string;
}

/** Thin wrapper over the NestJS `/api/expenses` endpoints — same shape
 * as BranchApiService/MemberApiService. Every call is implicitly scoped
 * to the caller's organization (and, for staff, their own branch)
 * server-side via the JWT. */
@Injectable({ providedIn: 'root' })
export class ExpenseApiService {
  private http = inject(HttpClient);
  private base = `${API_BASE_URL}/expenses`;

  list(filters: ExpenseFilters = {}): Observable<Expense[]> {
    let params = new HttpParams();
    if (filters.branchIds && filters.branchIds.length > 0) params = params.set('branchId', filters.branchIds.join(','));
    if (filters.categories && filters.categories.length > 0) params = params.set('category', filters.categories.join(','));
    if (filters.from) params = params.set('from', filters.from);
    if (filters.to) params = params.set('to', filters.to);
    return this.http.get<Expense[]>(this.base, { params });
  }

  create(payload: ExpensePayload): Observable<Expense> {
    return this.http.post<Expense>(this.base, payload);
  }

  update(id: string, payload: Partial<ExpensePayload>): Observable<Expense> {
    return this.http.patch<Expense>(`${this.base}/${id}`, payload);
  }

  remove(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.base}/${id}`);
  }
}
