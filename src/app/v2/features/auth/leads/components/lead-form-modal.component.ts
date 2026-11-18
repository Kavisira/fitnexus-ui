import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';

import { LeadPayload } from '../../../../../core/leads/lead-api.service';
import { LEAD_SOURCES } from '../../../../../core/constants/lead-sources';
import { LeadCreateFormValue, validateLeadCreateForm } from '../services/lead.utils';

const LABEL = 'block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1';

/**
 * Create-only dialog — lightweight, no timeline (the lead doesn't exist
 * yet). Status isn't offered here at all: a new lead is always created
 * as NEW server-side (see LeadsService.create / CreateLeadDto, which
 * doesn't even accept a status field).
 */
@Component({
  selector: 'app-lead-form-modal',
  imports: [
    ReactiveFormsModule, NzAlertModule, NzButtonModule, NzDatePickerModule,
    NzIconModule, NzInputModule, NzModalModule, NzSelectModule,
  ],
  template: `
    <nz-modal
      [nzVisible]="true"
      [nzTitle]="''"
      [nzFooter]="null"
      [nzWidth]="720"
      [nzClassName]="'lead-form-modal'"
      [nzBodyStyle]="{ 'max-height': 'calc(100vh - 48px)', 'overflow-y': 'auto', padding: '0' }"
      (nzOnCancel)="cancel.emit()"
    >
      <form *nzModalContent [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <!-- Header -->
        <div class="flex items-center gap-3 px-6 pt-5 pb-3 border-b border-gray-100 dark:border-gray-800">
          <span class="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/30 shrink-0 leading-none">
            <span nz-icon nzType="user-add" class="!text-base !leading-none text-blue-600 dark:text-blue-300"></span>
          </span>
          <div class="flex flex-col justify-center">
            <h2 class="text-base font-bold m-0 leading-tight text-gray-900 dark:text-white">Add Lead</h2>
            <p class="text-xs m-0 leading-tight text-gray-500 dark:text-gray-400">Log a new prospect into the pipeline</p>
          </div>
        </div>

        <div class="px-6 py-4 space-y-4">
          <!-- Section: Contact -->
          <section class="rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/30 p-4">
            <h3 class="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">
              <span nz-icon nzType="idcard" class="text-blue-600"></span>
              Contact
            </h3>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label [class]="labelClass" for="c-name">Name *</label>
                <input nz-input id="c-name" formControlName="name" class="!h-9 !rounded-lg" />
              </div>
              <div>
                <label [class]="labelClass" for="c-phone">Phone *</label>
                <input nz-input id="c-phone" type="tel" formControlName="phone" class="!h-9 !rounded-lg" />
              </div>
              <div>
                <label [class]="labelClass" for="c-email">Email</label>
                <input nz-input id="c-email" type="email" formControlName="email" class="!h-9 !rounded-lg" />
              </div>
            </div>
          </section>

          <!-- Section: Assignment -->
          <section class="rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/30 p-4">
            <h3 class="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">
              <span nz-icon nzType="team" class="text-blue-600"></span>
              Assignment
            </h3>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label [class]="labelClass" for="c-branch">Branch *</label>
                <nz-select
                  id="c-branch" formControlName="branchId" [nzShowSearch]="canReadBranches()"
                  [nzDisabled]="!canReadBranches()" class="w-full"
                >
                  @for (b of branchOptions(); track b.value) {
                    <nz-option [nzLabel]="b.label" [nzValue]="b.value"></nz-option>
                  }
                </nz-select>
              </div>
              <div>
                <label [class]="labelClass" for="c-source">Source</label>
                <nz-select id="c-source" formControlName="source" class="w-full">
                  @for (s of sourceOptions; track s.value) {
                    <nz-option [nzLabel]="s.label" [nzValue]="s.value"></nz-option>
                  }
                </nz-select>
              </div>
              <div>
                <label [class]="labelClass" for="c-assignedTo">Assigned To</label>
                <nz-select
                  id="c-assignedTo" formControlName="assignedToEmployeeId" [nzShowSearch]="canReadEmployees()"
                  [nzAllowClear]="canReadEmployees()" [nzDisabled]="!canReadEmployees()"
                  nzPlaceHolder="Unassigned" class="w-full"
                >
                  @for (e of employeeOptions(); track e.value) {
                    <nz-option [nzLabel]="e.label" [nzValue]="e.value"></nz-option>
                  }
                </nz-select>
              </div>
            </div>
          </section>

          <!-- Section: Interest -->
          <section class="rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/30 p-4">
            <h3 class="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">
              <span nz-icon nzType="star" class="text-blue-600"></span>
              Interest
            </h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label [class]="labelClass" for="c-interestedPlan">Interested Plan</label>
                <input nz-input id="c-interestedPlan" formControlName="interestedPlan" placeholder="e.g. 6-month strength plan" class="!h-9 !rounded-lg" />
              </div>
              <div>
                <label [class]="labelClass" for="c-nextFollowUpAt">Next Follow-up</label>
                <nz-date-picker
                  id="c-nextFollowUpAt" formControlName="nextFollowUpAt" [nzShowTime]="{ nzFormat: 'h:mm a' }"
                  nzFormat="MMM d, y h:mm a" class="w-full !h-9 !rounded-lg"
                ></nz-date-picker>
              </div>
            </div>
          </section>

          @if (errorMessage(); as err) {
            <nz-alert nzType="error" [nzMessage]="err" nzShowIcon class="!py-2"></nz-alert>
          }
        </div>

        <div class="flex justify-end gap-2 px-6 py-3 border-t border-gray-100 dark:border-gray-800">
          <button nz-button type="button" nzType="default" (click)="cancel.emit()" class="!rounded-lg !h-9 !px-4">Cancel</button>
          <button nz-button type="submit" nzType="primary" [nzLoading]="saving()" class="!rounded-lg !h-9 !px-4 !bg-blue-700 hover:!bg-blue-800">
            Create Lead
          </button>
        </div>
      </form>
    </nz-modal>
  `,
})
export class LeadFormModalComponent implements OnInit {
  private fb = inject(FormBuilder);

