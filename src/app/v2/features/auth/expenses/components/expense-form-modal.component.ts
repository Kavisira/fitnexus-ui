import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';

import { Branch } from '../../../../../core/branches/branch-api.service';
import { ExpenseCategory } from '../../../../../core/constants/expense-categories';
import { currencySymbol } from '../../../../../core/constants/currencies';
import { Expense, ExpensePayload } from '../../../../../core/expenses/expense-api.service';
import { EXPENSE_CATEGORY_OPTIONS } from '../services/expense.utils';

@Component({
  selector: 'app-expense-form-modal',
  imports: [
    ReactiveFormsModule, NzAlertModule, NzButtonModule, NzDatePickerModule, NzInputModule,
    NzInputNumberModule, NzModalModule, NzSelectModule,
  ],
  template: `
    <nz-modal
      [nzVisible]="true"
      [nzTitle]="expense() ? 'Edit Expense' : 'Add Expense'"
      [nzFooter]="null"
      [nzWidth]="520"
      (nzOnCancel)="cancel.emit()"
    >
      <form *nzModalContent [formGroup]="form" (ngSubmit)="submit()" class="space-y-4" novalidate>
        @if (serverError(); as err) {
          <nz-alert nzType="error" [nzMessage]="err" nzShowIcon></nz-alert>
        }

        <div>
          <label [class]="labelClass" for="e-branch">Branch *</label>
          <nz-select id="e-branch" formControlName="branchId" [nzShowSearch]="true" nzPlaceHolder="Select branch" class="w-full">
            @for (b of branches(); track b.id) {
              <nz-option [nzLabel]="b.location" [nzValue]="b.id"></nz-option>
            }
          </nz-select>
          @if (invalid('branchId')) { <p [class]="errorClass">Branch is required.</p> }
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label [class]="labelClass" for="e-category">Category *</label>
            <nz-select id="e-category" formControlName="category" [nzShowSearch]="true" class="w-full">
              @for (c of categoryOptions; track c.value) {
                <nz-option [nzLabel]="c.label" [nzValue]="c.value"></nz-option>
              }
            </nz-select>
          </div>
          <div>
            <label [class]="labelClass" for="e-amount">Amount *</label>
            <nz-input-number id="e-amount" formControlName="amount" [nzPrefix]="currency()" [nzMin]="0" [nzStep]="1" [nzPrecision]="2" class="!w-full !rounded-xl"></nz-input-number>
            @if (invalid('amount')) { <p [class]="errorClass">Enter an amount greater than 0.</p> }
          </div>
        </div>

        <div>
          <label [class]="labelClass" for="e-date">Expense Date *</label>
          <nz-date-picker id="e-date" formControlName="expenseDate" nzFormat="MMM d, yyyy" class="w-full !rounded-xl"></nz-date-picker>
          @if (invalid('expenseDate')) { <p [class]="errorClass">Date is required.</p> }
        </div>

        <div>
          <label [class]="labelClass" for="e-note">Note</label>
          <input nz-input id="e-note" formControlName="note" maxlength="200" placeholder="Optional note" class="!h-9 !rounded-xl" />
        </div>

        <div class="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
          <button nz-button type="button" nzType="default" (click)="cancel.emit()" class="!rounded-xl">Cancel</button>
          <button nz-button type="submit" nzType="primary" [nzLoading]="saving()" class="!rounded-xl !bg-blue-700 hover:!bg-blue-800">
            {{ expense() ? 'Save Changes' : 'Add Expense' }}
          </button>
        </div>
      </form>
    </nz-modal>
  `,
})
export class ExpenseFormModalComponent implements OnInit {
  private fb = inject(FormBuilder);

  readonly expense = input<Expense | null>(null);
  readonly branches = input.required<Branch[]>();
  readonly saving = input<boolean>(false);
  readonly serverError = input<string | null>(null);

  readonly cancel = output<void>();
  readonly save = output<ExpensePayload>();

  readonly labelClass = 'block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1';
  readonly errorClass = 'text-xs text-red-500 mt-1 mb-0';
  readonly categoryOptions = EXPENSE_CATEGORY_OPTIONS;
  readonly submitted = signal(false);

  readonly form = this.fb.group({
    branchId: ['', [Validators.required]],
    category: ['OTHER' as ExpenseCategory, [Validators.required]],
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    expenseDate: [new Date() as Date | null, [Validators.required]],
    note: [''],
  });

  private readonly branchId = toSignal(this.form.controls.branchId.valueChanges, { initialValue: this.form.controls.branchId.value });
  /** Symbol of the selected branch's currency, shown as the Amount prefix. */
  readonly currency = computed(() => currencySymbol(this.branches().find((b) => b.id === this.branchId())?.currency));

  ngOnInit(): void {
    const e = this.expense();
    if (e) {
      this.form.reset({
        branchId: e.branchId,
        category: e.category,
        amount: Number(e.amount),
        expenseDate: new Date(e.expenseDate),
        note: e.note ?? '',
      });
    } else {
      const branches = this.branches();
      this.form.patchValue({ branchId: branches.length === 1 ? branches[0].id : '' });
    }
  }

  invalid(name: 'branchId' | 'amount' | 'expenseDate'): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || this.submitted());
  }

  submit(): void {
    this.submitted.set(true);
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const raw = this.form.getRawValue();
    this.save.emit({
      branchId: raw.branchId!,
      category: raw.category!,
      amount: raw.amount!,
      expenseDate: raw.expenseDate ? raw.expenseDate.toISOString() : undefined,
      note: raw.note?.trim() || undefined,
    });
  }
}
