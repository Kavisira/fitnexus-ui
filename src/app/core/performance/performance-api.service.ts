import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';

export type ReviewStatus = 'PENDING_EMPLOYEE' | 'PENDING_MANAGEMENT' | 'SIGNED_OFF';
export type ReviewResponseAuthor = 'EMPLOYEE' | 'MANAGEMENT';

export interface ReviewResponse {
  id: string;
  authorType: ReviewResponseAuthor;
  authorUserId: string | null;
  message: string;
  createdAt: string;
}

export interface Review {
  id: string;
  employeeId: string;
  reviewerUserId: string | null;
  reviewDate: string;
  rating: number | null;
  notes: string;
  status: ReviewStatus;
  signedOffAt: string | null;
  responses: ReviewResponse[];
  createdAt: string;
}

export interface CreateReviewPayload {
  employeeId: string;
  reviewDate: string;
  rating?: number;
  notes: string;
}

export interface Appraisal {
  id: string;
  employeeId: string;
  effectiveDate: string;
  previousBasicPay: string | null;
  newBasicPay: string;
  note: string | null;
  letterContent: string;
  createdAt: string;
}

export interface CreateAppraisalPayload {
  employeeId: string;
  effectiveDate: string;
  newBasicPay: string;
  note?: string;
}

@Injectable({ providedIn: 'root' })
export class PerformanceApiService {
  private http = inject(HttpClient);
  private base = `${API_BASE_URL}/performance`;

  // ---- Admin (EMPLOYEES permission, enforced server-side) ----

  createReview(payload: CreateReviewPayload): Observable<Review> {
    return this.http.post<Review>(`${this.base}/reviews`, payload);
  }

  listReviews(employeeId: string): Observable<Review[]> {
    const params = new HttpParams().set('employeeId', employeeId);
    return this.http.get<Review[]>(`${this.base}/reviews`, { params });
  }

  /** Management's reply in the sign-off conversation. */
  replyAsManagement(reviewId: string, message: string): Observable<Review> {
    return this.http.post<Review>(`${this.base}/reviews/${reviewId}/reply`, { message });
  }

  createAppraisal(payload: CreateAppraisalPayload): Observable<Appraisal> {
    return this.http.post<Appraisal>(`${this.base}/appraisals`, payload);
  }

  listAppraisals(employeeId: string): Observable<Appraisal[]> {
    const params = new HttpParams().set('employeeId', employeeId);
    return this.http.get<Appraisal[]>(`${this.base}/appraisals`, { params });
  }

  // ---- Self-service: My Workspace's Reviews / Appraisal Letters tabs ----

  myReviews(): Observable<Review[]> {
    return this.http.get<Review[]>(`${this.base}/reviews/mine`);
  }

  /** Employee's reply — puts the ball back in management's court. */
  replyAsEmployee(reviewId: string, message: string): Observable<Review> {
    return this.http.post<Review>(`${this.base}/reviews/mine/${reviewId}/reply`, { message });
  }

  /** Employee signs off, closing the review thread. */
  signOffReview(reviewId: string): Observable<Review> {
    return this.http.post<Review>(`${this.base}/reviews/mine/${reviewId}/sign-off`, {});
  }

  myAppraisals(): Observable<Appraisal[]> {
    return this.http.get<Appraisal[]>(`${this.base}/appraisals/mine`);
  }
}
