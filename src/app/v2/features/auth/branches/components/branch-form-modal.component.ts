import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';

import { Branch, BranchPayload } from '../../../../../core/branches/branch-api.service';
import { CURRENCIES } from '../../../../../core/constants/currencies';
import { BranchFormValue, LANGUAGE_OPTIONS, validateBranchForm } from '../services/branch.utils';

const LABEL = 'block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1';

@Component({
  selector: 'app-branch-form-modal',
  imports: [
    ReactiveFormsModule, NzAlertModule, NzButtonModule, NzCheckboxModule,
    NzIconModule, NzInputModule, NzInputNumberModule, NzModalModule, NzSelectModule,
  ],
  template: `
    <nz-modal
      [nzVisible]="true"
      [nzTitle]="''"
      [nzFooter]="null"
      [nzWidth]="820"
      [nzClassName]="'branch-form-modal'"
      [nzBodyStyle]="{ 'max-height': 'calc(100vh - 48px)', 'overflow-y': 'auto', padding: '0' }"
      (nzOnCancel)="cancel.emit()"
    >
      <form *nzModalContent [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <!-- Header -->
        <div class="flex items-center gap-3 px-6 pt-5 pb-3 border-b border-gray-100 dark:border-gray-800">
          <span class="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/30 shrink-0 leading-none">
            <span nz-icon nzType="bank" class="!text-base !leading-none text-blue-600 dark:text-blue-300"></span>
          </span>
          <div class="flex flex-col justify-center">
            <h2 class="text-base font-bold m-0 leading-tight text-gray-900 dark:text-white">{{ branch() ? 'Edit Branch' : 'Add Branch' }}</h2>
            <p class="text-xs m-0 leading-tight text-gray-500 dark:text-gray-400">{{ branch() ? 'Update this location\\'s details and settings' : 'Set up a new gym location' }}</p>
          </div>
        </div>

        <div class="px-6 py-4 space-y-4">
          <!-- Section: Location -->
          <section class="rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/30 p-4">
            <h3 class="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">
              <span nz-icon nzType="environment" class="text-blue-600"></span>
              Location
            </h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label [class]="labelClass" for="location">Location *</label>
                <input nz-input id="location" formControlName="location" placeholder="e.g. 12 MG Road, Chennai" class="!h-9 !rounded-lg" />
              </div>
              <div>
                <label [class]="labelClass" for="address">Address</label>
                <input nz-input id="address" formControlName="address" class="!h-9 !rounded-lg" placeholder="Optional additional detail" />
              </div>
            </div>
          </section>

          <!-- Section: Contact -->
          <section class="rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/30 p-4">
            <h3 class="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">
              <span nz-icon nzType="phone" class="text-blue-600"></span>
              Contact
            </h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label [class]="labelClass" for="phone">Phone</label>
                <input nz-input id="phone" type="tel" formControlName="phone" class="!h-9 !rounded-lg" />
              </div>
              <div>
                <label [class]="labelClass" for="email">Email</label>
                <input nz-input id="email" type="email" formControlName="email" class="!h-9 !rounded-lg" />
              </div>
            </div>
          </section>

          <!-- Section: Configuration -->
          <section class="rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/30 p-4">
            <h3 class="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">
              <span nz-icon nzType="setting" class="text-blue-600"></span>
              Configuration
            </h3>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label [class]="labelClass" for="currency">Currency</label>
                <nz-select id="currency" formControlName="currency" [nzShowSearch]="true" class="w-full">
                  @for (c of currencyOptions; track c.value) {
                    <nz-option [nzLabel]="c.label" [nzValue]="c.value"></nz-option>
                  }
                </nz-select>
              </div>
              <div>
                <label [class]="labelClass" for="taxRatePercent">Tax Rate (%) *</label>
                <nz-input-number id="taxRatePercent" formControlName="taxRatePercent" [nzMin]="0" [nzMax]="100" [nzStep]="1" [nzPrecision]="2" class="!w-full !rounded-lg"></nz-input-number>
              </div>
              <div>
                <label [class]="labelClass" for="defaultLanguage">Language</label>
                <nz-select id="defaultLanguage" formControlName="defaultLanguage" class="w-full">
                  @for (l of languageOptions; track l.value) {
                    <nz-option [nzLabel]="l.label" [nzValue]="l.value"></nz-option>
                  }
                </nz-select>
              </div>
              <div>
                <label [class]="labelClass" for="memberCount">Members *</label>
                <nz-input-number id="memberCount" formControlName="memberCount" [nzMin]="0" [nzStep]="1" [nzPrecision]="0" class="!w-full !rounded-lg"></nz-input-number>
              </div>
            </div>
          </section>

          @if (isCreatingFirstBranch()) {
            <nz-alert nzType="info" nzMessage="This is your first branch, so it will automatically be made the main branch." nzShowIcon class="!py-2"></nz-alert>
          } @else {
            <label nz-checkbox formControlName="isMainBranch" class="text-sm">Main branch</label>
          }

          @if (errorMessage(); as err) {
            <nz-alert nzType="error" [nzMessage]="err" nzShowIcon class="!py-2"></nz-alert>
          }
        </div>

        <div class="flex justify-end gap-2 px-6 py-3 border-t border-gray-100 dark:border-gray-800">
          <button nz-button type="button" nzType="default" (click)="cancel.emit()" class="!rounded-lg !h-9 !px-4">Cancel</button>
          <button nz-button type="submit" nzType="primary" [nzLoading]="saving()" class="!rounded-lg !h-9 !px-4 !bg-blue-700 hover:!bg-blue-800">
            {{ branch() ? 'Save Changes' : 'Create Branch' }}
          </button>
        </div>
      </form>
    </nz-modal>
  `,
})
export class BranchFormModalComponent implements OnInit {
  private fb = inject(FormBuilder);

