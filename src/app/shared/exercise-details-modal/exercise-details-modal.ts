import { Component, EventEmitter, Input, OnChanges, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { TagModule } from 'primeng/tag';

import { ExerciseCatalogService } from '../../core/exercises/exercise-catalog.service';
import { CatalogExercise, MUSCLE_GROUP_LABELS, MuscleGroup } from '../../core/constants/exercise-catalog';
import { ExerciseSprite, SpriteGender } from '../exercise-sprite/exercise-sprite';

/**
 * "View demo" popup — shared by the trainer dialog and the member's
 * public page so an exercise row doesn't have to carry its own
 * always-visible GIF; this opens on demand instead. Shows the
 * Male/Female start/end sprite animation plus whatever catalog detail
 * exists for the exercise (level/equipment/category as quick facts,
 * primary/secondary muscles, and the dataset's own instructions as
 * the how-to text). The JSON dataset has no separate "benefits" copy,
 * so none is shown here — only what's actually in
 * fitnexus_exercises_final.json.
 *
 * Looks the exercise up by name in ExerciseCatalogService itself
 * (case-insensitive) rather than requiring the caller to pass the
 * full CatalogExercise — callers often only have a plain exercise
 * name + image URL (e.g. a saved WorkoutPlanExercise). A name that
 * isn't in the catalog (freely typed by a trainer, not picked from
 * the autocomplete) just shows the demo animation with no
 * instructions/muscle facts below it.
 */
@Component({
  selector: 'app-exercise-details-modal',
  standalone: true,
  imports: [CommonModule, DialogModule, TagModule, ExerciseSprite],
  templateUrl: './exercise-details-modal.html',
  styleUrls: ['./exercise-details-modal.css'],
})
export class ExerciseDetailsModal implements OnChanges {
  private catalogService = inject(ExerciseCatalogService);

  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Input() exerciseName = '';
  @Input() imageUrl: string | null = null;
  @Input() gender: SpriteGender = null;

  details = signal<CatalogExercise | null>(null);

  private fullCatalog: CatalogExercise[] = [];

  ngOnChanges(): void {
    if (!this.visible) {
      return;
    }
    this.details.set(null);
    if (this.fullCatalog.length) {
      this.applyLookup();
      return;
    }
    this.catalogService.list().subscribe({
      next: (catalog) => {
        this.fullCatalog = catalog;
        this.applyLookup();
      },
    });
  }

  private applyLookup(): void {
    const target = this.exerciseName.trim().toLowerCase();
    this.details.set(this.fullCatalog.find((e) => e.name.trim().toLowerCase() === target) ?? null);
  }

  muscleGroupLabel(muscleGroup: string): string {
    return MUSCLE_GROUP_LABELS[muscleGroup as MuscleGroup] ?? muscleGroup;
  }

  close(): void {
    this.visibleChange.emit(false);
  }
}
