import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';

import { Alert, AlertAudienceType, AlertPayload, AssignableTargets } from '../../../../../core/alerts/alerts-api.service';

@Component({
  selector: 'app-alert-form-modal',
  imports: [
    ReactiveFormsModule, NzAlertModule, NzButtonModule, NzCheckboxModule, NzDatePickerModule,
    NzInputModule, NzModalModule, NzSelectModule,
  ],
  template: `
    <nz-modal [nzVisible]="true" [nzTitle]="alert() ? 'Edit Alert' : 'Add Alert'" [nzFooter]="null" [nzWidth]="560" (nzOnCancel)="cancel.emit()">
      <form *nzModalContent [formGroup]="form" (ngSubmit)="submit()" class="space-y-4" novalidate>
        <div>
          <label [class]="labelClass" for="al-title">Title *</label>
          <input nz-input id="al-title" formControlName="title" placeholder="e.g. Gym closed on Sunday" class="!h-9 !rounded-xl" />
        </div>
        <div>
          <label [class]="labelClass" for="al-message">Message *</label>
          <textarea nz-input id="al-message" formControlName="message" rows="4" class="!rounded-xl"></textarea>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label [class]="labelClass" for="al-start">Start Date *</label>
            <nz-date-picker id="al-start" formControlName="startDate" nzFormat="MMM d, yyyy" class="w-full"></nz-date-picker>
          </div>
          <div>
            <label [class]="labelClass" for="al-end">End Date</label>
            <nz-date-picker id="al-end" formControlName="endDate" nzFormat="MMM d, yyyy" nzPlaceHolder="No end date" class="w-full"></nz-date-picker>
          </div>
        </div>

        <div>
          <label [class]="labelClass" for="al-audience">Audience *</label>
          <nz-select id="al-audience" formControlName="audienceType" [nzShowSearch]="true" class="w-full">
            @for (o of audienceOptions; track o.value) {
              <nz-option [nzLabel]="o.label" [nzValue]="o.value"></nz-option>
            }
          </nz-select>
        </div>

        @if (audienceType() === 'BRANCH') {
          <div>
            <label [class]="labelClass" for="al-branch">Branch *</label>
            <nz-select id="al-branch" formControlName="audienceBranchId" [nzShowSearch]="true" nzPlaceHolder="Select branch" class="w-full">
              @for (b of targets().branches; track b.id) {
                <nz-option [nzLabel]="b.location" [nzValue]="b.id"></nz-option>
              }
            </nz-select>
          </div>
        }
        @if (audienceType() === 'USER') {
          <div>
            <label [class]="labelClass" for="al-user">User *</label>
            <nz-select id="al-user" formControlName="audienceUserId" [nzShowSearch]="true" nzPlaceHolder="Select user" class="w-full">
              @for (u of targets().users; track u.id) {
                <nz-option [nzLabel]="u.name + ' (' + u.role + ')'" [nzValue]="u.id"></nz-option>
              }
            </nz-select>
          </div>
        }

        <label nz-checkbox formControlName="isActive" class="text-sm">Alert is active</label>

        @if (localError() ?? serverError(); as err) {
          <nz-alert nzType="error" [nzMessage]="err" nzShowIcon></nz-alert>
        }

        <div class="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
          <button nz-button type="button" nzType="default" (click)="cancel.emit()" class="!rounded-xl">Cancel</button>
          <button nz-button type="submit" nzType="primary" [nzLoading]="saving()" class="!rounded-xl !bg-blue-600 hover:!bg-blue-500">
            {{ alert() ? 'Save Changes' : 'Create Alert' }}
          </button>
        </div>
      </form>
    </nz-modal>
  `,
})
export class AlertFormModalComponent implements OnInit {
  private fb = inject(FormBuilder);

  readonly alert = input<Alert | null>(null);
  readonly targets = input<AssignableTargets>({ branches: [], users: [] });
  readonly saving = input<boolean>(false);
  readonly serverError = input<string | null>(null);

  readonly cancel = output<void>();
  readonly save = output<AlertPayload>();

  readonly labelClass = 'block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1';
  readonly localError = signal<string | null>(null);
  readonly audienceOptions: { label: string; value: AlertAudienceType }[] = [
    { label: 'Everyone in the organization', value: 'ALL' },
    { label: 'One branch', value: 'BRANCH' },
    { label: 'One specific user', value: 'USER' },
  ];

  readonly form = this.fb.group({
    title: ['', [Validators.required]],
    message: ['', [Validators.required]],
    startDate: [new Date() as Date | null, [Validators.required]],
    endDate: [null as Date | null],
    audienceType: ['ALL' as AlertAudienceType],
    audienceBranchId: [null as string | null],
    audienceUserId: [null as string | null],
    isActive: [true],
  });

  readonly audienceType = toSignal(this.form.controls.audienceType.valueChanges, { initialValue: 'ALL' as AlertAudienceType | null });

  ngOnInit(): void {
    const a = this.alert();
    if (!a) return;
    this.form.reset({
      title: a.title,
      message: a.message,
      startDate: new Date(a.startDate),
      endDate: a.endDate ? new Date(a.endDate) : null,
      audienceType: a.audienceType,
      audienceBranchId: a.audienceBranchId,
      audienceUserId: a.audienceUserId,
      isActive: a.isActive,
    });
  }

  private validate(): string | null {
    const v = this.form.getRawValue();
    if (!v.title?.trim() || !v.message?.trim() || !v.startDate) return 'Title, message and start date are required.';
    if (v.endDate && v.endDate < v.startDate) return 'End date cannot be before the start date.';
    if (v.audienceType === 'BRANCH' && !v.audienceBranchId) return 'Please select a branch.';
    if (v.audienceType === 'USER' && !v.audienceUserId) return 'Please select a user.';
    return null;
  }

  submit(): void {
    const err = this.validate();
    this.localError.set(err);
    if (err) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    const audienceType = v.audienceType ?? 'ALL';
    this.save.emit({
      title: v.title!.trim(),
      message: v.message!.trim(),
      startDate: v.startDate!.toISOString(),
      endDate: v.endDate ? v.endDate.toISOString() : null,
      isActive: v.isActive ?? true,
      audienceType,
      audienceBranchId: audienceType === 'BRANCH' ? v.audienceBranchId : null,
      audienceUserId: audienceType === 'USER' ? v.audienceUserId : null,
    });
  }
}
