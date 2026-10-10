import { Component, EventEmitter, Input, OnChanges, Output, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { InputNumberModule } from 'primeng/inputnumber';
import { AutoCompleteModule, AutoCompleteCompleteEvent } from 'primeng/autocomplete';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SelectModule } from 'primeng/select';

import { ToastService } from '../../../../core/toast/toast.service';
import { FitnessApiService, DietPlanItem, WorkoutPlanExercise } from '../../../../core/fitness/fitness-api.service';
import { CatalogExercise, MUSCLE_GROUP_LABELS, MuscleGroup } from '../../../../core/constants/exercise-catalog';
import { ExerciseCatalogService } from '../../../../core/exercises/exercise-catalog.service';
import { ExerciseDetailsModal } from '../../../../shared/exercise-details-modal/exercise-details-modal';

/**
 * Per-member Diet/Workout editor + "copy public link" — opened from the
 * Members screen's row action menu. The member's own public page
 * (token-only auth, no login) lives at /public-fitness/:token and lets
 * them view both plans and self-log sets; this dialog is the trainer
 * side of the same data (see FitnessApiService / fitness.module.ts on
 * the backend for the full design).
 *
 * Exercise names are picked from EXERCISE_CATALOG (an AutoComplete, so
 * free text still works for anything not listed) — picking a catalog
 * entry also fills muscleGroup, which drives the "View demo" popup.
 * Trainers edit the plan's *targets* here (sets/reps/weight to aim
 * for) but don't log or edit actual performance — that's the
 * member's own job from their public page. This dialog just shows a
 * read-only "Best: N reps @ M kg" stat per exercise once the member
 * has logged anything.
 */
/** Day-of-split options for the exercise day picker: null = unsorted
 * (shows in the flat section), 1-7 = Day 1..Day 7. */
export const DAY_OPTIONS: { label: string; value: number | null }[] = [
  { label: 'Unsorted', value: null },
  ...Array.from({ length: 7 }, (_, i) => ({ label: `Day ${i + 1}`, value: i + 1 })),
];

@Component({
  selector: 'app-member-fitness-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    TextareaModule,
    InputNumberModule,
    AutoCompleteModule,
    TabsModule,
    TagModule,
    MessageModule,
    ProgressSpinnerModule,
    ExerciseDetailsModal,
    SelectModule,
  ],
  templateUrl: './member-fitness-dialog.html',
  styleUrls: ['./member-fitness-dialog.css'],
})
export class MemberFitnessDialog implements OnChanges {
  private api = inject(FitnessApiService);
  private toast = inject(ToastService);
  private exerciseCatalog = inject(ExerciseCatalogService);

  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Input() memberId: string | null = null;
  @Input() memberName = '';
  @Input() memberGender: 'MALE' | 'FEMALE' | 'OTHER' | null = null;
  @Input() canWrite = false;

  loading = signal(false);
  savingDiet = signal(false);
  savingWorkout = signal(false);

  dietTitle = signal('');
  dietNotes = signal('');
  dietItems = signal<DietPlanItem[]>([]);

  workoutTitle = signal('');
  workoutNotes = signal('');
  workoutExercises = signal<WorkoutPlanExercise[]>([]);

  dayOptions = DAY_OPTIONS;

  /** Exercises grouped by their `day` tag for display — "Unsorted"
   * first (day === null), then Day 1..Day 7 in order, each carrying
   * the exercise's original index into workoutExercises() so
   * exerciseImages lookups (which are keyed by that index) keep
   * working unchanged. Groups with no exercises are omitted. */
  groupedExercises = computed(() => {
    const exercises = this.workoutExercises();
    return this.dayOptions
      .map((opt) => ({
        label: opt.label,
        day: opt.value,
        items: exercises.map((ex, index) => ({ ex, index })).filter(({ ex }) => (ex.day ?? null) === opt.value),
      }))
      .filter((group) => group.items.length > 0);
  });

