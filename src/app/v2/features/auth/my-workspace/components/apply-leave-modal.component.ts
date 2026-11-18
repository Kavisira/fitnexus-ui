import { Component, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';

import { ApplyLeavePayload, LeaveType } from '../../../../../core/leave/leave-api.service';
import { toLocalDateString } from '../../../../../core/common/date.util';
import { LEAVE_TYPE_LABEL } from '../services/my-workspace.utils';

const LABEL = 'block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1';

/**
 * Apply-leave dialog — moved here unchanged from the old Dashboard
 * "Employee Portal" tab / old My Workspace Leave tab. Reason is capped
 * at 500 chars server-side (ApplyLeaveDto.reason @MaxLength(500)).
 */
@Component({
  selector: 'app-apply-leave-modal',
  imports: [FormsModule, NzAlertModule, NzButtonModule, NzDatePickerModule, NzIconModule, NzInputModule, NzModalModule, NzSelectModule],
  template: `
    <nz-modal
      [nzVisible]="true"
      [nzTitle]="''"
      [nzFooter]="null"
      [nzWidth]="480"
      [nzBodyStyle]="{ 'max-height': 'calc(100vh - 48px)', 'overflow-y': 'auto', padding: '0' }"
      (nzOnCancel)="cancel.emit()"
    >
      <div *nzModalContent>
        <div class="flex items-center gap-3 px-6 pt-5 pb-3 border-b border-gray-100 dark:border-gray-800">
          <span class="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/30 shrink-0 leading-none">
            <span nz-icon nzType="calendar" class="!text-base !leading-none text-blue-600 dark:text-blue-300"></span>
          </span>
          <div class="flex flex-col justify-center">
            <h2 class="text-base font-bold m-0 leading-tight text-gray-900 dark:text-white">Apply for leave</h2>
            <p class="text-xs m-0 leading-tight text-gray-500 dark:text-gray-400">Submit a new leave request</p>
          </div>
        </div>

        <div class="px-6 py-4 space-y-4">
          @if (error()) {
            <nz-alert nzType="error" [nzMessage]="error()" nzShowIcon></nz-alert>
          }

          <div>
            <label [class]="LABEL" for="al-type">Leave type</label>
            <nz-select id="al-type" [(ngModel)]="leaveType" class="w-full">
              @for (opt of leaveTypeOptions; track opt.value) {
                <nz-option [nzLabel]="opt.label" [nzValue]="opt.value"></nz-option>
              }
            </nz-select>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label [class]="LABEL" for="al-start">Start date</label>
              <nz-date-picker id="al-start" [(ngModel)]="startDate" nzFormat="MMM d, yyyy" class="w-full"></nz-date-picker>
            </div>
            <div>
              <label [class]="LABEL" for="al-end">End date</label>
              <nz-date-picker id="al-end" [(ngModel)]="endDate" nzFormat="MMM d, yyyy" class="w-full"></nz-date-picker>
            </div>
          </div>

          <div>
            <label [class]="LABEL" for="al-reason">Reason</label>
            <textarea nz-input id="al-reason" [(ngModel)]="reason" rows="3" maxlength="500" placeholder="Optional reason" class="!rounded-lg"></textarea>
          </div>

          <div class="flex justify-end gap-2 pt-2">
            <button nz-button type="button" nzType="default" (click)="cancel.emit()" class="!h-9 !rounded-lg">Cancel</button>
            <button nz-button type="button" nzType="primary" [nzLoading]="saving()" (click)="submit()" class="!h-9 !rounded-lg !px-4 !bg-blue-700 hover:!bg-blue-800">
              Submit
            </button>
          </div>
        </div>
      </div>
    </nz-modal>
  `,
})
export class ApplyLeaveModalComponent {
  readonly LABEL = LABEL;
  readonly leaveTypeOptions = (Object.keys(LEAVE_TYPE_LABEL) as LeaveType[]).map((value) => ({ value, label: LEAVE_TYPE_LABEL[value] }));

  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  leaveType: LeaveType = 'CASUAL';
  startDate: Date | null = null;
  endDate: Date | null = null;
  reason = '';

  readonly cancel = output<void>();
  readonly save = output<ApplyLeavePayload>();

  setSaving(value: boolean): void {
    this.saving.set(value);
  }

  setError(message: string | null): void {
    this.error.set(message);
  }

  submit(): void {
    if (!this.startDate || !this.endDate) {
      this.error.set('Start and end dates are required.');
      return;
    }
    this.error.set(null);
    this.save.emit({
      leaveType: this.leaveType,
      startDate: toLocalDateString(this.startDate),
      endDate: toLocalDateString(this.endDate),
      reason: this.reason.trim() || undefined,
    });
  }
}
