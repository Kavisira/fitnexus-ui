import { FormGroup } from '@angular/forms';
import { Plan } from '../../../../../core/plans/plan-api.service';
import { Offer } from '../../../../../core/offers/offer-api.service';
import { PtDuration } from '../../../../../core/members/member-api.service';
import { computeBmi, bmiStatus } from '../../../../../core/constants/bmi';
import { ptDurationMonths, addMonths, compressImageToDataUrl } from './member-form.utils';

export function calculateCouplePrice(plan: Plan | null, offer: Offer | null, symbol: string): string | null {
  if (!plan || offer?.type !== 'COUPLE') return null;
  const discount = Number(offer.percentValue ?? 0);
  const price = Math.max(0, Number(plan.price) * (1 - discount / 100));
  return `${symbol}${price.toFixed(2)}`;
}

export function calculateModalBmi(w: number | null | undefined, h: number | null | undefined) {
  if (!w || !h) return null;
  const val = computeBmi(Number(w), Number(h));
  const status = bmiStatus(val);
  const colorMap: Record<string, string> = {
    UNDERWEIGHT: 'orange',
    NORMAL: 'green',
    OVERWEIGHT: 'gold',
    OBESE: 'red',
  };
  return { value: val, status: status.replace('_', ' '), color: colorMap[status] ?? 'default' };
}

export function calculateTotalPayable(planPrice: number | null, formVal: Record<string, unknown> | null): number {
  const base = planPrice ?? 0;
  const hasPt = Boolean(formVal?.['hasPersonalTrainer']);
  const rate = Number(formVal?.['ptRatePerMonth'] ?? 0);
  const dur = formVal?.['ptDuration'] as PtDuration | null | undefined;
  const pt = hasPt && rate && dur ? Math.round(rate * ptDurationMonths(dur) * 100) / 100 : 0;
  return Math.round((base + pt) * 100) / 100;
}

export function calculatePtPreview(formVal: Record<string, unknown> | null, currency: string) {
  if (!formVal?.['hasPersonalTrainer'] || !formVal['ptDuration'] || formVal['ptRatePerMonth'] === null) {
    return { total: null, endDate: null };
  }
  const dur = formVal['ptDuration'] as PtDuration;
  const tot = Math.round(Number(formVal['ptRatePerMonth']) * ptDurationMonths(dur) * 100) / 100;
  const end = formVal['ptStartDate'] ? addMonths(new Date(formVal['ptStartDate'] as string | Date), ptDurationMonths(dur)) : null;
  return { total: `${currency}${tot.toFixed(2)}`, endDate: end };
}

export function calculateBalanceLabel(
  type: string, isSettled: boolean, total: number, paid: number | null | undefined, currency: string
): string | null {
  if (type !== 'PARTIAL') return null;
  if (isSettled) return `${currency}0.00`;
  if (paid === null || paid === undefined) return null;
  const due = Math.max(0, Math.round((total - paid) * 100) / 100);
  return `${currency}${due.toFixed(2)}`;
}

export function checkCouplePartnerValid(
  isEditing: boolean, isCouple: boolean, mode: string, pForm: FormGroup, pId: string | null
): string | null {
  if (isEditing || !isCouple) return null;
  if (mode === 'new') {
    const v = pForm.value;
    if (!v.name || !v.phone) return 'Partner Name and Phone are required for couple offer.';
  } else if (!pId) {
    return 'Please select an existing member for couple offer.';
  }
  return null;
}

export async function processImageUpload(
  file: File, onSuccess: (url: string) => void, onError: () => void, onDone: () => void
): Promise<void> {
  if (!file.type.startsWith('image/')) {
    onError();
    onDone();
    return;
  }
  try {
    const dataUrl = await compressImageToDataUrl(file);
    onSuccess(dataUrl);
  } catch {
    onError();
  } finally {
    onDone();
  }
}
