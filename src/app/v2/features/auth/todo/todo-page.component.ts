import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSelectModule } from 'ng-zorro-antd/select';

import { LeaveApiService, LeaveRequest } from '../../../../core/leave/leave-api.service';
import { PermissionsService } from '../../../../core/roles/permissions.service';
import { TodoBadgeService } from '../../../../core/todo/todo-badge.service';
import { ToastService } from '../../../../core/toast/toast.service';
import { LeaveDecisionModalComponent } from './components/leave-decision-modal.component';
import { LeaveRequestTableComponent } from './components/leave-request-table.component';
import { LEAVE_STATUS_FILTER_OPTIONS, LeaveStatusFilter } from './services/todo.utils';

/** To-Do: the one place an approver checks for items needing a decision.
 * Today that is leave requests; future categories become new sections here. */
@Component({
  selector: 'app-v2-todo-page',
  imports: [FormsModule, NzIconModule, NzSelectModule, LeaveDecisionModalComponent, LeaveRequestTableComponent],
  template: `
    <div class="flex flex-col flex-1 min-w-0 space-y-4">
      <section class="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs">
        <div class="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          <div class="sm:col-span-8 flex items-center gap-3 min-w-0">
            <span class="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300 shrink-0">
              <span nz-icon nzType="calendar" class="text-lg"></span>
            </span>
            <div class="min-w-0">
              <h2 class="text-base font-bold text-gray-900 dark:text-white m-0 flex items-center gap-2">
                Leave Requests
                @if (pendingCount() > 0) {
                  <span class="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-500 text-white">{{ pendingCount() }} pending</span>
                }
              </h2>
              <p class="text-xs text-gray-500 dark:text-gray-400 m-0">Approve or reject leave requests from your team.</p>
            </div>
          </div>
          <div class="sm:col-span-4 flex justify-start sm:justify-end">
            <nz-select
              class="w-full sm:w-48"
              [nzShowSearch]="true"
              [ngModel]="statusFilter()"
              (ngModelChange)="onStatusChange($event)"
            >
              @for (o of statusOptions; track o.value) {
                <nz-option [nzLabel]="o.label" [nzValue]="o.value"></nz-option>
              }
            </nz-select>
          </div>
        </div>
      </section>

      <app-leave-request-table
        [requests]="requests()"
        [loading]="loading()"
        [canWrite]="canWrite()"
        (decide)="openDecision($event.request, $event.approve)"
      ></app-leave-request-table>

      @if (decisionTarget(); as target) {
        <app-leave-decision-modal
          [request]="target"
          [approve]="decisionApprove()"
          [deciding]="deciding()"
          (cancel)="decisionTarget.set(null)"
          (confirm)="confirmDecision($event)"
        ></app-leave-decision-modal>
      }
    </div>
  `,
  host: { class: 'flex flex-col flex-1 min-h-0 min-w-0 w-full max-w-full' },
})
export class V2TodoPageComponent implements OnInit {
  private leaveApi = inject(LeaveApiService);
  private permissions = inject(PermissionsService);
  private todoBadge = inject(TodoBadgeService);
  private toast = inject(ToastService);

  readonly canWrite = computed(() => this.permissions.canWrite('LEAVES'));
  readonly statusOptions = LEAVE_STATUS_FILTER_OPTIONS;
  readonly pendingCount = this.todoBadge.pendingCount;

  readonly requests = signal<LeaveRequest[]>([]);
  readonly loading = signal(false);
  // A to-do list defaults to pending-only; the filter doubles as a decision history.
  readonly statusFilter = signal<LeaveStatusFilter>('PENDING');

  readonly decisionTarget = signal<LeaveRequest | null>(null);
  readonly decisionApprove = signal(true);
  readonly deciding = signal(false);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.leaveApi.teamRequests({ status: this.statusFilter() || undefined }).subscribe({
      next: (rows) => { this.loading.set(false); this.requests.set(rows); },
      error: () => { this.loading.set(false); this.toast.error('Could not load leave requests.'); },
    });
  }

  onStatusChange(status: LeaveStatusFilter): void {
    this.statusFilter.set(status);
    this.load();
  }

  openDecision(request: LeaveRequest, approve: boolean): void {
    this.decisionApprove.set(approve);
    this.decisionTarget.set(request);
  }

  confirmDecision(note: string): void {
    const target = this.decisionTarget();
    if (!target) return;
    const approve = this.decisionApprove();
    this.deciding.set(true);
    const call = approve ? this.leaveApi.approve(target.id, note || undefined) : this.leaveApi.reject(target.id, note || undefined);
    call.subscribe({
      next: () => {
        this.deciding.set(false);
        this.decisionTarget.set(null);
        this.toast.success(approve ? 'Leave request approved.' : 'Leave request rejected.');
        this.load();
        // Refresh the sidebar badge now rather than waiting for its poll.
        this.todoBadge.refresh();
      },
      error: (err) => {
        this.deciding.set(false);
        this.toast.error(err?.error?.message ?? 'Could not record the decision.');
      },
    });
  }
}
