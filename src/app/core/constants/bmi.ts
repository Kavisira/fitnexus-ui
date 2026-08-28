/** Standard WHO adult BMI bands — mirrors the bmiStatus() logic in
 * MembersService server-side. Kept here too because the live preview
 * while logging a check-in (before it's saved) needs to compute this
 * client-side. */
export type BmiStatus = 'UNDERWEIGHT' | 'NORMAL' | 'OVERWEIGHT' | 'OBESE';

export function computeBmi(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
}

export function bmiStatus(bmi: number): BmiStatus {
  if (bmi < 18.5) return 'UNDERWEIGHT';
  if (bmi < 25) return 'NORMAL';
  if (bmi < 30) return 'OVERWEIGHT';
  return 'OBESE';
}

export const BMI_STATUS_LABEL: Record<BmiStatus, string> = {
  UNDERWEIGHT: 'Underweight',
  NORMAL: 'Normal',
  OVERWEIGHT: 'Overweight',
  OBESE: 'Obese',
};

export type TagSeverity = 'info' | 'success' | 'warn' | 'danger' | 'secondary';

export const BMI_STATUS_SEVERITY: Record<BmiStatus, TagSeverity> = {
  UNDERWEIGHT: 'info',
  NORMAL: 'success',
  OVERWEIGHT: 'warn',
  OBESE: 'danger',
};

/** Maps a BMI value onto a smooth 0 (very lean) - 1 (very heavy)
 * "heaviness" factor, clamped to a sane range — used to drive the
 * progress avatar's body-shape blend continuously rather than jumping
 * between a few discrete presets, so small month-to-month changes are
 * still visible. */
export function bmiHeaviness(bmi: number): number {
  const min = 17;
  const max = 34;
  return Math.max(0, Math.min(1, (bmi - min) / (max - min)));
}
