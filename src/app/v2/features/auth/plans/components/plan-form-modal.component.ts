import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';

import { Branch } from '../../../../../core/branches/branch-api.service';
import { currencySymbol } from '../../../../../core/constants/currencies';
import { Plan, PlanDuration, PlanPayload } from '../../../../../core/plans/plan-api.service';
import { DURATION_OPTIONS, PlanFormValue, validatePlanForm } from '../services/plan.utils';

const LABEL = 'block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1';

@Component({
  selector: 'app-plan-form-modal',
  imports: [
    ReactiveFormsModule, NzAlertModule, NzButtonModule, NzIconModule,
    NzInputModule, NzInputNumberModule, NzModalModule, NzSelectModule,
  ],
  template: `
    <nz-modal
      [nzVisible]="true"
      [nzTitle]="''"
      [nzFooter]="null"
      [nzWidth]="700"
      [nzClassName]="'plan-form-modal'"
      [nzBodyStyle]="{ 'max-height': 'calc(100vh - 48px)', 'overflow-y': 'auto', padding: '0' }"
      (nzOnCancel)="cancel.emit()"
    >
      <form *nzModalContent [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <!-- Header -->
        <div class="flex items-center gap-3 px-6 pt-5 pb-3 border-b border-gray-100 dark:border-gray-800">
          <span class="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/30 shrink-0 leading-none">
            <span nz-icon nzType="tags" class="!text-base !leading-none text-blue-600 dark:text-blue-300"></span>
          </span>
          <div class="flex flex-col justify-center">
            <h2 class="text-base font-bold m-0 leading-tight text-gray-900 dark:text-white">{{ plan() ? 'Edit Plan' : 'Add Plan' }}</h2>
            <p class="text-xs m-0 leading-tight text-gray-500 dark:text-gray-400">{{ plan() ? 'Update this plan\\'s details' : 'Define a new membership plan' }}</p>
          </div>
        </div>

        <div class="px-6 py-4 space-y-4">
          @if (branches().length === 0) {
            <nz-alert
              nzType="warning"
              nzShowIcon
              nzMessage="No branches available"
              nzDescription="You need at least one branch before you can create a plan."
              class="!py-2"
            ></nz-alert>
          }

          <!-- Section: Plan details -->
          <section class="rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/30 p-4">
            <h3 class="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">
              <span nz-icon nzType="tags" class="text-blue-600"></span>
              Plan Details
            </h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div class="sm:col-span-2">
                <label [class]="labelClass" for="branchId">Branch *</label>
                <nz-select id="branchId" formControlName="branchId" [nzShowSearch]="true" class="w-full" nzPlaceHolder="Select a branch">
                  @for (b of branches(); track b.id) {
                    <nz-option [nzLabel]="b.location" [nzValue]="b.id"></nz-option>
                  }
                </nz-select>
              </div>
              <div class="sm:col-span-2">
                <label [class]="labelClass" for="name">Name *</label>
                <input nz-input id="name" formControlName="name" placeholder="e.g. Gold Monthly" class="!h-9 !rounded-lg" />
              </div>
              <div>
                <label [class]="labelClass" for="price">Price ({{ currencyCode() }}) *</label>
                <nz-input-number id="price" formControlName="price" [nzMin]="0" [nzStep]="1" [nzPrecision]="2" class="!w-full !rounded-lg"></nz-input-number>
              </div>
              <div>
                <label [class]="labelClass" for="duration">Duration *</label>
                <nz-select id="duration" formControlName="duration" class="w-full">
                  @for (d of durationOptions; track d.value) {
                    <nz-option [nzLabel]="d.label" [nzValue]="d.value"></nz-option>
                  }
                </nz-select>
              </div>
            </div>

            @if (taxPreviewText(); as preview) {
              <p class="mt-3 mb-0 text-xs text-blue-600 dark:text-blue-300 font-medium">{{ preview }}</p>
            }
          </section>

          @if (errorMessage(); as err) {
            <nz-alert nzType="error" [nzMessage]="err" nzShowIcon class="!py-2"></nz-alert>
          }
        </div>

        <div class="flex justify-end gap-2 px-6 py-3 border-t border-gray-100 dark:border-gray-800">
          <button nz-button type="button" nzType="default" (click)="cancel.emit()" class="!rounded-lg !h-9 !px-4">Cancel</button>
          <button nz-button type="submit" nzType="primary" [nzLoading]="saving()" [disabled]="branches().length === 0" class="!rounded-lg !h-9 !px-4 !bg-blue-700 hover:!bg-blue-800">
            {{ plan() ? 'Save Changes' : 'Create Plan' }}
          </button>
        </div>
      </form>
    </nz-modal>
  `,
})
export class PlanFormModalComponent implements OnInit {
  private fb = inject(FormBuilder);

  readonly plan = input<Plan | null>(null);
  readonly branches = input.required<Branch[]>();
  readonly saving = input<boolean>(false);
  readonly serverError = input<string | null>(null);

  readonly cancel = output<void>();
  readonly save = output<PlanPayload>();

  readonly labelClass = LABEL;
  readonly durationOptions = DURATION_OPTIONS;
  readonly localError = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    branchId: ['', [Validators.required]],
    name: ['', [Validators.required, Validators.minLength(2)]],
    price: [null as number | null, [Validators.required, Validators.min(0)]],
    duration: ['MONTHLY' as PlanDuration, [Validators.required]],
  });

  errorMessage(): string | null {
    return this.localError() ?? this.serverError();
  }

  // Tracks the form's live value as a signal so the tax-inclusive price
  // preview and currency label update as the user types or changes the
  // branch, without a manual subscription to unsubscribe.
  private formValue = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });

  private selectedBranch = computed(() => {
    const branchId = this.formValue()?.branchId;
    return this.branches().find((b) => b.id === branchId) ?? null;
  });

  currencyCode = computed(() => this.selectedBranch()?.currency ?? '');

  taxPreviewText = computed(() => {
    const value = this.formValue();
    const price = value?.price;
    const branch = this.selectedBranch();
    if (!branch || price === null || price === undefined || (price as unknown as string) === '') {
      return null;
    }
    const rate = Number(branch.taxRatePercent) || 0;
    const total = Number(price) * (1 + rate / 100);
    const symbol = currencySymbol(branch.currency);
    return `Total with tax: ${symbol}${total.toFixed(2)} (incl. ${rate}% tax)`;
  });

  ngOnInit(): void {
    const p = this.plan();
    if (p) {
      this.form.reset({
        branchId: p.branchId,
        name: p.name,
        price: Number(p.price),
        duration: p.duration,
      });
    } else if (this.branches().length === 1) {
      this.form.patchValue({ branchId: this.branches()[0].id });
    }
  }

  submit(): void {
    const raw = this.form.getRawValue() as PlanFormValue;
    const err = validatePlanForm(raw);
    this.localError.set(err);
    if (err) { this.form.markAllAsTouched(); return; }

    this.save.emit({
      branchId: raw.branchId,
      name: raw.name.trim(),
      price: raw.price!,
      duration: raw.duration,
    });
  }
}
