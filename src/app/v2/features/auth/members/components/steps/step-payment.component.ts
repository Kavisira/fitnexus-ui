import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { PtDuration } from '../../../../../../core/members/member-api.service';
import { PAYMENT_MODES } from '../../../../../../core/constants/payment-modes';

@Component({
  selector: 'app-step-payment',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NzSelectModule,
    NzRadioModule,
    NzDatePickerModule,
    NzInputNumberModule,
    NzCheckboxModule,
    NzAlertModule,
  ],
  template: `
    <div [formGroup]="form()" class="space-y-4">
      <!-- Row 1: Payment Mode & Price Preview -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div>
          <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Payment mode *</label>
          <nz-select formControlName="paymentMode" [nzShowSearch]="true" nzPlaceHolder="Select payment mode" class="w-full !h-9">
            @for (pm of paymentModes; track pm.value) {
              <nz-option [nzLabel]="pm.label" [nzValue]="pm.value"></nz-option>
            }
          </nz-select>
        </div>

        <div>
          <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Membership fee</label>
          <div class="h-9 px-3.5 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center text-xs font-bold text-gray-900 dark:text-white">
            {{ pricePreview() ?? '—' }}
          </div>
        </div>
      </div>

      <!-- Row 2: Payment Type (Full vs Partial) -->
      <div class="p-3 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-200 dark:border-gray-700 space-y-1.5">
        <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300">Payment status</label>
        <nz-radio-group [ngModel]="paymentType()" (ngModelChange)="paymentTypeChange.emit($event)" [ngModelOptions]="{standalone: true}" class="flex gap-4">
          <label nz-radio nzValue="FULL">Full payment</label>
          <label nz-radio nzValue="PARTIAL">Partial payment</label>
        </nz-radio-group>
      </div>

      <!-- Personal Training Panel -->
      @if (form().get('hasPersonalTrainer')?.value) {
        <div class="p-3.5 bg-purple-50/50 dark:bg-purple-950/20 rounded-2xl border border-purple-100 dark:border-purple-900/40 space-y-3">
          <div class="text-xs font-bold text-purple-900 dark:text-purple-300">Personal training</div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">PT start date *</label>
              <nz-date-picker formControlName="ptStartDate" class="w-full !h-9 !rounded-xl"></nz-date-picker>
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">PT duration *</label>
              <nz-select formControlName="ptDuration" [nzShowSearch]="true" nzPlaceHolder="Select duration" class="w-full !h-9">
                @for (d of ptDurationOptions; track d.value) {
                  <nz-option [nzLabel]="d.label" [nzValue]="d.value"></nz-option>
                }
              </nz-select>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">PT rate per month *</label>
              <nz-input-number formControlName="ptRatePerMonth" [nzPrefix]="currency()" [nzMin]="0" class="!w-full !h-9 !rounded-xl"></nz-input-number>
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">PT total fee</label>
              <div class="h-9 px-3.5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center text-xs font-bold text-purple-600">
                {{ ptTotalPreview() ?? '—' }}
              </div>
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">PT end date</label>
            <div class="h-9 px-3.5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center text-xs text-gray-700 dark:text-gray-300">
              {{ ptEndDate() ? (ptEndDate() | date: 'MMM d, y') : '—' }}
            </div>
          </div>

          @if (ptDurationExceeds()) {
            <nz-alert nzType="error" nzMessage="PT duration cannot extend past the membership end date." nzShowIcon class="!rounded-xl"></nz-alert>
          }
        </div>
      }

      <!-- Partial Payment Panel -->
      @if (paymentType() === 'PARTIAL') {
        <div class="p-3.5 bg-amber-50/50 dark:bg-amber-950/20 rounded-2xl border border-amber-100 dark:border-amber-900/40 space-y-3">
          @if (showSettle()) {
            <label nz-checkbox formControlName="settleBalance">
              <span class="text-xs font-bold text-gray-900 dark:text-white">Settle remaining balance now</span>
            </label>
            <p class="text-[11px] text-gray-500">Marks the balance as fully paid, clears the follow-up reminder, and sends an updated invoice.</p>
          }

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-amber-900 dark:text-amber-200 mb-1">Amount paid now *</label>
              <nz-input-number formControlName="amountPaid" [nzPrefix]="currency()" [nzMin]="0" [nzMax]="totalPayable()" class="!w-full !h-9 !rounded-xl"></nz-input-number>
            </div>
            <div>
              <label class="block text-xs font-semibold text-amber-900 dark:text-amber-200 mb-1">Balance due</label>
              <div class="h-9 px-3.5 bg-white dark:bg-gray-800 rounded-xl border border-amber-200 dark:border-amber-800 flex items-center text-xs font-bold text-amber-600">
                {{ balanceDueLabel() ?? '—' }}
              </div>
            </div>
          </div>

          @if (showFollowUp()) {
            <div class="space-y-3 pt-2 border-t border-amber-200/50 dark:border-amber-800/40">
              <div>
                <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Follow-up date for balance</label>
                <nz-date-picker formControlName="paymentFollowUpDate" class="w-full !h-9 !rounded-xl"></nz-date-picker>
              </div>

              <div>
                <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Send WhatsApp payment reminder to</label>
                <div class="flex items-center gap-4">
                  <label nz-checkbox formControlName="notifyMemberOnPaymentDue"><span class="text-xs">Member</span></label>
                  <label nz-checkbox formControlName="notifyGymOnPaymentDue"><span class="text-xs">Gym (you)</span></label>
                </div>
              </div>
            </div>
          }
        </div>
      }

      <!-- Total Breakdown Summary Card -->
      <div class="p-3.5 bg-gray-900 text-white dark:bg-gray-800 rounded-2xl flex items-center justify-between text-xs">
        <span>Total Payable: <strong class="text-emerald-400 text-sm ml-1">{{ currency() }}{{ totalPayable() }}</strong></span>
        @if (paymentType() === 'PARTIAL') {
          <span>Balance Due: <strong class="text-amber-400 text-sm ml-1">{{ balanceDueLabel() ?? '—' }}</strong></span>
        }
      </div>

      <nz-alert nzType="info" nzMessage="A payment invoice will be sent over WhatsApp once this member is saved." nzShowIcon class="!rounded-xl"></nz-alert>
    </div>
  `,
})
export class StepPaymentComponent {
  readonly form = input.required<FormGroup>();
  readonly currency = input<string>('₹');
  readonly pricePreview = input<string | null>(null);
  readonly ptTotalPreview = input<string | null>(null);
  readonly ptEndDate = input<Date | null>(null);
  readonly ptDurationExceeds = input(false);
  readonly totalPayable = input<number>(0);
  readonly balanceDueLabel = input<string | null>(null);
  readonly showFollowUp = input(false);
  readonly showSettle = input(false);
  readonly paymentType = input<'FULL' | 'PARTIAL'>('FULL');

  readonly paymentTypeChange = output<'FULL' | 'PARTIAL'>();

  readonly paymentModes = PAYMENT_MODES;
  readonly ptDurationOptions: { label: string; value: PtDuration }[] = [
    { label: 'Monthly (1 mo)', value: 'MONTHLY' },
    { label: 'Quarterly (3 mo)', value: 'QUARTERLY' },
    { label: 'Half-yearly (6 mo)', value: 'HALF_YEARLY' },
    { label: 'Yearly (12 mo)', value: 'YEARLY' },
  ];
}
