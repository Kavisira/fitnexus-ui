import { Component, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzAutocompleteModule } from 'ng-zorro-antd/auto-complete';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';

import { CatalogExercise, MUSCLE_GROUP_LABELS, MuscleGroup } from '../../../../../../core/constants/exercise-catalog';
import { ExerciseCatalogService } from '../../../../../../core/exercises/exercise-catalog.service';
import { WorkoutPlanExercise } from '../../../../../../core/fitness/fitness-api.service';
import { ToastService } from '../../../../../../core/toast/toast.service';
// v1 (PrimeNG) demo popup — shared with the public member page; kept until migrated.
import { ExerciseDetailsModal } from '../../../../../../shared/exercise-details-modal/exercise-details-modal';
import { DAY_OPTIONS, MemberFitnessStore } from './member-fitness.store';

const LABEL = 'block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1';

@Component({
  selector: 'app-fitness-workout-editor',
  imports: [
    FormsModule, NzAlertModule, NzAutocompleteModule, NzButtonModule, NzIconModule, NzInputModule,
    NzInputNumberModule, NzSelectModule, NzTooltipModule, ExerciseDetailsModal,
  ],
  template: `
    <div class="space-y-4">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label [class]="label" for="wo-title">Title *</label>
          <input nz-input id="wo-title" class="!h-9 !rounded-xl" placeholder="e.g. 4-day split"
            [ngModel]="store.workoutTitle()" (ngModelChange)="store.workoutTitle.set($event)" [disabled]="!canWrite()" />
        </div>
        <div>
          <label [class]="label" for="wo-notes">Notes (optional)</label>
          <input nz-input id="wo-notes" class="!h-9 !rounded-xl"
            [ngModel]="store.workoutNotes()" (ngModelChange)="store.workoutNotes.set($event)" [disabled]="!canWrite()" />
        </div>
      </div>

      @for (group of store.groupedExercises(); track group.label) {
        <section class="space-y-2">
          <h4 class="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 m-0">{{ group.label }}</h4>
          @for (item of group.items; track item.index) {
            <div class="rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/40 p-3 space-y-2.5">
              <div class="flex items-center gap-2 flex-wrap text-sm font-semibold text-gray-900 dark:text-white">
                <span>{{ item.ex.name || 'Exercise ' + (item.index + 1) }}</span>
                @if (item.ex.muscleGroup) {
                  <span class="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">{{ muscleLabel(item.ex.muscleGroup) }}</span>
                }
                @if (item.ex.lastBestWeightKg) {
                  <span class="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                    Best: {{ item.ex.lastBestReps ?? '?' }} reps &#64; {{ item.ex.lastBestWeightKg }} kg
                  </span>
                } @else if (item.ex.id) {
                  <span class="text-[11px] font-normal text-gray-400">No sets logged yet</span>
                }
              </div>

              <div class="grid grid-cols-2 md:grid-cols-[minmax(0,2.5fr)_repeat(4,minmax(0,1fr))_auto] gap-2 items-center">
                <div class="col-span-2 md:col-span-1 flex items-center gap-1 min-w-0">
                  <input nz-input class="!h-9 !rounded-xl" placeholder="Search or type an exercise"
                    [nzAutocomplete]="auto" [ngModel]="item.ex.name" [disabled]="!canWrite()"
                    (ngModelChange)="onNameChange(item.index, $event)" (focus)="search(item.ex.name)" />
                  <nz-autocomplete #auto>
                    @for (opt of suggestions(); track opt.name) {
                      <nz-auto-option [nzValue]="opt" [nzLabel]="opt.name">
                        <span class="text-sm">{{ opt.name }}</span>
                        <span class="text-xs text-gray-400 ml-1">· {{ muscleLabel(opt.muscleGroup) }}</span>
                      </nz-auto-option>
                    }
                  </nz-autocomplete>
                  @if (item.ex.name) {
                    <button nz-button nzType="text" nzShape="circle" nz-tooltip nzTooltipTitle="View demo" (click)="openDemo(item.ex, item.index)">
                      <span nz-icon nzType="eye"></span>
                    </button>
                  }
                </div>
                <nz-select nzPlaceHolder="Day" [nzShowSearch]="true" [ngModel]="item.ex.day" [nzDisabled]="!canWrite()"
                  (ngModelChange)="store.updateExercise(item.index, { day: $event })">
                  @for (d of dayOptions; track d.label) {
                    <nz-option [nzLabel]="d.label" [nzValue]="d.value"></nz-option>
                  }
                </nz-select>
                <nz-input-number nzPlaceHolder="Sets" [nzMin]="1" [ngModel]="item.ex.targetSets" [nzDisabled]="!canWrite()"
                  (ngModelChange)="store.updateExercise(item.index, { targetSets: $event })"></nz-input-number>
                <nz-input-number nzPlaceHolder="Reps" [nzMin]="1" [ngModel]="item.ex.targetReps" [nzDisabled]="!canWrite()"
                  (ngModelChange)="store.updateExercise(item.index, { targetReps: $event })"></nz-input-number>
                <nz-input-number nzPlaceHolder="Target" nzSuffix="kg" [nzMin]="0" [nzPrecision]="2" [ngModel]="item.ex.targetWeightKg" [nzDisabled]="!canWrite()"
                  (ngModelChange)="store.updateExercise(item.index, { targetWeightKg: $event == null ? null : '' + $event })"></nz-input-number>
                @if (canWrite()) {
                  <button nz-button nzType="text" nzShape="circle" nzDanger nz-tooltip nzTooltipTitle="Remove exercise" (click)="store.removeExercise(item.index)">
                    <span nz-icon nzType="delete"></span>
                  </button>
                }
              </div>
            </div>
          }
        </section>
      }

      @if (canWrite()) {
        <button nz-button nzType="dashed" (click)="store.addExercise()" class="!rounded-xl !inline-flex !items-center gap-1.5 text-xs font-semibold">
          <span nz-icon nzType="plus"></span><span>Add exercise</span>
        </button>
        <nz-alert nzType="info" nzShowIcon nzMessage="Editing an exercise's details clears that exercise's logged-set history going forward."></nz-alert>
      }
    </div>

    <app-exercise-details-modal
      [visible]="demoVisible()"
      (visibleChange)="demoVisible.set($event)"
      [exerciseName]="demoName()"
      [imageUrl]="demoImage()"
      [gender]="memberGender()"
    />
  `,
})
export class FitnessWorkoutEditorComponent {
  readonly store = inject(MemberFitnessStore);
  private catalogService = inject(ExerciseCatalogService);
  private toast = inject(ToastService);

