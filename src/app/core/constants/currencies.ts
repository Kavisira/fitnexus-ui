/** Shared currency list used anywhere a currency dropdown is needed
 * (branches, and later billing/subscriptions). Keep this the single
 * source of truth — do not hardcode currency options in a component. */
export interface CurrencyOption {
  label: string;
  value: string;
}

export const CURRENCIES: CurrencyOption[] = [
  { label: 'USD - US Dollar', value: 'USD' },
  { label: 'INR - Indian Rupee', value: 'INR' },
  { label: 'EUR - Euro', value: 'EUR' },
  { label: 'GBP - British Pound', value: 'GBP' },
  { label: 'AED - UAE Dirham', value: 'AED' },
  { label: 'SGD - Singapore Dollar', value: 'SGD' },
  { label: 'AUD - Australian Dollar', value: 'AUD' },
  { label: 'CAD - Canadian Dollar', value: 'CAD' },
];

/** Resolves an ISO 4217 currency code to its display symbol (e.g. "INR"
 * -> "₹", "USD" -> "$") using the browser's own Intl data instead of a
 * hardcoded map, so it stays correct for any currency without upkeep
 * here. Falls back to the code itself if the browser can't resolve it. */
export function currencySymbol(code: string | null | undefined): string {
  if (!code) {
    return '';
  }
  try {
    const parts = new Intl.NumberFormat('en', {
      style: 'currency',
      currency: code,
      currencyDisplay: 'narrowSymbol',
    }).formatToParts(0);
    return parts.find((p) => p.type === 'currency')?.value ?? code;
  } catch {
    return code;
  }
}
