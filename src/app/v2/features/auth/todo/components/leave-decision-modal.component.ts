import { Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule } from 'ng-zorro-antd/modal';

import { LeaveRequest } from '../../../../../core/leave/leave-api.service';
import { leaveTypeLabel } from '../services/todo.utils';

@Component({
  selector: 'app-leave-decision-modal',
  imports: [FormsModule, NzButtonModule, NzInputModule, NzModalModule],
  template: `
    <nz-modal
      [nzVisible]="true"
      [nzTitle]="approve() ? 'Approve Leave Request' : 'Reject Leave Request'"
      [nzFooter]="null"
      [nzWidth]="460"
      (nzOnCancel)="cancel.emit()"
    >
      <div *nzModalContent class="space-y-4">
        @let r = request();
        <div class="rounded-xl bg-gray-50 dark:bg-gray-800 p-3 text-sm">
          <div class="font-semibold text-gray-900 dark:text-white">{{ r.employee?.name ?? '—' }}</div>
          <div class="text-xs text-gray-500 dark:text-gray-400">
            {{ typeLabel() }} leave · {{ r.days }} day(s) · {{ r.branch?.location ?? '—' }}
          </div>
          @if (r.reason) {
            <div class="text-xs text-gray-600 dark:text-gray-300 mt-2">"{{ r.reason }}"</div>
          }
        </div>

        <div>
          <label for="leave-decision-note" class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Note (optional)</label>
          <textarea
            nz-input
            id="leave-decision-note"
            rows="3"
            class="!rounded-xl"
            placeholder="Visible to the employee"
            [ngModel]="note()"
            (ngModelChange)="note.set($event)"
          ></textarea>
        </div>

        <div class="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
          <button nz-button type="button" nzType="default" (click)="cancel.emit()" class="!rounded-xl">Cancel</button>
          <button
            nz-button
            type="button"
            nzType="primary"
            [nzDanger]="!approve()"
            [nzLoading]="deciding()"
            (click)="confirm.emit(note().trim())"
            class="!rounded-xl"
            [class.!bg-emerald-600]="approve()"
            [class.hover:!bg-emerald-500]="approve()"
          >
            {{ approve() ? 'Approve' : 'Reject' }}
          </button>
        </div>
      </div>
    </nz-modal>
  `,
})
export class LeaveDecisionModalComponent {
  readonly request = input.required<LeaveRequest>();
  readonly approve = input.required<boolean>();
  readonly deciding = input<boolean>(false);

  readonly cancel = output<void>();
  readonly confirm = output<string>();

  readonly note = signal('');

  typeLabel(): string { return leaveTypeLabel(this.request().leaveType); }
}