  readonly branch = input<Branch | null>(null);
  readonly saving = input<boolean>(false);
  readonly serverError = input<string | null>(null);
  // Set by the page: true only when creating (not editing) and the org
  // has zero branches yet — the backend always makes this branch main
  // regardless of what's picked, so the checkbox is hidden entirely
  // rather than asking a question with only one sensible answer.
  readonly isCreatingFirstBranch = input<boolean>(false);

  readonly cancel = output<void>();
  readonly save = output<BranchPayload>();

  readonly labelClass = LABEL;
  readonly languageOptions = LANGUAGE_OPTIONS;
  readonly currencyOptions = CURRENCIES;
  readonly localError = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    location: ['', [Validators.required, Validators.minLength(3)]],
    address: [''],
    phone: [''],
    email: ['', [Validators.email]],
    // No dedicated field — always sent/shown as UTC.
    timezone: ['UTC'],
    currency: ['INR', [Validators.required]],
    taxRatePercent: [null as number | null, [Validators.required, Validators.min(0), Validators.max(100)]],
    defaultLanguage: ['en'],
    memberCount: [null as number | null, [Validators.required, Validators.min(0)]],
    isMainBranch: [false],
  });

  errorMessage(): string | null {
    return this.localError() ?? this.serverError();
  }

  ngOnInit(): void {
    const b = this.branch();
    if (b) {
      this.form.reset({
        location: b.location,
        address: b.address ?? '',
        phone: b.phone ?? '',
        email: b.email ?? '',
        timezone: b.timezone,
        currency: b.currency,
        taxRatePercent: Number(b.taxRatePercent),
        defaultLanguage: b.defaultLanguage,
        memberCount: b.memberCount,
        isMainBranch: b.isMainBranch,
      });
    }
  }

  submit(): void {
    const raw = this.form.getRawValue() as BranchFormValue;
    const err = validateBranchForm(raw);
    this.localError.set(err);
    if (err) { this.form.markAllAsTouched(); return; }

    this.save.emit({
      location: raw.location.trim(),
      address: raw.address || undefined,
      phone: raw.phone || undefined,
      email: raw.email || undefined,
      timezone: raw.timezone || undefined,
      currency: raw.currency || undefined,
      taxRatePercent: raw.taxRatePercent!,
      defaultLanguage: raw.defaultLanguage || undefined,
      memberCount: raw.memberCount!,
      // Omitted (not sent as false) when this is the first branch — the
      // backend always makes it main regardless, so there's no
      // meaningful value to send here in that case.
      isMainBranch: this.isCreatingFirstBranch() ? undefined : !!raw.isMainBranch,
    });
  }
}
