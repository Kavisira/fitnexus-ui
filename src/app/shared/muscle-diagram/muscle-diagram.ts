import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MuscleGroup } from '../../core/constants/exercise-catalog';

/**
 * Small front/back body-silhouette pair with the exercise's target
 * muscle group highlighted — a lightweight visual reference next to
 * the exercise name in the workout plan editor and on the member's
 * public page, not a medical diagram. See the design discussion this
 * was built from: simple silhouette highlight (like Strong/Hevy), not
 * detailed anatomy art.
 *
 * Both views are always shown (front + back) since some groups (e.g.
 * shoulders, calves) are visible from either angle and others (chest
 * vs back) only read correctly on one — rather than pick a single
 * "best" view per group, showing both keeps it unambiguous at a
 * glance regardless of which muscle is selected.
 */
@Component({
  selector: 'app-muscle-diagram',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './muscle-diagram.html',
  styleUrls: ['./muscle-diagram.css'],
})
export class MuscleDiagram {
  @Input() muscleGroup: MuscleGroup | string | null = null;
  @Input() size: 'sm' | 'md' = 'sm';

  private full = computed(() => this.muscleGroup === 'FULL_BODY');

  isActive(region: MuscleGroup): boolean {
    return this.full() || this.muscleGroup === region;
  }
}
