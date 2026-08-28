/** Shared payment-mode list — just a record of how a member paid, since
 * there's no payment gateway wired up yet (see the Members doc comment).
 * Same plain-string, no-DB-enum pattern as currencies/lead-sources. */
export interface PaymentModeOption {
  label: string;
  value: string;
}

export const PAYMENT_MODES: PaymentModeOption[] = [
  { label: 'Cash', value: 'Cash' },
  { label: 'Card', value: 'Card' },
  { label: 'UPI', value: 'UPI' },
  { label: 'Bank transfer', value: 'Bank Transfer' },
  { label: 'Other', value: 'Other' },
];