  readonly saving = input<boolean>(false);
  readonly serverError = input<string | null>(null);
  readonly branchOptions = input<{ label: string; value: string }[]>([]);
  readonly employeeOptions = input<{ label: string; value: string }[]>([]);
  readonly canReadBranches = input<boolean>(true);
  readonly canReadEmployees = input<boolean>(true);
  // Default "Assigned to" to the user themselves (see leads-page) — the
  // only option at all when they can't read the Employees list.
  readonly defaultAssignedToEmployeeId = input<string | null>(null);
  readonly defaultBranchId = input<string>('');

  readonly cancel = output<void>();
  readonly save = output<LeadPayload>();

  readonly labelClass = LABEL;
  readonly sourceOptions = LEAD_SOURCES;
  readonly localError = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    phone: ['', [Validators.required, Validators.minLength(5)]],
    email: ['', [Validators.email]],
    branchId: ['', [Validators.required]],
    source: ['Walk-in'],
    interestedPlan: [''],
    assignedToEmployeeId: [null as string | null],
    nextFollowUpAt: [null as Date | null],
  });

  errorMessage(): string | null {
    return this.localError() ?? this.serverError();
  }

  ngOnInit(): void {
    // Defaults the branch (when it can't be picked from a full list)
    // and "assigned to" (always the user themselves as a starting
    // point) — both still overridable if a dropdown is actually shown.
    this.form.patchValue({
      branchId: this.defaultBranchId(),
      assignedToEmployeeId: this.defaultAssignedToEmployeeId(),
    });
  }

  submit(): void {
    const raw = this.form.getRawValue() as LeadCreateFormValue;
    const err = validateLeadCreateForm(raw);
    this.localError.set(err);
    if (err) {
      this.form.markAllAsTouched();
      return;
    }

    this.save.emit({
      name: raw.name.trim(),
      phone: raw.phone.trim(),
      email: raw.email || undefined,
      branchId: raw.branchId,
      source: raw.source || undefined,
      interestedPlan: raw.interestedPlan || undefined,
      assignedToEmployeeId: raw.assignedToEmployeeId || undefined,
      nextFollowUpAt: raw.nextFollowUpAt ? raw.nextFollowUpAt.toISOString() : undefined,
    });
  }
}
