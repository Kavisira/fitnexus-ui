/** Shared join-source list for Members — same pattern as
 * core/constants/lead-sources.ts: a plain string on the record, options
 * maintained in one place rather than a DB enum. Includes everything
 * Leads has plus "Converted from lead", since a member signing up is
 * often the tail end of a lead. */
export interface MemberSourceOption {
  label: string;
  value: string;
}

export const MEMBER_SOURCES: MemberSourceOption[] = [
  { label: 'Walk-in', value: 'Walk-in' },
  { label: 'Referral', value: 'Referral' },
  { label: 'Instagram', value: 'Instagram' },
  { label: 'Facebook', value: 'Facebook' },
  { label: 'Website', value: 'Website' },
  { label: 'Phone enquiry', value: 'Phone Enquiry' },
  { label: 'Event / trial class', value: 'Event / Trial Class' },
  { label: 'Converted from lead', value: 'Converted from Lead' },
  { label: 'Other', value: 'Other' },
];
