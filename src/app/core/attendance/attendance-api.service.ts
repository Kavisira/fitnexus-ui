import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';

export type BiometricVendorType = 'ADMS_PUSH' | 'GENERIC_WEBHOOK' | 'CSV_IMPORT';
export type PunchPersonType = 'EMPLOYEE' | 'MEMBER';
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'ON_LEAVE' | 'HOLIDAY';

export interface TodaySnapshot {
  date: string;
  totalActiveEmployees: number;
  present: number;
  absent: number;
  halfDay: number;
  onLeave: number;
  holiday: number;
  notYetAggregated: number;
  memberSwipeInsToday: number;
  distinctMembersSwipedInToday: number;
}

export interface AttendanceDayRecord {
  id: string;
  date: string;
  status: AttendanceStatus;
  firstPunchAt: string | null;
  lastPunchAt: string | null;
}

export interface EmployeeMonthlySummary {
  employeeId: string;
  employeeName: string;
  year: number;
  month: number;
  days: AttendanceDayRecord[];
  summary: { PRESENT: number; ABSENT: number; HALF_DAY: number; ON_LEAVE: number; HOLIDAY: number };
}

export interface EmployeeMonthlyRow {
  employeeId: string;
  employeeName: string;
  branchId: string;
  PRESENT: number;
  ABSENT: number;
  HALF_DAY: number;
  ON_LEAVE: number;
  HOLIDAY: number;
}

export interface StaffCalendarDay {
  date: string;
  present: number;
  absent: number;
  halfDay: number;
  onLeave: number;
  holiday: number;
  final: boolean;
}

export interface MemberCalendarDay {
  date: string;
  count: number;
}

export interface DayDetailPerson {
  employeeId?: string;
  memberId?: string;
  name: string;
  photoUrl?: string | null;
  firstPunchAt: string;
  lastPunchAt: string;
}

export interface DayDetail {
  date: string;
  employees: DayDetailPerson[];
  members: DayDetailPerson[];
}

export interface AbsentListResult {
  date: string;
  finalized: boolean;
  employees: { employeeId: string; name: string }[];
}

export interface Holiday {
  id: string;
  organizationId: string;
  date: string;
  name: string;
}

export interface BiometricDevice {
  id: string;
  organizationId: string;
  branchId: string;
  branch?: { id: string; location: string };
  name: string;
  vendorType: BiometricVendorType;
  serialNumber: string | null;
  apiKey: string;
  lastSeenAt: string | null;
  createdAt: string;
}

export interface CreateDevicePayload {
  branchId: string;
  name: string;
  vendorType: BiometricVendorType;
  serialNumber?: string;
}

export interface BiometricEnrollment {
  id: string;
  organizationId: string;
  deviceId: string;
  biometricUserId: string;
  personType: PunchPersonType;
  employeeId: string | null;
  employee?: { id: string; name: string; photoUrl: string | null };
  memberId: string | null;
  member?: { id: string; name: string };
  createdAt: string;
}

export interface UpsertEnrollmentPayload {
  biometricUserId: string;
  personType: PunchPersonType;
  employeeId?: string;
  memberId?: string;
}

export interface UnmatchedPunch {
  id: string;
  biometricUserId: string;
  personType: PunchPersonType;
  punchTime: string;
  device?: { id: string; name: string };
  branch?: { id: string; location: string };
}

/** Thin wrapper over `/api/attendance/*`. All routes here require the
 * ATTENDANCE permission (read for reporting/listing, write for
 * devices/enrollments/holidays) — enforced server-side, same pattern
 * as Expenses and Leave Management. */
@Injectable({ providedIn: 'root' })
export class AttendanceApiService {
  private http = inject(HttpClient);
  private base = `${API_BASE_URL}/attendance`;

  staffCalendar(year: number, month: number, branchId?: string): Observable<StaffCalendarDay[]> {
    let params = new HttpParams().set('year', year).set('month', month);
    if (branchId) params = params.set('branchId', branchId);
    return this.http.get<StaffCalendarDay[]>(`${this.base}/calendar/staff`, { params });
  }

