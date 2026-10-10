/** The muscle-group vocabulary the body-diagram component
 * (shared/muscle-diagram) knows how to highlight. Covers every
 * `primaryMuscles` value seen in assets/Json/fitnexus_exercises_final.json
 * (see mapRawMuscleToGroup below) plus FULL_BODY for anything not tied
 * to one specific region. */
export type MuscleGroup =
  | 'CHEST'
  | 'BACK'
  | 'LOWER_BACK'
  | 'SHOULDERS'
  | 'BICEPS'
  | 'TRICEPS'
  | 'FOREARMS'
  | 'TRAPS'
  | 'QUADS'
  | 'HAMSTRINGS'
  | 'GLUTES'
  | 'CALVES'
  | 'CORE'
  | 'FULL_BODY';

export const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  CHEST: 'Chest',
  BACK: 'Back',
  LOWER_BACK: 'Lower back',
  SHOULDERS: 'Shoulders',
  BICEPS: 'Biceps',
  TRICEPS: 'Triceps',
  FOREARMS: 'Forearms',
  TRAPS: 'Traps',
  QUADS: 'Quads',
  HAMSTRINGS: 'Hamstrings',
  GLUTES: 'Glutes',
  CALVES: 'Calves',
  CORE: 'Core',
  FULL_BODY: 'Full body',
};

export interface CatalogExercise {
  name: string;
  muscleGroup: MuscleGroup;
  /** Reference photo/illustration for this exercise, served from
   * /assets/exercise_images — see ExerciseCatalogService for how it's
   * matched up (filenames don't line up 1:1 with exercise names yet,
   * so some exercises share a close-enough image or have none; to be
   * tightened up later). Undefined when no image is available. */
  imageUrl?: string;
  /** Everything below is passed straight through from the raw JSON
   * dataset for the "View demo" details modal (see
   * shared/exercise-details-modal) — level/equipment/category as
   * quick-fact labels, instructions as the how-to steps. The dataset
   * has no separate "benefits" copy, so none is shown/invented. */
  level?: string;
  equipment?: string;
  category?: string;
  primaryMuscles?: string[];
  secondaryMuscles?: string[];
  instructions?: string[];
}

/** Shape of each entry in assets/Json/fitnexus_exercises_final.json —
 * see ExerciseCatalogService, which loads that file. */
export interface RawCatalogExercise {
  id: string;
  name: string;
  force: string | null;
  level: string;
  mechanic: string | null;
  equipment: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
  category: string;
}

/** Maps the free-form muscle strings used in the JSON dataset
 * ("abdominals", "quadriceps", "lower back", ...) onto the small,
 * diagram-friendly MuscleGroup vocabulary above. Unrecognized/empty
 * values fall back to FULL_BODY so the diagram still renders
 * something reasonable instead of nothing. */
const RAW_MUSCLE_TO_GROUP: Record<string, MuscleGroup> = {
  chest: 'CHEST',
  back: 'BACK',
  'lower back': 'LOWER_BACK',
  shoulders: 'SHOULDERS',
  biceps: 'BICEPS',
  triceps: 'TRICEPS',
  forearms: 'FOREARMS',
  traps: 'TRAPS',
  quadriceps: 'QUADS',
  hamstrings: 'HAMSTRINGS',
  glutes: 'GLUTES',
  calves: 'CALVES',
  abdominals: 'CORE',
};

export function mapRawMuscleToGroup(rawMuscle: string | undefined): MuscleGroup {
  if (!rawMuscle) return 'FULL_BODY';
  return RAW_MUSCLE_TO_GROUP[rawMuscle.toLowerCase().trim()] ?? 'FULL_BODY';
}
