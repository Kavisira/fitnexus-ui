/** Mirrors the Prisma `Gender` enum — purely used to pick which
 * body-shape preset the progress avatar renders with. */
export type Gender = 'MALE' | 'FEMALE' | 'OTHER';

export interface GenderOption {
  label: string;
  value: Gender;
}

export const GENDERS: GenderOption[] = [
  { label: 'Male', value: 'MALE' },
  { label: 'Female', value: 'FEMALE' },
  { label: 'Other / prefer not to say', value: 'OTHER' },
];