  onDayChange(exercise: WorkoutPlanExercise, day: number | null): void {
    exercise.day = day;
    // Mutating a property in place doesn't change the array reference,
    // so force groupedExercises (and anything else watching the
    // signal) to recompute.
    this.workoutExercises.update((exs) => [...exs]);
  }

  publicLink = signal<string | null>(null);
  loadingLink = signal(false);

  muscleGroupLabel(muscleGroup: string | null | undefined): string {
    return muscleGroup ? MUSCLE_GROUP_LABELS[muscleGroup as MuscleGroup] ?? muscleGroup : 'Not set';
  }

  // --- Exercise name autocomplete (per-row suggestion list), backed
  // by the JSON catalog at assets/Json/fitnexus_exercises_final.json
  // (see ExerciseCatalogService) rather than a hard-coded list.
  private fullCatalog: CatalogExercise[] = [];
  exerciseSuggestions = signal<CatalogExercise[]>([]);

  private ensureCatalogLoaded(): void {
    if (this.fullCatalog.length) {
      return;
    }
    this.exerciseCatalog.list().subscribe({
      next: (catalog) => (this.fullCatalog = catalog),
      error: () => this.toast.error('Could not load the exercise list.'),
    });
  }

  searchExercise(event: AutoCompleteCompleteEvent): void {
    this.ensureCatalogLoaded();
    const query = event.query.trim().toLowerCase();
    this.exerciseSuggestions.set(
      query ? this.fullCatalog.filter((e) => e.name.toLowerCase().includes(query)).slice(0, 30) : this.fullCatalog.slice(0, 20),
    );
  }

  // Reference image for the exercise currently picked in each row,
  // keyed by the exercise's array index (rows have no stable id until
  // saved) — purely a UI aid, never sent to the backend.
  exerciseImages: Record<number, string | undefined> = {};

  // "View demo" popup state — opened on demand instead of always
  // rendering a GIF inline in every row.
  demoModalVisible = signal(false);
  demoExerciseName = signal('');
  demoImageUrl = signal<string | null>(null);

  openDemo(exercise: WorkoutPlanExercise, index: number): void {
    this.demoExerciseName.set(exercise.name || 'Exercise');
    // exerciseImages[index] only gets set when the row's name was just
    // picked from the autocomplete this session — after a save+reload
    // (or on a freshly loaded plan) it's empty even though the image
    // may well exist, so fall back to the same deterministic filename
    // convention the public page uses rather than requiring the
    // trainer to re-pick the exercise from the dropdown.
    this.demoImageUrl.set(this.exerciseImages[index] ?? this.exerciseImageUrl(exercise.name));
    this.demoModalVisible.set(true);
  }

  // Same deterministic filename convention as ExerciseCatalogService /
  // the public member page.
  private exerciseImageUrl(name: string): string | null {
    return name.trim() ? '/assets/exercise_images/' + encodeURIComponent(`${name} Exercise Guide.png`) : null;
  }

  /** Handles both a freely-typed string (ngModelChange while typing)
   * and a picked catalog object (AutoComplete's onSelect/ngModelChange
   * both fire with whatever the user ends up with) — only an object
   * carries a muscleGroup/imageUrl, so typing something not in the
   * catalog just leaves the exercise's existing muscleGroup (or none)
   * as-is and clears the preview image. */
  onExerciseNameChange(exercise: WorkoutPlanExercise, value: CatalogExercise | string, index: number): void {
    if (typeof value === 'string') {
      exercise.name = value;
      this.exerciseImages[index] = undefined;
      return;
    }
    exercise.name = value.name;
    exercise.muscleGroup = value.muscleGroup;
    this.exerciseImages[index] = value.imageUrl;
  }

  /** The image filename is derived from the exercise name, not every
   * exercise has a matching file yet — hide the broken-image icon
   * rather than showing it when one 404s. */
  onExerciseImageError(index: number): void {
    this.exerciseImages[index] = undefined;
  }

