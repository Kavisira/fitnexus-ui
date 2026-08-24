/** Shared lead-source list — same pattern as core/constants/currencies.ts
 * and countries.ts: a plain string on the Lead record, options
 * maintained in one place rather than a DB enum, so the list can grow
 * without a migration. */
export interface LeadSourceOption {
  label: string;
  value: string;
}

export const LEAD_SOURCES: LeadSourceOption[] = [
  { label: 'Walk-in', value: 'Walk-in' },
  { label: 'Referral', value: 'Referral' },
  { label: 'Instagram', value: 'Instagram' },
  { label: 'Facebook', value: 'Facebook' },
  { label: 'Website', value: 'Website' },
  { label: 'Phone enquiry', value: 'Phone Enquiry' },
  { label: 'Event / trial class', value: 'Event / Trial Class' },
  { label: 'Other', value: 'Other' },
];
