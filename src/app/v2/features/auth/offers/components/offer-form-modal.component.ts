import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';

import { Offer, OfferPayload, OfferType } from '../../../../../core/offers/offer-api.service';
import { OFFER_TYPE_OPTIONS, OfferFormValue, validateOfferForm } from '../services/offer.utils';

const LABEL = 'block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1';

@Component({
  selector: 'app-offer-form-modal',
  imports: [
    ReactiveFormsModule, NzAlertModule, NzButtonModule, NzCheckboxModule, NzInputModule,
    NzInputNumberModule, NzModalModule, NzSelectModule,
  ],
  template: `
    <nz-modal
      [nzVisible]="true"
      [nzTitle]="offer() ? 'Edit Offer' : 'Add Offer'"
      [nzFooter]="null"
      [nzWidth]="480"
      (nzOnCancel)="cancel.emit()"
    >
      <form *nzModalContent [formGroup]="form" (ngSubmit)="submit()" class="space-y-4" novalidate>
        <div>
          <label [class]="labelClass" for="offerName">Offer Name *</label>
          <input nz-input id="offerName" formControlName="name" placeholder="e.g. New Year 10% off" class="!h-9 !rounded-xl" />
        </div>

        <div>
          <label [class]="labelClass" for="offerType">Offer Type *</label>
          <nz-select id="offerType" formControlName="type" [nzShowSearch]="true" class="w-full">
            @for (o of typeOptions; track o.value) {
              <nz-option [nzLabel]="o.label" [nzValue]="o.value"></nz-option>
            }
          </nz-select>
        </div>

        @switch (formType()) {
          @case ('FLAT_DISCOUNT') {
            <div>
              <label [class]="labelClass" for="offerFlat">Flat Amount *</label>
              <nz-input-number id="offerFlat" formControlName="flatAmount" [nzMin]="0.01" [nzStep]="1" [nzPrecision]="2" class="!w-full !rounded-xl"></nz-input-number>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-0">Charged in the currency of the branch the offer is applied at.</p>
            </div>
          }
          @case ('EXTRA_DURATION') {
            <div>
              <label [class]="labelClass" for="offerMonths">Extra Free Months *</label>
              <nz-input-number id="offerMonths" formControlName="extraMonths" [nzMin]="1" [nzStep]="1" [nzPrecision]="0" class="!w-full !rounded-xl"></nz-input-number>
            </div>
          }
          @default {
            <div>
              <label [class]="labelClass" for="offerPercent">
                {{ formType() === 'COUPLE' ? '2nd Member Discount (%) *' : 'Discount (%) *' }}
              </label>
              <nz-input-number id="offerPercent" formControlName="percentValue" [nzMin]="0.01" [nzMax]="100" [nzStep]="1" [nzPrecision]="2" class="!w-full !rounded-xl"></nz-input-number>
              @if (formType() === 'COUPLE') {
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-0">Use 100% to make the second member free.</p>
              }
            </div>
          }
        }

        <label nz-checkbox formControlName="isActive" class="text-sm">Offer is active</label>

        @if (errorMessage(); as err) {
          <nz-alert nzType="error" [nzMessage]="err" nzShowIcon></nz-alert>
        }

        <div class="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
          <button nz-button type="button" nzType="default" (click)="cancel.emit()" class="!rounded-xl">Cancel</button>
          <button nz-button type="submit" nzType="primary" [nzLoading]="saving()" class="!rounded-xl !bg-blue-600 hover:!bg-blue-500">
            {{ offer() ? 'Save Changes' : 'Create Offer' }}
          </button>
        </div>
      </form>
    </nz-modal>
  `,
})
export class OfferFormModalComponent implements OnInit {
  private fb = inject(FormBuilder);

  readonly offer = input<Offer | null>(null);
  readonly saving = input<boolean>(false);
  readonly serverError = input<string | null>(null);

  readonly cancel = output<void>();
  readonly save = output<OfferPayload>();

  readonly labelClass = LABEL;
  readonly typeOptions = OFFER_TYPE_OPTIONS;
  readonly localError = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    type: ['PERCENT_DISCOUNT' as OfferType, [Validators.required]],
    percentValue: [null as number | null],
    flatAmount: [null as number | null],
    extraMonths: [null as number | null],
    isActive: [true],
  });

  private readonly typeValue = toSignal(this.form.controls.type.valueChanges, { initialValue: this.form.controls.type.value });
  readonly formType = this.typeValue;

  errorMessage(): string | null {
    return this.localError() ?? this.serverError();
  }

  ngOnInit(): void {
    const o = this.offer();
    if (o) {
      this.form.reset({
        name: o.name,
        type: o.type,
        percentValue: o.percentValue !== null ? Number(o.percentValue) : null,
        flatAmount: o.flatAmount !== null ? Number(o.flatAmount) : null,
        extraMonths: o.extraMonths,
        isActive: o.isActive,
      });
    }
  }

  submit(): void {
    const raw = this.form.getRawValue() as OfferFormValue;
    const err = validateOfferForm(raw);
    this.localError.set(err);
    if (err) { this.form.markAllAsTouched(); return; }

    const usesPercent = raw.type === 'PERCENT_DISCOUNT' || raw.type === 'COUPLE';
    this.save.emit({
      name: raw.name.trim(),
      type: raw.type,
      isActive: raw.isActive,
      ...(usesPercent ? { percentValue: raw.percentValue! } : {}),
      ...(raw.type === 'FLAT_DISCOUNT' ? { flatAmount: raw.flatAmount! } : {}),
      ...(raw.type === 'EXTRA_DURATION' ? { extraMonths: raw.extraMonths! } : {}),
    });
  }
}
