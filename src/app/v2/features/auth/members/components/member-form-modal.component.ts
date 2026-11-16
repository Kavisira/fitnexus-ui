import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzAlertModule } from 'ng-zorro-antd/alert';

import { Member, MemberPayload } from '../../../../../core/members/member-api.service';
import { Branch } from '../../../../../core/branches/branch-api.service';
import { Plan } from '../../../../../core/plans/plan-api.service';
import { Offer } from '../../../../../core/offers/offer-api.service';
import { Employee } from '../../../../../core/employees/employee-api.service';
import { currencySymbol } from '../../../../../core/constants/currencies';
import { MemberFormService } from '../services/member-form.service';
import {
  populateFormFromMember, resetMemberFormValues, validatePersonalStep,
  validateMembershipStep, validatePaymentStep, stepForControl,
} from '../services/member-form.utils';
import {
  calculateCouplePrice, calculateModalBmi, calculateTotalPayable,
  calculatePtPreview, calculateBalanceLabel, checkCouplePartnerValid, processImageUpload,
} from '../services/member-form-calc.utils';
import {
  StepPersonalComponent, StepMembershipComponent, StepPaymentComponent, StepMeasurementsComponent,
} from './steps';

@Component({
  selector: 'app-member-form-modal',
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule, NzModalModule, NzButtonModule,
    NzIconModule, NzAlertModule, StepPersonalComponent, StepMembershipComponent,
    StepPaymentComponent, StepMeasurementsComponent,
  ],
  templateUrl: './member-form-modal.component.html',
})
export class MemberFormModalComponent implements OnInit {
  private formService = inject(MemberFormService);

  readonly visible = input.required<boolean>();
  readonly editingMember = input<Member | null>(null);
  readonly saving = input(false);
  readonly branches = input.required<Branch[]>();
  readonly plans = input.required<Plan[]>();
  readonly offers = input.required<Offer[]>();
  readonly employees = input.required<Employee[]>();
  readonly allMembers = input<Member[]>([]);

  readonly cancel = output<void>();
  readonly save = output<{ payload: MemberPayload; memberId?: string }>();
  readonly wizardSteps = [{ label: 'Personal' }, { label: 'Membership' }, { label: 'Payment' }, { label: 'Measurements' }];

  readonly wizardStep = signal(0);
  readonly errorMessage = signal<string | null>(null);
  readonly profilePhotoDataUrl = signal<string | null>(null);
  readonly profilePhotoCleared = signal(false);
  readonly metricPhotoDataUrl = signal<string | null>(null);
  readonly photoProcessing = signal(false);
  readonly partnerMode = signal<'new' | 'existing'>('new');
  readonly partnerMemberId = signal<string | null>(null);
  readonly paymentType = signal<'FULL' | 'PARTIAL'>('FULL');

  readonly form: FormGroup = this.formService.buildForm();
  readonly partnerForm: FormGroup = this.formService.buildPartnerForm();
  private formValue = toSignal(this.form.valueChanges, { initialValue: this.form.value });

  readonly selectedBranchId = computed(() => this.formValue()?.branchId ?? '');
  readonly selectedBranch = computed(() => this.branches().find(b => b.id === this.selectedBranchId()) ?? null);
  readonly selectedPlan = computed(() => this.plans().find(p => p.id === this.formValue()?.planId) ?? null);
  readonly selectedOffer = computed(() => this.offers().find(o => o.id === this.formValue()?.offerId) ?? null);
  readonly isCoupleOffer = computed(() => this.selectedOffer()?.type === 'COUPLE');
  readonly currency = computed(() => currencySymbol(this.selectedBranch()?.currency));

  readonly endDatePreview = computed(() => this.formService.calculateEndDate(this.formValue()?.startDate, this.selectedPlan(), this.selectedOffer()));
  readonly planPricePreview = computed(() => this.formService.calculatePrice(this.selectedPlan(), this.selectedOffer()));
  readonly pricePreviewLabel = computed(() => this.planPricePreview() !== null ? `${this.currency()}${this.planPricePreview()!.toFixed(2)}` : null);
  readonly partnerPricePreview = computed(() => calculateCouplePrice(this.selectedPlan(), this.selectedOffer(), this.currency()));

  private ptPreview = computed(() => calculatePtPreview(this.formValue(), this.currency()));
  readonly ptTotalPreview = computed(() => this.ptPreview().total);
  readonly ptEndDatePreview = computed(() => this.ptPreview().endDate);
  readonly ptDurationExceedsMembership = computed(() => {
    const end = this.ptEndDatePreview();
    const mem = this.endDatePreview();
    return Boolean(end && mem && end.getTime() > mem.getTime());
  });

  readonly totalPayable = computed(() => calculateTotalPayable(this.planPricePreview(), this.formValue()));
  readonly balanceDueLabel = computed(() => calculateBalanceLabel(
    this.paymentType(), Boolean(this.formValue()?.settleBalance), this.totalPayable(), this.formValue()?.amountPaid, this.currency()
  ));
  readonly showFollowUpSection = computed(() => this.paymentType() === 'PARTIAL' && !this.formValue()?.settleBalance && this.totalPayable() - (this.formValue()?.amountPaid ?? 0) > 0);
  readonly showSettleBalance = computed(() => {
    const m = this.editingMember();
    return Boolean(m && this.paymentType() === 'PARTIAL' && m.amountPaid !== null && Number(m.price) - Number(m.amountPaid) > 0.004);
  });
  readonly wizardBmiPreview = computed(() => calculateModalBmi(this.formValue()?.weightKg, this.formValue()?.heightCm));

