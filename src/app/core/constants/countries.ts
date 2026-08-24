/** Shared country list used anywhere a country dropdown is needed
 * (currently just Branches). Each entry also carries the IANA timezone
 * that a branch in that country defaults to — Branches picks it up
 * automatically the moment a country is selected, so timezone is never
 * a manual field. Keep this the single source of truth — do not
 * hardcode country options in a component.
 *
 * Countries that legitimately span multiple timezones (US, Canada,
 * Russia, Australia, etc.) default to their most common/capital-region
 * zone; it's a sensible starting point, not a guarantee — nothing stops
 * timezone from being corrected later if a more precise value is added
 * to the form. */
export interface CountryOption {
  label: string;
  value: string;
  timezone: string;
}

export const COUNTRIES: CountryOption[] = [
  { label: 'India', value: 'India', timezone: 'Asia/Kolkata' },
  { label: 'United States', value: 'United States', timezone: 'America/New_York' },
  { label: 'United Kingdom', value: 'United Kingdom', timezone: 'Europe/London' },
  { label: 'United Arab Emirates', value: 'United Arab Emirates', timezone: 'Asia/Dubai' },
  { label: 'Singapore', value: 'Singapore', timezone: 'Asia/Singapore' },
  { label: 'Australia', value: 'Australia', timezone: 'Australia/Sydney' },
  { label: 'Canada', value: 'Canada', timezone: 'America/Toronto' },
  { label: 'Germany', value: 'Germany', timezone: 'Europe/Berlin' },
  { label: 'France', value: 'France', timezone: 'Europe/Paris' },
  { label: 'Sri Lanka', value: 'Sri Lanka', timezone: 'Asia/Colombo' },
  { label: 'Nepal', value: 'Nepal', timezone: 'Asia/Kathmandu' },
  { label: 'Bangladesh', value: 'Bangladesh', timezone: 'Asia/Dhaka' },
  { label: 'Malaysia', value: 'Malaysia', timezone: 'Asia/Kuala_Lumpur' },
  { label: 'Saudi Arabia', value: 'Saudi Arabia', timezone: 'Asia/Riyadh' },
  { label: 'Qatar', value: 'Qatar', timezone: 'Asia/Qatar' },
  { label: 'South Africa', value: 'South Africa', timezone: 'Africa/Johannesburg' },
  { label: 'New Zealand', value: 'New Zealand', timezone: 'Pacific/Auckland' },
  { label: 'Japan', value: 'Japan', timezone: 'Asia/Tokyo' },
  { label: 'China', value: 'China', timezone: 'Asia/Shanghai' },
  { label: 'Other', value: 'Other', timezone: 'UTC' },
];
