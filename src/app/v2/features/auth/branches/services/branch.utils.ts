import { Branch } from '../../../../../core/branches/branch-api.service';

export interface BranchFormValue {
  location: string;
  address: string;
  phone: string;
  email: string;
  timezone: string;
  currency: string;
  taxRatePercent: number | null;
  defaultLanguage: string;
  memberCount: number | null;
  isMainBranch: boolean;
}

export const LANGUAGE_OPTIONS: { label: string; value: string }[] = [
  { label: 'English', value: 'en' },
  { label: 'தமிழ்', value: 'ta' },
];

export function languageLabel(code: string | null | undefined): string {
  if (code === 'ta') return 'தமிழ்';
  if (code === 'en') return 'English';
  return orDash(code);
}

/** Card/table values should never render blank. */
export function orDash(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') {
    return '-';
  }
  return String(value);
}

/** Returns an error message, or null when the form is valid. Mirrors the
 * old branches.ts reactive-form validators (location required/min length,
 * tax rate 0-100 required, member count required/min 0, email format). */
export function validateBranchForm(v: BranchFormValue): string | null {
  if (!v.location || v.location.trim().length < 3) {
    return 'Location must be at least 3 characters.';
  }
  if (v.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) {
    return 'Please enter a valid email address.';
  }
  if (v.taxRatePercent === null || v.taxRatePercent === undefined) {
    return 'Please enter a tax rate.';
  }
  if (v.taxRatePercent < 0 || v.taxRatePercent > 100) {
    return 'Tax rate must be between 0 and 100.';
  }
  if (v.memberCount === null || v.memberCount === undefined || v.memberCount < 0) {
    return 'Please enter a member count.';
  }
  return null;
}