  ngOnChanges(): void {
    if (this.visible && this.memberId) {
      this.load();
    }
  }

  close(): void {
    this.visibleChange.emit(false);
  }

  private load(): void {
    const memberId = this.memberId;
    if (!memberId) {
      return;
    }
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
        const exercises = workout?.exercises?.length
          ? workout.exercises
          : [{ id: '', name: '', muscleGroup: null, day: null, targetSets: 3, targetReps: 10, targetWeightKg: null, order: 0 }];
        this.workoutExercises.set(exercises);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('Could not load the workout plan.');
      },
    });
  }

  addDietItem(): void {
    this.dietItems.update((items) => [...items, { mealLabel: '', description: '' }]);
  }

  removeDietItem(index: number): void {
    this.dietItems.update((items) => items.filter((_, i) => i !== index));
  }

  saveDiet(): void {
    const memberId = this.memberId;
    const title = this.dietTitle().trim();
    if (!memberId || !title) {
      this.toast.error('Please enter a diet plan title.');
      return;
    }
    const items = this.dietItems()
      .filter((i) => i.mealLabel.trim() && i.description.trim())
      .map((i, order) => ({ mealLabel: i.mealLabel.trim(), description: i.description.trim(), order }));
    if (!items.length) {
      this.toast.error('Add at least one meal.');
      return;
    }
    this.savingDiet.set(true);
    this.api.upsertDiet(memberId, { title, notes: this.dietNotes().trim() || undefined, items }).subscribe({
      next: () => {
        this.savingDiet.set(false);
        this.toast.success('Diet plan saved.');
      },
      error: (err) => {
        this.savingDiet.set(false);
        const message = err?.error?.message ?? 'Could not save the diet plan.';
        this.toast.error(Array.isArray(message) ? message.join(' ') : message);
      },
    });
  }

  addExercise(): void {
    this.workoutExercises.update((exercises) => [
      ...exercises,
      { id: '', name: '', muscleGroup: null, day: null, targetSets: 3, targetReps: 10, targetWeightKg: null, order: 0 },
    ]);
  }

  removeExercise(index: number): void {
    this.workoutExercises.update((exercises) => exercises.filter((_, i) => i !== index));
  }

  saveWorkout(): void {
    const memberId = this.memberId;
    const title = this.workoutTitle().trim();
    if (!memberId || !title) {
      this.toast.error('Please enter a workout plan title.');
      return;
    }
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
    if (!exercises.length) {
      this.toast.error('Add at least one exercise.');
      return;
    }
    this.savingWorkout.set(true);
    this.api.upsertWorkout(memberId, { title, notes: this.workoutNotes().trim() || undefined, exercises }).subscribe({
      next: () => {
        this.savingWorkout.set(false);
        this.toast.success('Workout plan saved — editing exercises clears past set history for changed exercises.');
        this.load();
      },
      error: (err) => {
        this.savingWorkout.set(false);
        const message = err?.error?.message ?? 'Could not save the workout plan.';
        this.toast.error(Array.isArray(message) ? message.join(' ') : message);
      },
    });
  }

  getPublicLink(): void {
    const memberId = this.memberId;
    if (!memberId) {
      return;
    }
    this.loadingLink.set(true);
    this.api.getOrCreatePublicLink(memberId).subscribe({
      next: (access) => {
        this.loadingLink.set(false);
        const base = window.location.origin;
        this.publicLink.set(`${base}/public-fitness/${access.token}`);
      },
      error: () => {
        this.loadingLink.set(false);
        this.toast.error('Could not generate the member link.');
      },
    });
  }

  copyLink(): void {
    const link = this.publicLink();
    if (!link) {
      return;
    }
    navigator.clipboard?.writeText(link).then(
      () => this.toast.success('Link copied.'),
      () => undefined,
    );
  }
}