  readonly canWrite = input<boolean>(false);
  readonly memberGender = input<'MALE' | 'FEMALE' | 'OTHER' | null>(null);

  readonly label = LABEL;
  readonly dayOptions = DAY_OPTIONS;
  readonly suggestions = signal<CatalogExercise[]>([]);

  readonly demoVisible = signal(false);
  readonly demoName = signal('');
  readonly demoImage = signal<string | null>(null);

  private catalog: CatalogExercise[] = [];
  /** Image for a row's just-picked catalog exercise (UI only, keyed by row index). */
  private images: Record<number, string | undefined> = {};

  muscleLabel(group: string | null | undefined): string {
    return group ? MUSCLE_GROUP_LABELS[group as MuscleGroup] ?? group : 'Not set';
  }

  search(query: string): void {
    if (!this.catalog.length) {
      this.catalogService.list().subscribe({
        next: (c) => { this.catalog = c; this.search(query); },
        error: () => this.toast.error('Could not load the exercise list.'),
      });
      return;
    }
    const q = (query ?? '').trim().toLowerCase();
    this.suggestions.set(q ? this.catalog.filter((e) => e.name.toLowerCase().includes(q)).slice(0, 30) : this.catalog.slice(0, 20));
  }

  /** Typed text arrives as a string; picking a suggestion arrives as the catalog object. */
  onNameChange(index: number, value: CatalogExercise | string): void {
    if (typeof value === 'string') {
      this.images[index] = undefined;
      this.store.updateExercise(index, { name: value });
      this.search(value);
      return;
    }
    this.images[index] = value.imageUrl;
    this.store.updateExercise(index, { name: value.name, muscleGroup: value.muscleGroup });
  }

  openDemo(ex: WorkoutPlanExercise, index: number): void {
    this.demoName.set(ex.name || 'Exercise');
    // Fall back to the same filename convention the public page uses.
    this.demoImage.set(this.images[index] ?? (ex.name.trim() ? '/assets/exercise_images/' + encodeURIComponent(`${ex.name} Exercise Guide.png`) : null));
    this.demoVisible.set(true);
  }
}