  memberCalendar(year: number, month: number, branchId?: string): Observable<MemberCalendarDay[]> {
    let params = new HttpParams().set('year', year).set('month', month);
    if (branchId) params = params.set('branchId', branchId);
    return this.http.get<MemberCalendarDay[]>(`${this.base}/calendar/members`, { params });
  }

  dayDetail(date: string, branchId?: string): Observable<DayDetail> {
    let params = new HttpParams().set('date', date);
    if (branchId) params = params.set('branchId', branchId);
    return this.http.get<DayDetail>(`${this.base}/day-detail`, { params });
  }

  absentList(date: string, branchId?: string): Observable<AbsentListResult> {
    let params = new HttpParams().set('date', date);
    if (branchId) params = params.set('branchId', branchId);
    return this.http.get<AbsentListResult>(`${this.base}/absent`, { params });
  }

  today(branchId?: string): Observable<TodaySnapshot> {
    let params = new HttpParams();
    if (branchId) params = params.set('branchId', branchId);
    return this.http.get<TodaySnapshot>(`${this.base}/today`, { params });
  }

  employeeMonthly(employeeId: string, year: number, month: number): Observable<EmployeeMonthlySummary> {
    const params = new HttpParams().set('year', year).set('month', month);
    return this.http.get<EmployeeMonthlySummary>(`${this.base}/employees/${employeeId}/monthly`, { params });
  }

  monthlySummary(year: number, month: number, branchId?: string): Observable<EmployeeMonthlyRow[]> {
    let params = new HttpParams().set('year', year).set('month', month);
    if (branchId) params = params.set('branchId', branchId);
    return this.http.get<EmployeeMonthlyRow[]>(`${this.base}/monthly-summary`, { params });
  }

  aggregateNow(date: string): Observable<{ processed: number }> {
    return this.http.post<{ processed: number }>(`${this.base}/aggregate`, { date });
  }

  // ---- Holidays ----

  listHolidays(year?: number): Observable<Holiday[]> {
    let params = new HttpParams();
    if (year) params = params.set('year', year);
    return this.http.get<Holiday[]>(`${this.base}/holidays`, { params });
  }

  createHoliday(payload: { date: string; name: string }): Observable<Holiday> {
    return this.http.post<Holiday>(`${this.base}/holidays`, payload);
  }

  removeHoliday(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.base}/holidays/${id}`);
  }

  // ---- Devices ----

  listDevices(branchId?: string): Observable<BiometricDevice[]> {
    let params = new HttpParams();
    if (branchId) params = params.set('branchId', branchId);
    return this.http.get<BiometricDevice[]>(`${this.base}/devices`, { params });
  }

  createDevice(payload: CreateDevicePayload): Observable<BiometricDevice> {
    return this.http.post<BiometricDevice>(`${this.base}/devices`, payload);
  }

  updateDevice(id: string, payload: { name: string }): Observable<BiometricDevice> {
    return this.http.patch<BiometricDevice>(`${this.base}/devices/${id}`, payload);
  }

  removeDevice(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.base}/devices/${id}`);
  }

  rotateKey(id: string): Observable<BiometricDevice> {
    return this.http.post<BiometricDevice>(`${this.base}/devices/${id}/rotate-key`, {});
  }

  // ---- Enrollments ----

  listEnrollments(deviceId: string): Observable<BiometricEnrollment[]> {
    return this.http.get<BiometricEnrollment[]>(`${this.base}/devices/${deviceId}/enrollments`);
  }

  upsertEnrollment(deviceId: string, payload: UpsertEnrollmentPayload): Observable<BiometricEnrollment> {
    return this.http.post<BiometricEnrollment>(`${this.base}/devices/${deviceId}/enrollments`, payload);
  }

  removeEnrollment(deviceId: string, enrollmentId: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.base}/devices/${deviceId}/enrollments/${enrollmentId}`);
  }

  unmatchedPunches(): Observable<UnmatchedPunch[]> {
    return this.http.get<UnmatchedPunch[]>(`${this.base}/unmatched-punches`);
  }
}
