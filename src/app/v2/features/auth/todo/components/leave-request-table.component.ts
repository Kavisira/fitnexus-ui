import { Component, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';

import { LeaveRequest, LeaveStatus } from '../../../../../core/leave/leave-api.service';
import { LEAVE_STATUS_CHIP, leaveTypeLabel } from '../services/todo.utils';

@Component({
  selector: 'app-leave-request-table',
  imports: [DatePipe, NzAvatarModule, NzButtonModule, NzIconModule, NzTableModule, NzTooltipModule],
  template: `
    <div class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs overflow-hidden max-w-full">
      <div class="overflow-x-auto w-full">
        <nz-table
          [nzData]="requests()"
          [nzLoading]="loading()"
          [nzShowPagination]="false"
          [nzFrontPagination]="false"
          [nzNoResult]="empty"
          class="w-full text-left"
        >
          <thead>
            <tr class="text-xs uppercase font-semibold text-gray-500 dark:text-gray-400">
              <th class="py-3 px-4 min-w-52">Employee</th>
              <th class="py-3 px-3 w-28">Type</th>
              <th class="py-3 px-3 w-56">Dates</th>
              <th nzAlign="center" class="py-3 px-3 w-20">Days</th>
              <th class="py-3 px-3 hidden lg:table-cell">Reason</th>
              <th nzAlign="center" class="py-3 px-3 w-28">Status</th>
              @if (canWrite()) {
                <th nzAlign="right" class="py-3 px-4 w-52">Actions</th>
              }
            </tr>
          </thead>
          <tbody class="text-sm">
            @for (r of requests(); track r.id) {
              <tr class="hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors">
                <td class="py-3 px-4">
                  <div class="flex items-center gap-3">
                    <nz-avatar [nzText]="initial(r)" [nzSrc]="r.employee?.photoUrl ?? undefined" class="!bg-indigo-600 !text-white font-semibold shrink-0"></nz-avatar>
                    <div class="min-w-0">
                      <div class="font-semibold text-gray-900 dark:text-white truncate">{{ r.employee?.name ?? '—' }}</div>
                      <div class="text-xs text-gray-400 truncate">{{ r.branch?.location ?? '—' }}</div>
                    </div>
                  </div>
                </td>
                <td class="py-3 px-3">
                  <span class="px-2 py-0.5 rounded-md text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">{{ typeLabel(r) }}</span>
                </td>
                <td class="py-3 px-3 text-xs text-gray-600 dark:text-gray-300 whitespace-nowrap">
                  {{ r.startDate | date: 'mediumDate' }} – {{ r.endDate | date: 'mediumDate' }}
                </td>
                <td nzAlign="center" class="py-3 px-3 font-semibold">{{ r.days }}</td>
                <td class="py-3 px-3 hidden lg:table-cell text-xs text-gray-500 dark:text-gray-400 max-w-72 truncate">{{ r.reason || '—' }}</td>
                <td nzAlign="center" class="py-3 px-3">
                  <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold inline-block" [class]="chip(r.status)">{{ r.status }}</span>
                </td>
                @if (canWrite()) {
                  <td nzAlign="right" class="py-3 px-4 whitespace-nowrap">
                    @if (r.status === 'PENDING') {
                      <div class="inline-flex gap-1.5">
                        <button nz-button nzType="default" nzSize="small" (click)="decide.emit({ request: r, approve: true })" class="!rounded-lg !text-emerald-600 !border-emerald-200 hover:!bg-emerald-50 flex items-center gap-1">
                          <span nz-icon nzType="check"></span>Approve
                        </button>
                        <button nz-button nzType="default" nzSize="small" nzDanger (click)="decide.emit({ request: r, approve: false })" class="!rounded-lg flex items-center gap-1">
                          <span nz-icon nzType="close"></span>Reject
                        </button>
                      </div>
                    } @else if (r.decisionNote) {
                      <span class="text-xs text-gray-500 dark:text-gray-400 truncate inline-block max-w-48" nz-tooltip [nzTooltipTitle]="r.decisionNote">{{ r.decisionNote }}</span>
                    } @else {
                      <span class="text-xs text-gray-400">—</span>
                    }
                  </td>
                }
              </tr>
            }
          </tbody>
        </nz-table>
        <ng-template #empty>
          <div class="flex flex-col items-center gap-2 py-10 text-gray-400">
            <span nz-icon nzType="check-circle" class="text-3xl"></span>
            <span class="text-sm">Nothing here — you're all caught up.</span>
          </div>
        </ng-template>
      </div>
    </div>
  `,
  host: { class: 'block w-full' },
})
export class LeaveRequestTableComponent {
  readonly requests = input.required<LeaveRequest[]>();
  readonly loading = input<boolean>(false);
  readonly canWrite = input<boolean>(false);

  readonly decide = output<{ request: LeaveRequest; approve: boolean }>();

  initial(r: LeaveRequest): string { return (r.employee?.name || '?').trim().charAt(0).toUpperCase(); }
  typeLabel(r: LeaveRequest): string { return leaveTypeLabel(r.leaveType); }
  chip(s: LeaveStatus): string { return LEAVE_STATUS_CHIP[s]; }
}
