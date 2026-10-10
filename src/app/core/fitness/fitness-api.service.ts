import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';

export interface DietPlanItem {
  id?: string;
  mealLabel: string;
  description: string;
  order?: number;
}

export interface DietPlan {
  id: string;
  title: string;
  notes: string | null;
  items: DietPlanItem[];
  updatedAt: string;
}

export interface WorkoutPlanExercise {
  id: string;
  name: string;
  muscleGroup: string | null;
  // Optional day-of-split tag (1-7); null = unsorted/flat, shown
  // outside any day grouping.
  day: number | null;
  targetSets: number;
  targetReps: number;
  targetWeightKg: string | null;
  order: number;
  // The heaviest set ever logged for this exercise (trainer- or
  // member-logged), and the reps that went with it — shown as a
  // single read-only "Best: N reps @ M kg" stat rather than a full
  // per-set log history. Both null when nothing's been logged yet.
  lastBestWeightKg?: string | null;
  lastBestReps?: number | null;
}

export interface WorkoutPlan {
  id: string;
  title: string;
  notes: string | null;
  exercises: WorkoutPlanExercise[];
  updatedAt: string;
}

export interface WorkoutPlanExerciseInput {
  name: string;
  muscleGroup?: string;
  day?: number;
  targetSets: number;
  targetReps: number;
  targetWeightKg?: number;
  order?: number;
}

export interface WorkoutSet {
  id: string;
  performedAt: string;
  setNumber: number;
  reps: number;
  weightKg: string;
  loggedBy: 'TRAINER' | 'MEMBER';
}

export interface PublicAccess {
  memberId: string;
  token: string;
  createdAt: string;
}

/** Thin wrapper over `/api/members/:memberId/fitness` — the
 * authenticated (trainer/owner) side of diet & workout plan editing
 * and set logging. See PublicFitnessApiService for the unauthenticated
 * member-facing page. */
@Injectable({ providedIn: 'root' })
export class FitnessApiService {
  private http = inject(HttpClient);
  private base = (memberId: string) => `${API_BASE_URL}/members/${memberId}/fitness`;

  getDiet(memberId: string): Observable<DietPlan | null> {
    return this.http.get<DietPlan | null>(`${this.base(memberId)}/diet`);
  }

  upsertDiet(memberId: string, payload: { title: string; notes?: string; items: DietPlanItem[] }): Observable<DietPlan> {
    return this.http.post<DietPlan>(`${this.base(memberId)}/diet`, payload);
  }

  getWorkout(memberId: string): Observable<WorkoutPlan | null> {
    return this.http.get<WorkoutPlan | null>(`${this.base(memberId)}/workout`);
  }

  upsertWorkout(
    memberId: string,
    payload: { title: string; notes?: string; exercises: WorkoutPlanExerciseInput[] },
  ): Observable<WorkoutPlan> {
    return this.http.post<WorkoutPlan>(`${this.base(memberId)}/workout`, payload);
  }

  getExerciseHistory(memberId: string, exerciseId: string): Observable<WorkoutSet[]> {
    return this.http.get<WorkoutSet[]>(`${this.base(memberId)}/workout/exercises/${exerciseId}/history`);
  }

  logSet(memberId: string, payload: { workoutPlanExerciseId: string; setNumber: number; reps: number; weightKg: number }): Observable<WorkoutSet> {
    return this.http.post<WorkoutSet>(`${this.base(memberId)}/workout/sets`, payload);
  }

  /** Bulk variant — trainer enters reps/weight once for a block of
   * identical sets (e.g. "3 sets x 10 reps"), fanned out server-side
   * into that many WorkoutSet rows. See LogWorkoutSetsBulkDto on the
   * backend. */
  logSetsBulk(
    memberId: string,
    payload: { workoutPlanExerciseId: string; sets: number; reps: number; weightKg: number },
  ): Observable<WorkoutSet[]> {
    return this.http.post<WorkoutSet[]>(`${this.base(memberId)}/workout/sets/bulk`, payload);
  }

  getOrCreatePublicLink(memberId: string): Observable<PublicAccess> {
    return this.http.post<PublicAccess>(`${this.base(memberId)}/public-link`, {});
  }
}
