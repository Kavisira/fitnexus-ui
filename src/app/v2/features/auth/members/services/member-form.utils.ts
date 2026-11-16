import { FormGroup } from '@angular/forms';
import { Member, PtDuration } from '../../../../../core/members/member-api.service';
import { PlanDuration } from '../../../../../core/plans/plan-api.service';

export function durationMonths(duration: PlanDuration | undefined): number {
  switch (duration) {
    case 'MONTHLY': return 1;
    case 'QUARTERLY': return 3;
    case 'ANNUAL': return 12;
    default: return 0;
  }
}

export function ptDurationMonths(duration: PtDuration | null | undefined): number {
  switch (duration) {
    case 'MONTHLY': return 1;
    case 'QUARTERLY': return 3;
    case 'HALF_YEARLY': return 6;
    case 'YEARLY': return 12;
    default: return 0;
  }
}

export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

export function compressImageToDataUrl(file: File, maxDim = 420, quality = 0.5): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Could not read image.'));
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas context unavailable.'));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

function getMemberPersonalValues(m: Member) {
  return {
    name: m.name, phone: m.phone, email: m.email || '', source: m.source || null,
    dateOfBirth: m.dateOfBirth ? new Date(m.dateOfBirth) : null, gender: m.gender || null,
    bloodGroup: m.bloodGroup || null, heightCm: m.heightCm ? Number(m.heightCm) : null,
    goalWeightKg: m.goalWeightKg ? Number(m.goalWeightKg) : null,
  };
}

function getMemberPlanValues(m: Member) {
  return {
    branchId: m.branchId, planId: m.planId, offerId: m.offerId || null,
    startDate: new Date(m.startDate), status: m.status, isTrial: Boolean(m.isTrial),
    paymentMode: m.paymentMode || null, amountPaid: m.amountPaid ? Number(m.amountPaid) : null,
    paymentFollowUpDate: m.paymentFollowUpDate ? new Date(m.paymentFollowUpDate) : null,
    notifyMemberOnPaymentDue: Boolean(m.notifyMemberOnPaymentDue),
    notifyGymOnPaymentDue: Boolean(m.notifyGymOnPaymentDue), settleBalance: false, weightKg: null,
  };
}

function getMemberPtValues(m: Member) {
  return {
    assignedTrainerEmployeeId: m.assignedTrainerEmployeeId || null,
    hasPersonalTrainer: Boolean(m.hasPersonalTrainer),
    ptStartDate: m.ptStartDate ? new Date(m.ptStartDate) : null,
    ptDuration: m.ptDuration || null, ptRatePerMonth: m.ptRatePerMonth ? Number(m.ptRatePerMonth) : null,
  };
}

export function populateFormFromMember(form: FormGroup, m: Member): void {
  form.reset({
    ...getMemberPersonalValues(m),
    ...getMemberPlanValues(m),
    ...getMemberPtValues(m),
  });
}

export function resetMemberFormValues(form: FormGroup, defaultBranch = ''): void {
  form.reset({
    branchId: defaultBranch, name: '', phone: '', email: '', source: null, planId: '',
    offerId: null, assignedTrainerEmployeeId: null, hasPersonalTrainer: false,
    ptStartDate: null, ptDuration: null, ptRatePerMonth: null, paymentMode: null, isTrial: false,
    startDate: new Date(), status: 'ACTIVE', dateOfBirth: null, gender: null, bloodGroup: null,
    heightCm: null, goalWeightKg: null, amountPaid: null, paymentFollowUpDate: null,
    notifyMemberOnPaymentDue: false, notifyGymOnPaymentDue: false, settleBalance: false, weightKg: null,
  });
}

export function validatePersonalStep(form: FormGroup): string | null {
  if (form.get('name')?.invalid || form.get('phone')?.invalid) {
    form.get('name')?.markAsTouched();
    form.get('phone')?.markAsTouched();
    return 'Please provide valid Name and Phone.';
  }
  return null;
}

export interface MembershipValidationOpts {
  isEditing: boolean;
  isCouple: boolean;
  partnerMode: string;
  partnerMemberId: string | null;
}

export function validateMembershipStep(
  form: FormGroup, partnerForm: FormGroup, opts: MembershipValidationOpts
): string | null {
  const reqFields = ['branchId', 'planId', 'startDate'];
  if (reqFields.some(f => form.get(f)?.invalid)) {
    reqFields.forEach(f => form.get(f)?.markAsTouched());
    return 'Please select Branch, Plan and Start Date.';
  }
  if (form.get('hasPersonalTrainer')?.value && !form.get('assignedTrainerEmployeeId')?.value) {
    form.get('assignedTrainerEmployeeId')?.markAsTouched();
    return 'Please assign a trainer for personal training.';
  }
  if (!opts.isEditing && opts.isCouple) {
    if (opts.partnerMode === 'new') {
      const val = partnerForm.value;
      if (!val.name || !val.phone) return 'Partner Name and Phone are required for couple offer.';
    } else if (!opts.partnerMemberId) {
      return 'Please select an existing member for couple offer.';
    }
  }
  return null;
}

export interface PaymentValidationOpts {
  paymentType: 'FULL' | 'PARTIAL';
  totalPayable: number;
  ptDurationExceeds: boolean;
}

function checkPartialPayment(form: FormGroup, opts: PaymentValidationOpts): string | null {
  if (opts.paymentType !== 'PARTIAL' || form.get('settleBalance')?.value) return null;
  const paid = form.get('amountPaid')?.value;
  if (paid === null || paid === undefined || paid < 0) {
    form.get('amountPaid')?.markAsTouched();
    return 'Please enter a valid amount paid.';
  }
  if (opts.totalPayable !== null && paid > opts.totalPayable) {
    form.get('amountPaid')?.markAsTouched();
    return 'Amount paid cannot exceed total payable.';
  }
  return null;
}

function checkPersonalTraining(form: FormGroup, opts: PaymentValidationOpts): string | null {
  if (!form.get('hasPersonalTrainer')?.value) return null;
  const ptStart = form.get('ptStartDate')?.value;
  const ptDur = form.get('ptDuration')?.value;
  const ptRate = form.get('ptRatePerMonth')?.value;
  if (!ptStart || !ptDur || ptRate === null || ptRate === undefined) {
    ['ptStartDate', 'ptDuration', 'ptRatePerMonth'].forEach(f => form.get(f)?.markAsTouched());
    return 'Please fill in all personal training details.';
  }
  if (opts.ptDurationExceeds) {
    return 'PT duration cannot extend past the membership end date.';
  }
  return null;
}

export function validatePaymentStep(form: FormGroup, opts: PaymentValidationOpts): string | null {
  if (form.get('paymentMode')?.invalid) {
    form.get('paymentMode')?.markAsTouched();
    return 'Please select a payment mode.';
  }
  return checkPartialPayment(form, opts) ?? checkPersonalTraining(form, opts);
}

export function stepForControl(name: string): number {
  if (['name', 'phone', 'email', 'source'].includes(name)) return 0;
  if (['branchId', 'planId', 'startDate', 'assignedTrainerEmployeeId'].includes(name)) return 1;
  if (['paymentMode', 'ptStartDate', 'ptDuration', 'ptRatePerMonth', 'amountPaid', 'paymentFollowUpDate'].includes(name)) return 2;
  return 3;
}
