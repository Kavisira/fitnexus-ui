import { Injectable, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MemberPayload, MemberStatus, PtDuration } from '../../../../../core/members/member-api.service';
import { Plan } from '../../../../../core/plans/plan-api.service';
import { Offer } from '../../../../../core/offers/offer-api.service';
import { Gender } from '../../../../../core/constants/genders';
import { durationMonths, ptDurationMonths, addMonths, compressImageToDataUrl } from './member-form.utils';

export interface ToPayloadOptions {
  profilePhotoUrl?: string | null;
  metricPhotoUrl?: string | null;
  editingId?: string | null;
  partnerMode?: 'new' | 'existing';
  partnerForm?: FormGroup;
  partnerMemberId?: string | null;
  isCoupleOffer?: boolean;
  paymentType?: 'FULL' | 'PARTIAL';
}

function buildPartnerPayload(options: ToPayloadOptions): Partial<MemberPayload> {
  if (options.editingId || !options.isCoupleOffer) return {};
  if (options.partnerMode === 'new' && options.partnerForm) {
    const val = options.partnerForm.value;
    return {
      partnerNew: {
        name: val.name,
        phone: val.phone,
        email: val.email || undefined,
      },
    };
  }
  if (options.partnerMode === 'existing' && options.partnerMemberId) {
    return { partnerMemberId: options.partnerMemberId };
  }
  return {};
}

function buildMetricsPayload(raw: Record<string, unknown>, photoUrl?: string | null): Partial<MemberPayload> {
  const weight = raw['weightKg'] as number | undefined;
  if (!weight) return {};
  return {
    weightKg: weight,
    chestCm: (raw['chestCm'] as number) ?? undefined,
    waistCm: (raw['waistCm'] as number) ?? undefined,
    hipsCm: (raw['hipsCm'] as number) ?? undefined,
    armsCm: (raw['armsCm'] as number) ?? undefined,
    thighCm: (raw['thighCm'] as number) ?? undefined,
    calfCm: (raw['calfCm'] as number) ?? undefined,
    shouldersCm: (raw['shouldersCm'] as number) ?? undefined,
    metricPhotoDataUrl: photoUrl ?? undefined,
  };
}

function buildPtPayload(raw: Record<string, unknown>): Partial<MemberPayload> {
  if (!raw['hasPersonalTrainer']) {
    return { hasPersonalTrainer: false };
  }
  return {
    hasPersonalTrainer: true,
    ptDuration: (raw['ptDuration'] as PtDuration) ?? undefined,
    ptRatePerMonth: (raw['ptRatePerMonth'] as number) ?? undefined,
    ptStartDate: raw['ptStartDate'] ? new Date(raw['ptStartDate'] as string | Date).toISOString() : undefined,
  };
}

function buildPaymentPayload(raw: Record<string, unknown>, options: ToPayloadOptions): Partial<MemberPayload> {
  const isPartial = options.paymentType === 'PARTIAL';
  return {
    paymentMode: (raw['paymentMode'] as string) ?? undefined,
    amountPaid: isPartial ? (raw['amountPaid'] as number) ?? undefined : undefined,
    paymentFollowUpDate: isPartial && raw['paymentFollowUpDate']
      ? new Date(raw['paymentFollowUpDate'] as string | Date).toISOString()
      : undefined,
    notifyMemberOnPaymentDue: Boolean(raw['notifyMemberOnPaymentDue']),
    notifyGymOnPaymentDue: Boolean(raw['notifyGymOnPaymentDue']),
    ...(options.editingId && raw['settleBalance'] ? { settleBalance: true } : {}),
  };
}

function buildBioPayload(raw: Record<string, unknown>): Partial<MemberPayload> {
  return {
    dateOfBirth: raw['dateOfBirth'] ? new Date(raw['dateOfBirth'] as string | Date).toISOString() : undefined,
    gender: (raw['gender'] as Gender) ?? undefined,
    bloodGroup: (raw['bloodGroup'] as string) ?? undefined,
    heightCm: (raw['heightCm'] as number) ?? undefined,
    goalWeightKg: (raw['goalWeightKg'] as number) ?? undefined,
  };
}

