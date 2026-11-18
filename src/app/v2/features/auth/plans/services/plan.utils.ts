import { PlanDuration } from '../../../../../core/plans/plan-api.service';

export interface PlanFormValue {
  branchId: string;
  name: string;
  price: number | null;
  duration: PlanDuration;
}

export const DURATION_OPTIONS: { label: string; value: PlanDuration }[] = [
  { label: 'Monthly', value: 'MONTHLY' },
  { label: 'Quarterly', value: 'QUARTERLY' },
  { label: 'Annual', value: 'ANNUAL' },
  { label: 'Class pack', value: 'CLASS_PACK' },
  { label: 'Drop-in', value: 'DROP_IN' },
];

export function durationLabel(duration: PlanDuration): string {
  return DURATION_OPTIONS.find((d) => d.value === duration)?.label ?? duration;
}

/** Card/table values should never render blank. */
export function orDash(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') {
    return '-';
  }
  return String(value);
}

/** Returns an error message, or null when the form is valid. Mirrors the
 * old plans.ts reactive-form validators (branch required, name
 * required/min length 2, price required/min 0). Name uniqueness is
 * per-branch and enforced server-side only — never pre-validated here,
 * same as the old UI. */
export function validatePlanForm(v: PlanFormValue): string | null {
  if (!v.branchId) {
    return 'Please select a branch.';
  }
  if (!v.name || v.name.trim().length < 2) {
    return 'Name must be at least 2 characters.';
  }
  if (v.price === null || v.price === undefined || v.price < 0) {
    return 'Please enter a valid price.';
  }
  return null;
}

/** Total = price * (1 + branch tax rate), formatted to 2 decimals — the
 * price is always entered in the owning branch's currency and taxed at
 * that branch's rate; there's no separate currency/tax field on the
 * plan itself. */
export function priceWithTax(price: number | string, taxRatePercent: number | string | null | undefined): string {
  const rate = Number(taxRatePercent ?? 0) || 0;
  const total = Number(price) * (1 + rate / 100);
  return total.toFixed(2);
}
