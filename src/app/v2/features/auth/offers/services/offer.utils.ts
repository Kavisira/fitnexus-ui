import { Offer, OfferType } from '../../../../../core/offers/offer-api.service';
import { FilterOption } from '../../../../shared/components/filter-dropdown/filter-dropdown.component';

export const OFFER_TYPE_OPTIONS: { label: string; value: OfferType }[] = [
  { label: 'Percentage discount', value: 'PERCENT_DISCOUNT' },
  { label: 'Flat amount discount', value: 'FLAT_DISCOUNT' },
  { label: 'Extra free duration', value: 'EXTRA_DURATION' },
  { label: 'Couple offer (2nd member)', value: 'COUPLE' },
];

export const OFFER_TYPE_FILTER_OPTIONS: FilterOption[] = OFFER_TYPE_OPTIONS.map((o) => ({ label: o.label, value: o.value }));

export function offerTypeLabel(type: OfferType): string {
  return OFFER_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type;
}

/** NG-ZORRO icon per offer type, used on cards. */
export function offerTypeIcon(type: OfferType): string {
  switch (type) {
    case 'FLAT_DISCOUNT': return 'dollar';
    case 'EXTRA_DURATION': return 'clock-circle';
    case 'COUPLE': return 'team';
    default: return 'percentage';
  }
}

/** Human-readable one-liner, e.g. "10% off", "500.00 off", "+1 month(s) free",
 * "2nd member 100% off". FLAT_DISCOUNT has no currency of its own — it is
 * charged in whichever branch's currency the offer is applied against. */
export function offerSummary(offer: Offer): string {
  switch (offer.type) {
    case 'PERCENT_DISCOUNT':
      return `${Number(offer.percentValue)}% off`;
    case 'FLAT_DISCOUNT':
      return `${Number(offer.flatAmount).toFixed(2)} off`;
    case 'EXTRA_DURATION':
      return `+${offer.extraMonths} month(s) free`;
    case 'COUPLE': {
      const percent = Number(offer.percentValue);
      return percent >= 100 ? '2nd member free' : `2nd member ${percent}% off`;
    }
    default:
      return offer.name;
  }
}

export interface OfferFormValue {
  name: string;
  type: OfferType;
  percentValue: number | null;
  flatAmount: number | null;
  extraMonths: number | null;
  isActive: boolean;
}

/** Returns an error message, or null when the form is valid for its type. */
export function validateOfferForm(v: OfferFormValue): string | null {
  if (!v.name || v.name.trim().length < 2) return 'Offer name must be at least 2 characters.';
  if ((v.type === 'PERCENT_DISCOUNT' || v.type === 'COUPLE') && !v.percentValue) return 'Please enter a discount percentage.';
  if (v.type === 'FLAT_DISCOUNT' && !v.flatAmount) return 'Please enter a flat discount amount.';
  if (v.type === 'EXTRA_DURATION' && !v.extraMonths) return 'Please enter the number of free months.';
  return null;
}
