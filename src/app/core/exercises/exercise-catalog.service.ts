import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, shareReplay } from 'rxjs';

import { CatalogExercise, RawCatalogExercise, mapRawMuscleToGroup } from '../constants/exercise-catalog';

const IMAGE_BASE = '/assets/exercise_images/';

/** Loads the built-in exercise catalog from the static JSON asset at
 * /assets/Json/fitnexus_exercises_final.json (see RawCatalogExercise
 * for its shape) and exposes it as CatalogExercise[] — name,
 * muscleGroup (mapped from the dataset's free-form `primaryMuscles[0]`
 * via mapRawMuscleToGroup), imageUrl, and the rest of the raw fields
 * passed straight through for the exercise-details modal.
 *
 * imageUrl is built directly from the naming convention the image
 * files actually use: "<exercise name> Exercise Guide.png" under
 * /assets/exercise_images. Not every exercise has a matching file yet
 * (more images are still being added) — the <img> that renders this
 * just hides itself on a 404 rather than the catalog trying to
 * pre-verify every file exists.
 *
 * Fetched once per app load and shared (shareReplay) since it's a
 * static asset, not per-organization data. */
@Injectable({ providedIn: 'root' })
export class ExerciseCatalogService {
  private http = inject(HttpClient);
  private catalog$?: Observable<CatalogExercise[]>;

  list(): Observable<CatalogExercise[]> {
    if (!this.catalog$) {
      this.catalog$ = this.http.get<RawCatalogExercise[]>('/assets/Json/fitnexus_exercises_final.json').pipe(
        map((raw) =>
          raw.map((e) => ({
            name: e.name,
            muscleGroup: mapRawMuscleToGroup(e.primaryMuscles?.[0]),
            imageUrl: IMAGE_BASE + encodeURIComponent(`${e.name} Exercise Guide.png`),
            level: e.level,
            equipment: e.equipment,
            category: e.category,
            primaryMuscles: e.primaryMuscles,
            secondaryMuscles: e.secondaryMuscles,
            instructions: e.instructions,
          })),
        ),
        shareReplay(1),
      );
    }
    return this.catalog$;
  }
}