@Injectable()
export class MemberFormService {
  private fb = inject(FormBuilder);

  buildForm(): FormGroup {
    return this.fb.group({
      branchId: ['', [Validators.required]],
      name: ['', [Validators.required, Validators.minLength(2)]],
      phone: ['', [Validators.required]],
      email: [''],
      source: [null as string | null],
      planId: ['', [Validators.required]],
      offerId: [null as string | null],
      assignedTrainerEmployeeId: [null as string | null],
      hasPersonalTrainer: [false],
      ptStartDate: [null as Date | null],
      ptDuration: [null as PtDuration | null],
      ptRatePerMonth: [null as number | null],
      paymentMode: [null as string | null, [Validators.required]],
      isTrial: [false],
      startDate: [new Date(), [Validators.required]],
      status: ['ACTIVE' as MemberStatus],
      dateOfBirth: [null as Date | null],
      gender: [null as Gender | null],
      bloodGroup: [null as string | null],
      heightCm: [null as number | null],
      goalWeightKg: [null as number | null],
      amountPaid: [null as number | null],
      paymentFollowUpDate: [null as Date | null],
      notifyMemberOnPaymentDue: [false],
      notifyGymOnPaymentDue: [false],
      settleBalance: [false],
      weightKg: [null as number | null],
      chestCm: [null as number | null],
      waistCm: [null as number | null],
      hipsCm: [null as number | null],
      armsCm: [null as number | null],
      thighCm: [null as number | null],
      calfCm: [null as number | null],
      shouldersCm: [null as number | null],
    });
  }

  buildPartnerForm(): FormGroup {
    return this.fb.group({
      name: ['', [Validators.required]],
      phone: ['', [Validators.required]],
      email: [''],
    });
  }

  calculateEndDate(startDate: Date, plan: Plan | null, offer: Offer | null): Date | null {
    if (!plan || !startDate) return null;
    const extraMonths = offer?.type === 'EXTRA_DURATION' ? offer.extraMonths ?? 0 : 0;
    return addMonths(new Date(startDate), durationMonths(plan.duration) + extraMonths);
  }

  calculatePrice(plan: Plan | null, offer: Offer | null): number | null {
    if (!plan) return null;
    const base = Number(plan.price);
    if (offer?.type === 'PERCENT_DISCOUNT') {
      return Math.max(0, base * (1 - Number(offer.percentValue) / 100));
    }
    if (offer?.type === 'FLAT_DISCOUNT') {
      return Math.max(0, base - Number(offer.flatAmount));
    }
    return base;
  }

  calculatePtTotal(ratePerMonth: number | null | undefined, duration: PtDuration | null | undefined): number | null {
    if (!ratePerMonth || !duration) return null;
    return Math.round(Number(ratePerMonth) * ptDurationMonths(duration) * 100) / 100;
  }

  toPayload(form: FormGroup, options: ToPayloadOptions = {}): MemberPayload {
    const raw = form.getRawValue() as Record<string, unknown>;
    const name = String(raw['name'] ?? '').trim();
    const phone = String(raw['phone'] ?? '').trim();
    const email = String(raw['email'] ?? '').trim();

    return {
      branchId: String(raw['branchId']),
      name,
      phone,
      email: email || undefined,
      photoDataUrl: options.profilePhotoUrl !== undefined ? options.profilePhotoUrl ?? undefined : undefined,
      source: (raw['source'] as string) ?? undefined,
      planId: String(raw['planId']),
      offerId: (raw['offerId'] as string) ?? undefined,
      assignedTrainerEmployeeId: (raw['assignedTrainerEmployeeId'] as string) ?? undefined,
      isTrial: Boolean(raw['isTrial']),
      startDate: new Date(raw['startDate'] as string | Date).toISOString(),
      status: (raw['status'] as MemberStatus) ?? 'ACTIVE',
      ...buildBioPayload(raw),
      ...buildPtPayload(raw),
      ...buildPaymentPayload(raw, options),
      ...buildMetricsPayload(raw, options.metricPhotoUrl),
      ...buildPartnerPayload(options),
    };
  }
}
export { durationMonths, ptDurationMonths, addMonths, compressImageToDataUrl };
