import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';
import { DietPlan, WorkoutPlan } from './fitness-api.service';

export interface PublicFitnessPlans {
  memberName: string;
  memberGender: 'MALE' | 'FEMALE' | 'OTHER' | null;
  diet: DietPlan | null;
  workout: WorkoutPlan | null;
}

/** Unauthenticated — matches PublicFitnessController. The token is
 * persistent (not single-use), meant to be bookmarked/revisited. */
@Injectable({ providedIn: 'root' })
export class PublicFitnessApiService {
  private http = inject(HttpClient);
  private base = `${API_BASE_URL}/public/fitness`;

  getPlans(token: string): Observable<PublicFitnessPlans> {
    return this.http.get<PublicFitnessPlans>(`${this.base}/${token}`);
  }

  logSet(token: string, payload: { workoutPlanExerciseId: string; setNumber: number; reps: number; weightKg: number }): Observable<unknown> {
    return this.http.post(`${this.base}/${token}/sets`, payload);
  }

  /** Bulk variant — logs a whole block of identical sets in one tap
   * (e.g. the plan's target "3 sets x 10 reps") instead of the member
   * re-entering the same reps/weight three times. See
   * FitnessService.logSetsAsMember on the backend. */
  logSetsBulk(token: string, payload: { workoutPlanExerciseId: string; sets: number; reps: number; weightKg: number }): Observable<unknown> {
    return this.http.post(`${this.base}/${token}/sets/bulk`, payload);
  }
}
