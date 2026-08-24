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
