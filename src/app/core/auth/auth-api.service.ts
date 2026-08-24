import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';

export interface RegisterPayload {
  ownerName: string;
  organizationName: string;
  phone: string;
  email: string;
  password: string;
}

export interface VerifyRegisterOtpPayload {
  email: string;
  emailOtp: string;
  phoneOtp: string;
}

export interface LoginPayload {
  identifier: string;
  password: string;
  rememberMe?: boolean;
}

export interface TokenResponse {
  accessToken: string;
}

export interface MeResponse {
  userId: string;
  name: string;
  email: string;
  role: string;
  branchId: string | null;
  branch: { id: string; location: string } | null;
  employeeId: string | null;
  employeeName: string | null;
}

/** Thin wrapper over the NestJS `/api/auth/*` endpoints — one method per
 * route, matching AuthController exactly. Components stay in charge of
 * loading/error state; this service just does the HTTP call. */
@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private http = inject(HttpClient);
  private base = `${API_BASE_URL}/auth`;

  register(payload: RegisterPayload): Observable<{ userId: string }> {
    return this.http.post<{ userId: string }>(`${this.base}/register`, payload);
  }

  verifyRegisterOtp(payload: VerifyRegisterOtpPayload): Observable<TokenResponse> {
    return this.http.post<TokenResponse>(`${this.base}/register/verify-otp`, payload);
  }

  resendRegisterOtp(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/register/resend-otp`, { email });
  }

  login(payload: LoginPayload): Observable<TokenResponse> {
    return this.http.post<TokenResponse>(`${this.base}/login`, payload);
  }

  forgotPassword(identifier: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/forgot-password`, { identifier });
  }

  verifyResetOtp(identifier: string, otp: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/forgot-password/verify-otp`, { identifier, otp });
  }

  resetPassword(identifier: string, otp: string, newPassword: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/forgot-password/reset`, {
      identifier,
      otp,
      newPassword,
    });
  }

  /** The logged-in user's own basic profile — name, branch, and linked
   * Employee record if any. Always readable regardless of the
   * permission matrix (it's just your own record), unlike the
   * Branches/Employees list endpoints — screens use this to default
   * "assigned to me" / "my branch" without needing that other read
   * access. */
  me(): Observable<MeResponse> {
    return this.http.get<MeResponse>(`${this.base}/me`);
  }
}
