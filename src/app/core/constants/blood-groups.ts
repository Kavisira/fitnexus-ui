/** Shared blood-group list — same plain-string, no-DB-enum pattern as
 * member-sources.ts/payment-modes.ts (the values themselves, e.g.
 * "A+", aren't valid Prisma enum identifiers anyway). */
export interface BloodGroupOption {
  label: string;
  value: string;
}

export const BLOOD_GROUPS: BloodGroupOption[] = [
  { label: 'A+', value: 'A+' },
  { label: 'A-', value: 'A-' },
  { label: 'B+', value: 'B+' },
  { label: 'B-', value: 'B-' },
  { label: 'AB+', value: 'AB+' },
  { label: 'AB-', value: 'AB-' },
  { label: 'O+', value: 'O+' },
  { label: 'O-', value: 'O-' },
];