  ngOnInit(): void {
    const edit = this.editingMember();
    this.wizardStep.set(0);
    this.errorMessage.set(null);
    this.profilePhotoDataUrl.set(edit?.photoUrl ?? null);
    this.profilePhotoCleared.set(false);
    this.metricPhotoDataUrl.set(null);
    if (edit) {
      const bal = edit.amountPaid !== null ? Number(edit.price) + (edit.hasPersonalTrainer ? Number(edit.ptTotal ?? 0) : 0) - Number(edit.amountPaid) : 0;
      this.paymentType.set(bal > 0.004 ? 'PARTIAL' : 'FULL');
      populateFormFromMember(this.form, edit);
    } else {
      this.partnerMode.set('new');
      this.partnerMemberId.set(null);
      this.paymentType.set('FULL');
      resetMemberFormValues(this.form, this.branches().length === 1 ? this.branches()[0].id : '');
      this.partnerForm.reset({ name: '', phone: '', email: '' });
    }
    this.form.get('paymentFollowUpDate')?.valueChanges.subscribe(d => { if (d) this.form.get('notifyGymOnPaymentDue')?.setValue(true); });
  }

  canJumpToStep(i: number): boolean { return Boolean(this.editingMember()) || i <= this.wizardStep(); }
  goToStep(i: number): void { if (this.canJumpToStep(i)) { this.errorMessage.set(null); this.wizardStep.set(i); } }

  setPaymentType(type: 'FULL' | 'PARTIAL'): void {
    this.paymentType.set(type);
    if (type === 'FULL') this.form.patchValue({ amountPaid: null, paymentFollowUpDate: null });
  }

  onPersonalTrainerToggle(): void {
    const hasPt = this.form.get('hasPersonalTrainer')?.value;
    const start = this.form.get('startDate')?.value ?? new Date();
    this.form.patchValue(hasPt ? { ptStartDate: this.editingMember() ? new Date() : new Date(start) } : { ptStartDate: null, ptDuration: null, ptRatePerMonth: null });
  }

  async onProfilePhotoSelected(e: Event): Promise<void> {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.photoProcessing.set(true);
    await processImageUpload(file, u => { this.profilePhotoDataUrl.set(u); this.profilePhotoCleared.set(false); }, () => this.errorMessage.set('Could not process photo.'), () => this.photoProcessing.set(false));
  }

  clearProfilePhoto(): void { this.profilePhotoDataUrl.set(null); this.profilePhotoCleared.set(true); }

  async onMetricPhotoSelected(e: Event): Promise<void> {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.photoProcessing.set(true);
    await processImageUpload(file, u => this.metricPhotoDataUrl.set(u), () => this.errorMessage.set('Could not process photo.'), () => this.photoProcessing.set(false));
  }

  nextStep(): void {
    this.errorMessage.set(null);
    const s = this.wizardStep();
    let err: string | null = null;
    if (s === 0) err = validatePersonalStep(this.form);
    else if (s === 1) err = validateMembershipStep(this.form, this.partnerForm, {
      isEditing: Boolean(this.editingMember()), isCouple: this.isCoupleOffer(), partnerMode: this.partnerMode(), partnerMemberId: this.partnerMemberId(),
    });
    else if (s === 2) err = validatePaymentStep(this.form, {
      paymentType: this.paymentType(), totalPayable: this.totalPayable(), ptDurationExceeds: this.ptDurationExceedsMembership(),
    });
    if (err) { this.errorMessage.set(err); return; }
    this.wizardStep.update(cur => Math.min(3, cur + 1));
  }

  prevStep(): void { this.errorMessage.set(null); this.wizardStep.update(s => Math.max(0, s - 1)); }

  submit(): void {
    this.errorMessage.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      const first = Object.keys(this.form.controls).find(k => this.form.get(k)?.invalid);
      this.wizardStep.set(first ? stepForControl(first) : 0);
      this.errorMessage.set('Please fill all required fields correctly.');
      return;
    }
    const partnerErr = checkCouplePartnerValid(Boolean(this.editingMember()), this.isCoupleOffer(), this.partnerMode(), this.partnerForm, this.partnerMemberId());
    if (partnerErr) { this.partnerForm.markAllAsTouched(); this.wizardStep.set(1); this.errorMessage.set(partnerErr); return; }

    const payErr = validatePaymentStep(this.form, {
      paymentType: this.paymentType(), totalPayable: this.totalPayable(), ptDurationExceeds: this.ptDurationExceedsMembership(),
    });
    if (payErr) { this.wizardStep.set(2); this.errorMessage.set(payErr); return; }

    const editing = this.editingMember();
    const payload = this.formService.toPayload(this.form, {
      profilePhotoUrl: this.profilePhotoCleared() ? null : this.profilePhotoDataUrl(),
      metricPhotoUrl: this.metricPhotoDataUrl(), editingId: editing?.id, partnerMode: this.partnerMode(),
      partnerForm: this.partnerForm, partnerMemberId: this.partnerMemberId(), isCoupleOffer: this.isCoupleOffer(), paymentType: this.paymentType(),
    });
    this.save.emit({ payload, memberId: editing?.id });
  }
}
