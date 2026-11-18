import { Injectable, computed, inject, signal } from '@angular/core';

import { ToastService } from '../../../../../../core/toast/toast.service';
import { DietPlanItem, FitnessApiService, WorkoutPlanExercise } from '../../../../../../core/fitness/fitness-api.service';

/** Day-of-split options: null = unsorted, 1-7 = Day 1..Day 7. */
export const DAY_OPTIONS: { label: string; value: number | null }[] = [
  { label: 'Unsorted', value: null },
  ...Array.from({ length: 7 }, (_, i) => ({ label: `Day ${i + 1}`, value: i + 1 })),
];

const blankExercise = (): WorkoutPlanExercise => ({
  id: '', name: '', muscleGroup: null, day: null, targetSets: 3, targetReps: 10, targetWeightKg: null, order: 0,
});

const errorText = (err: unknown, fallback: string): string => {
  const message = (err as { error?: { message?: string | string[] } })?.error?.message ?? fallback;
  return Array.isArray(message) ? message.join(' ') : message;
};

/**
 * State + API calls for one open Diet & Workout modal. Provided by the modal
 * component (not root), so each open gets fresh state.
 */
@Injectable()
export class MemberFitnessStore {
  private api = inject(FitnessApiService);
  private toast = inject(ToastService);

  private memberId: string | null = null;

  readonly loading = signal(false);
  readonly savingDiet = signal(false);
  readonly savingWorkout = signal(false);
  readonly loadingLink = signal(false);
  readonly publicLink = signal<string | null>(null);

  readonly dietTitle = signal('');
  readonly dietNotes = signal('');
  readonly dietItems = signal<DietPlanItem[]>([]);

  readonly workoutTitle = signal('');
  readonly workoutNotes = signal('');
  readonly workoutExercises = signal<WorkoutPlanExercise[]>([]);

  /** Exercises grouped by day ("Unsorted" first, then Day 1..7); each keeps its
   * index in workoutExercises() so edits/removals target the right row. */
  readonly groupedExercises = computed(() => {
    const exercises = this.workoutExercises();
    return DAY_OPTIONS.map((opt) => ({
      label: opt.label,
      items: exercises.map((ex, index) => ({ ex, index })).filter(({ ex }) => (ex.day ?? null) === opt.value),
    })).filter((g) => g.items.length > 0);
  });

  load(memberId: string): void {
    this.memberId = memberId;
    this.loading.set(true);
    this.publicLink.set(null);
    this.api.getDiet(memberId).subscribe({
      next: (diet) => {
        this.dietTitle.set(diet?.title ?? '');
        this.dietNotes.set(diet?.notes ?? '');
        this.dietItems.set(diet?.items?.length ? diet.items : [{ mealLabel: '', description: '' }]);
      },
      error: () => this.toast.error('Could not load the diet plan.'),
    });
    this.api.getWorkout(memberId).subscribe({
      next: (workout) => {
        this.loading.set(false);
        this.workoutTitle.set(workout?.title ?? '');
        this.workoutNotes.set(workout?.notes ?? '');
        this.workoutExercises.set(workout?.exercises?.length ? workout.exercises : [blankExercise()]);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('Could not load the workout plan.');
      },
    });
  }

  // ---- Diet ----
  addDietItem(): void {
    this.dietItems.update((items) => [...items, { mealLabel: '', description: '' }]);
  }

  removeDietItem(index: number): void {
    this.dietItems.update((items) => items.filter((_, i) => i !== index));
  }

  updateDietItem(index: number, field: 'mealLabel' | 'description', value: string): void {
    this.dietItems.update((items) => items.map((it, i) => (i === index ? { ...it, [field]: value } : it)));
  }

  saveDiet(): void {
    const title = this.dietTitle().trim();
    if (!this.memberId || !title) { this.toast.error('Please enter a diet plan title.'); return; }
    const items = this.dietItems()
      .filter((i) => i.mealLabel.trim() && i.description.trim())
      .map((i, order) => ({ mealLabel: i.mealLabel.trim(), description: i.description.trim(), order }));
    if (!items.length) { this.toast.error('Add at least one meal.'); return; }
    this.savingDiet.set(true);
    this.api.upsertDiet(this.memberId, { title, notes: this.dietNotes().trim() || undefined, items }).subscribe({
      next: () => { this.savingDiet.set(false); this.toast.success('Diet plan saved.'); },
      error: (err) => { this.savingDiet.set(false); this.toast.error(errorText(err, 'Could not save the diet plan.')); },
    });
  }

  // ---- Workout ----
  addExercise(): void {
    this.workoutExercises.update((list) => [...list, blankExercise()]);
  }

  removeExercise(index: number): void {
    this.workoutExercises.update((list) => list.filter((_, i) => i !== index));
  }

  updateExercise(index: number, patch: Partial<WorkoutPlanExercise>): void {
    this.workoutExercises.update((list) => list.map((ex, i) => (i === index ? { ...ex, ...patch } : ex)));
  }

  saveWorkout(): void {
    const title = this.workoutTitle().trim();
    if (!this.memberId || !title) { this.toast.error('Please enter a workout plan title.'); return; }
    const exercises = this.workoutExercises()
      .filter((e) => e.name.trim())
      .map((e, order) => ({
        name: e.name.trim(),
        muscleGroup: e.muscleGroup ?? undefined,
        day: e.day ?? undefined,
        targetSets: e.targetSets ?? 1,
        targetReps: e.targetReps ?? 1,
        targetWeightKg: e.targetWeightKg != null ? Number(e.targetWeightKg) : undefined,
        order,
      }));
    if (!exercises.length) { this.toast.error('Add at least one exercise.'); return; }
    const memberId = this.memberId;
    this.savingWorkout.set(true);
    this.api.upsertWorkout(memberId, { title, notes: this.workoutNotes().trim() || undefined, exercises }).subscribe({
      next: () => {
        this.savingWorkout.set(false);
        this.toast.success('Workout plan saved — editing exercises clears past set history for changed exercises.');
        this.load(memberId);
      },
      error: (err) => { this.savingWorkout.set(false); this.toast.error(errorText(err, 'Could not save the workout plan.')); },
    });
  }

  // ---- Public link ----
  getPublicLink(): void {
    if (!this.memberId) return;
    this.loadingLink.set(true);
    this.api.getOrCreatePublicLink(this.memberId).subscribe({
      next: (access) => {
        this.loadingLink.set(false);
        this.publicLink.set(`${window.location.origin}/public-fitness/${access.token}`);
      },
      error: () => { this.loadingLink.set(false); this.toast.error('Could not generate the member link.'); },
    });
  }

  copyLink(): void {
    const link = this.publicLink();
    if (!link) return;
    navigator.clipboard?.writeText(link).then(() => this.toast.success('Link copied.'), () => undefined);
  }
}
