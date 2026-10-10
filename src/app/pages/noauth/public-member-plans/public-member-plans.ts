import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TabsModule } from 'primeng/tabs';
import { InputNumberModule } from 'primeng/inputnumber';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TagModule } from 'primeng/tag';

import { PublicFitnessApiService, PublicFitnessPlans } from '../../../core/fitness/public-fitness-api.service';
import { WorkoutPlanExercise } from '../../../core/fitness/fitness-api.service';
import { ExerciseDetailsModal } from '../../../shared/exercise-details-modal/exercise-details-modal';

/** Public, unauthenticated "my plans" page — a member's diet and
 * workout plan in one page with two tabs, reached via a persistent
 * (bookmarkable) token-only link. Members can also log their own
 * completed sets from the Workout tab — one row per target set (so a
 * "3 sets x 10 reps" plan shows 3 separate reps/weight inputs), each
 * logged independently via the single-set endpoint, since actual
 * performance can differ set to set; see
 * FitnessService.logSetAsMember's doc comment on why this stays
 * append-only with no edit/delete here. Each row's draft defaults to
 * the trainer's target so most members can just tap "Log" as-is. */
@Component({
  selector: 'app-public-member-plans',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    CardModule,
    TabsModule,
    InputNumberModule,
    MessageModule,
    ProgressSpinnerModule,
    TagModule,
    ExerciseDetailsModal,
  ],
  templateUrl: './public-member-plans.html',
  styleUrls: ['./public-member-plans.css'],
})
export class PublicMemberPlans implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(PublicFitnessApiService);

  loading = signal(true);
  errorMessage = signal<string | null>(null);
  plans = signal<PublicFitnessPlans | null>(null);

  // Draft values for the "log a set" mini-form — one row per target
  // set, keyed by exercise id, each pre-filled from the exercise's own
  // target so most members can just tap "Log" on each row without
  // re-typing the same reps/weight already assigned to them.
  logDrafts: Record<string, { reps: number | null; weightKg: number | null }[]> = {};
  logging = signal<string | null>(null); // `${exerciseId}:${setNumber}` currently being submitted
  logSuccess = signal<string | null>(null); // `${exerciseId}:${setNumber}` just logged

  private token = '';

  /** Same grouping idea as the trainer dialog's groupedExercises:
   * "Unsorted" first (day === null), then Day 1..Day 7 in order, each
   * group omitted entirely when empty. Read-only here — members can't
   * change day assignment, only the trainer does. */
  groupedExercises = computed(() => {
    const exercises = this.plans()?.workout?.exercises ?? [];
    const dayLabels: { label: string; day: number | null }[] = [
      { label: 'Unsorted', day: null },
      ...Array.from({ length: 7 }, (_, i) => ({ label: `Day ${i + 1}`, day: i + 1 })),
    ];
    return dayLabels
      .map(({ label, day }) => ({ label, day, items: exercises.filter((ex) => (ex.day ?? null) === day) }))
      .filter((group) => group.items.length > 0);
  });

  // Same deterministic filename convention as the trainer-side catalog
  // (ExerciseCatalogService) — kept inline here since this page only
  // ever needs the URL, not the full catalog fetch.
  exerciseImageUrl(name: string): string {
    return '/assets/exercise_images/' + encodeURIComponent(`${name} Exercise Guide.png`);
  }

  // "View demo" popup state — opened on demand instead of always
  // rendering a GIF inline in every row.
  demoModalVisible = signal(false);
  demoExerciseName = signal('');
  demoImageUrl = signal<string | null>(null);

  openDemo(exercise: WorkoutPlanExercise): void {
    this.demoExerciseName.set(exercise.name);
    this.demoImageUrl.set(this.exerciseImageUrl(exercise.name));
    this.demoModalVisible.set(true);
  }

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token') ?? '';
    if (!this.token) {
      this.errorMessage.set('This link is invalid.');
      this.loading.set(false);
      return;
    }
    this.load();
  }

  private load(): void {
    this.api.getPlans(this.token).subscribe({
      next: (plans) => {
        this.loading.set(false);
        this.plans.set(plans);
        for (const exercise of plans.workout?.exercises ?? []) {
          const setCount = Math.max(1, exercise.targetSets ?? 1);
          this.logDrafts[exercise.id] = Array.from({ length: setCount }, () => ({
            reps: exercise.targetReps,
            weightKg: exercise.targetWeightKg != null ? Number(exercise.targetWeightKg) : null,
          }));
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(err?.error?.message ?? 'This link is invalid.');
      },
    });
  }

  logSet(exercise: WorkoutPlanExercise, setIndex: number): void {
    const draft = this.logDrafts[exercise.id]?.[setIndex];
    if (draft?.reps == null || draft.weightKg == null) {
      return;
    }
    const key = `${exercise.id}:${setIndex}`;
    this.logging.set(key);
    this.logSuccess.set(null);
    this.api
      .logSet(this.token, {
        workoutPlanExerciseId: exercise.id,
        setNumber: setIndex + 1,
        reps: draft.reps,
        weightKg: draft.weightKg,
      })
      .subscribe({
        next: () => {
          this.logging.set(null);
          this.logSuccess.set(key);
        },
        error: () => {
          this.logging.set(null);
        },
      });
  }
}
