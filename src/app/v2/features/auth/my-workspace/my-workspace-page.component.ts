import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzTagModule } from 'ng-zorro-antd/tag';

import { TokenStorage } from '../../../../core/auth/token-storage.service';
import { LeaveApiService, LeaveBalanceRow, LeaveRequest, LeaveStatus } from '../../../../core/leave/leave-api.service';
import { AttendanceApiService, AttendanceDayRecord, EmployeeMonthlySummary } from '../../../../core/attendance/attendance-api.service';
import { PayrollApiService, Payslip } from '../../../../core/payroll/payroll-api.service';
import { PerformanceApiService, Appraisal, Review } from '../../../../core/performance/performance-api.service';
import { ToastService } from '../../../../core/toast/toast.service';
import { downloadBlob } from '../../../../core/common/csv-browser.util';
import { ApplyLeaveModalComponent } from './components/apply-leave-modal.component';
import {
  ATTENDANCE_STATUS_LABEL,
  LEAVE_STATUS_LABEL,
  LEAVE_TYPE_LABEL,
  REVIEW_AUTHOR_LABEL,
  REVIEW_STATUS_LABEL,
  attendanceStatusColor,
  leaveStatusColor,
  monthLabel,
  monthOptions,
  ratingStars,
  reviewStatusColor,
  richTextIsBlank,
  yearOptions,
} from './services/my-workspace.utils';

/**
 * My Workspace — self-service home for any logged-in employee (not the
 * Owner, who has no Employee record and is redirected away from this
 * route entirely, same behavior as the v1 screen it replaces). Apply
 * Leave and Attendance Tracker are real today; Payslips, Reviews and
 * Appraisal Letters depend on the Owner having run payroll / logged a
 * review or appraisal — empty states explain that rather than erroring.
 *
 * The old screen's rich-text reply box (PrimeNG p-editor / Quill) is
 * replaced here with a plain textarea: the backend's RespondReviewDto
 * only ever required a plain, non-empty string, and the admin-side
 * reply box (EmployeePerformanceModalComponent) already uses a plain
 * textarea too, so this keeps both sides of the conversation
 * consistent rather than carrying a PrimeNG-bound editor forward.
 */
@Component({
  selector: 'app-v2-my-workspace-page',
  imports: [
    DatePipe, DecimalPipe, FormsModule, NzAlertModule, NzButtonModule, NzIconModule,
    NzSelectModule, NzTableModule, NzTabsModule, NzTagModule, ApplyLeaveModalComponent,
  ],
  template: `
    <div class="flex flex-col flex-1 min-w-0 space-y-4">
      @if (isOwnerAccount()) {
        <nz-alert
          nzType="info"
          nzShowIcon
          nzMessage="Not applicable for owner accounts"
          nzDescription="My Workspace is a self-service area for employees. The owner account has no employee record to show here."
        ></nz-alert>
      } @else {
        <div class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs overflow-hidden">
          <nz-tabs [nzTabBarStyle]="{ margin: '0', padding: '0 24px' }">
            <!-- ================= LEAVE ================= -->
            <nz-tab nzTitle="Leave">
              <div class="px-6 pt-4 pb-5 space-y-4">
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  @for (row of leaveBalance(); track row.leaveType) {
                    <div class="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 shadow-xs p-3.5 flex flex-col gap-0.5">
                      <span class="text-xs font-semibold text-gray-500 dark:text-gray-400">{{ leaveTypeLabel(row.leaveType) }}</span>
                      <span class="text-xl font-bold text-gray-900 dark:text-white">{{ row.balance }}</span>
                      <span class="text-xs text-gray-400 dark:text-gray-500">days available</span>
                    </div>
                  }
                </div>

                <div class="flex items-center justify-between gap-3">
                  <h2 class="text-sm font-bold m-0 text-gray-900 dark:text-white">My requests</h2>
                  <button nz-button nzType="primary" type="button" (click)="openApplyDialog()" class="!h-9 !rounded-lg !px-4 !bg-blue-700 hover:!bg-blue-800">
                    <span nz-icon nzType="plus"></span>
                    Apply for leave
                  </button>
                </div>

                <nz-select [(ngModel)]="leaveStatusFilterValue" class="!w-44">
                  @for (opt of leaveStatusFilterOptions; track opt.label) {
                    <nz-option [nzLabel]="opt.label" [nzValue]="opt.value"></nz-option>
                  }
                </nz-select>

                @if (leaveLoading()) {
                  <p class="text-sm text-gray-500 dark:text-gray-400 py-4">Loading...</p>
                } @else if (!myLeaveRequests().length) {
                  <p class="text-sm text-gray-500 dark:text-gray-400 py-4">No leave requests yet.</p>
                } @else {
                  <div class="v2-data-table overflow-auto rounded-xl border border-gray-100 dark:border-gray-800">
                    <nz-table
                      [nzData]="filteredLeaveRequests()"
                      [nzShowPagination]="true"
                      [nzFrontPagination]="true"
                      [nzPageSize]="10"
                      [nzPageSizeOptions]="[10, 25, 50]"
                      nzShowSizeChanger
                      class="w-full text-left"
                    >
                      <thead>
                        <tr class="text-xs uppercase font-semibold text-gray-500 dark:text-gray-400">
                          <th>Type</th>
                          <th>Dates</th>
                          <th nzAlign="center">Days</th>
                          <th>Status</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody class="text-sm">
                        @for (r of filteredLeaveRequests(); track r.id) {
                          <tr>
                            <td>{{ leaveTypeLabel(r.leaveType) }}</td>
                            <td>{{ r.startDate | date: 'mediumDate' }} – {{ r.endDate | date: 'mediumDate' }}</td>
                            <td nzAlign="center">{{ r.days }}</td>
                            <td><nz-tag [nzColor]="leaveStatusColorOf(r.status)">{{ leaveStatusLabel(r.status) }}</nz-tag></td>
                            <td>
                              @if (r.status === 'PENDING') {
                                <button
                                  nz-button nzType="text" nzDanger nzSize="small" type="button"
                                  [nzLoading]="cancellingId() === r.id"
                                  (click)="cancelLeaveRequest(r.id)"
                                >Cancel</button>
                              }
                            </td>
                          </tr>
                        }
                      </tbody>
                    </nz-table>
                  </div>
                }
              </div>
            </nz-tab>

            <!-- ================= ATTENDANCE ================= -->
            <nz-tab nzTitle="Attendance">
              <div class="px-6 pt-4 pb-5 space-y-4">
                <div class="flex items-center gap-2">
                  <nz-select [(ngModel)]="attendanceMonthValue" (ngModelChange)="onAttendancePeriodChange()" class="!w-40">
                    @for (opt of monthOpts; track opt.value) {
                      <nz-option [nzLabel]="opt.label" [nzValue]="opt.value"></nz-option>
                    }
                  </nz-select>
                  <nz-select [(ngModel)]="attendanceYearValue" (ngModelChange)="onAttendancePeriodChange()" class="!w-28">
                    @for (opt of yearOpts; track opt.value) {
                      <nz-option [nzLabel]="opt.label" [nzValue]="opt.value"></nz-option>
                    }
                  </nz-select>
                </div>

                @if (attendanceLoading()) {
                  <p class="text-sm text-gray-500 dark:text-gray-400 py-4">Loading...</p>
                } @else if (attendanceSummary(); as summary) {
                  <div class="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                    <div class="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 shadow-xs p-3.5">
                      <span class="block text-xs font-semibold text-gray-500 dark:text-gray-400">Present</span>
                      <span class="text-xl font-bold text-gray-900 dark:text-white">{{ summary.summary.PRESENT }}</span>
                    </div>
                    <div class="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 shadow-xs p-3.5">
                      <span class="block text-xs font-semibold text-gray-500 dark:text-gray-400">Absent</span>
                      <span class="text-xl font-bold text-gray-900 dark:text-white">{{ summary.summary.ABSENT }}</span>
                    </div>
                    <div class="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 shadow-xs p-3.5">
                      <span class="block text-xs font-semibold text-gray-500 dark:text-gray-400">Half day</span>
                      <span class="text-xl font-bold text-gray-900 dark:text-white">{{ summary.summary.HALF_DAY }}</span>
                    </div>
                    <div class="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 shadow-xs p-3.5">
                      <span class="block text-xs font-semibold text-gray-500 dark:text-gray-400">On leave</span>
                      <span class="text-xl font-bold text-gray-900 dark:text-white">{{ summary.summary.ON_LEAVE }}</span>
                    </div>
                    <div class="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 shadow-xs p-3.5">
                      <span class="block text-xs font-semibold text-gray-500 dark:text-gray-400">Holiday</span>
                      <span class="text-xl font-bold text-gray-900 dark:text-white">{{ summary.summary.HOLIDAY }}</span>
                    </div>
                  </div>

                  @if (!summary.days.length) {
                    <p class="text-sm text-gray-500 dark:text-gray-400 py-4">No attendance records for this month.</p>
                  } @else {
                    <div class="v2-data-table overflow-auto rounded-xl border border-gray-100 dark:border-gray-800">
                      <nz-table
                        [nzData]="summary.days"
                        [nzShowPagination]="true"
                        [nzFrontPagination]="true"
                        [nzPageSize]="10"
                        [nzPageSizeOptions]="[10, 25, 50]"
                        nzShowSizeChanger
                        class="w-full text-left"
                      >
                        <thead>
                          <tr class="text-xs uppercase font-semibold text-gray-500 dark:text-gray-400">
                            <th>Date</th>
                            <th>Status</th>
                            <th>First punch</th>
                            <th>Last punch</th>
                          </tr>
                        </thead>
                        <tbody class="text-sm">
                          @for (day of summary.days; track day.id) {
                            <tr>
                              <td>{{ day.date | date: 'mediumDate' }}</td>
                              <td><nz-tag [nzColor]="attendanceStatusColorOf(day.status)">{{ attendanceStatusLabel(day.status) }}</nz-tag></td>
                              <td>{{ day.firstPunchAt ? (day.firstPunchAt | date: 'shortTime') : '—' }}</td>
                              <td>{{ day.lastPunchAt ? (day.lastPunchAt | date: 'shortTime') : '—' }}</td>
                            </tr>
                          }
                        </tbody>
                      </nz-table>
                    </div>
                  }
                }
              </div>
            </nz-tab>

            <!-- ================= PAYSLIPS ================= -->
            <nz-tab nzTitle="Payslips">
              <div class="px-6 pt-4 pb-5 space-y-2.5">
                @if (payslipsLoading()) {
                  <p class="text-sm text-gray-500 dark:text-gray-400 py-4">Loading...</p>
                } @else if (!payslips().length) {
                  <div class="flex flex-col items-center gap-2 py-10 text-gray-400 dark:text-gray-500">
                    <span nz-icon nzType="wallet" class="!text-2xl"></span>
                    <p class="text-sm m-0">No payslips yet. They appear once payroll has been run for a month.</p>
                  </div>
                } @else {
                  @for (payslip of payslips(); track payslip.id) {
                    <div class="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 shadow-xs overflow-hidden">
                      <button type="button" class="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 text-left" (click)="togglePayslip(payslip.id)">
                        <span class="text-sm font-semibold text-gray-900 dark:text-white">{{ payslipMonthLabel(payslip) }}</span>
                        <span class="flex items-center gap-2">
                          <span class="text-sm font-bold text-gray-900 dark:text-white">{{ payslip.netPay | number: '1.0-2' }}</span>
                          <span nz-icon [nzType]="expandedPayslipId() === payslip.id ? 'up' : 'down'" class="text-gray-400"></span>
                        </span>
                      </button>
                      @if (expandedPayslipId() === payslip.id) {
                        <div class="px-3.5 pb-3.5 space-y-1.5 border-t border-gray-100 dark:border-gray-800 pt-2.5">
                          <div class="flex items-center justify-between text-sm">
                            <span class="text-gray-600 dark:text-gray-300">Basic pay</span>
                            <span class="text-gray-900 dark:text-white">{{ payslip.basicPay | number: '1.0-2' }}</span>
                          </div>
                          @for (component of payslip.componentsSnapshot; track component.name) {
                            <div class="flex items-center justify-between text-sm">
                              <span class="text-gray-600 dark:text-gray-300">{{ component.name }} ({{ component.percent }}%)</span>
                              <span [class.text-red-500]="component.type === 'DEDUCTION'" class="text-gray-900 dark:text-white">
                                {{ component.type === 'DEDUCTION' ? '-' : '+' }}{{ component.amount | number: '1.0-2' }}
                              </span>
                            </div>
                          }
                          @if (payslip.lopDays !== '0' && payslip.lopDays !== '0.00') {
                            <div class="flex items-center justify-between text-sm">
                              <span class="text-gray-600 dark:text-gray-300">LOP ({{ payslip.lopDays }} days)</span>
                              <span class="text-red-500">-{{ payslip.lopAmount | number: '1.0-2' }}</span>
                            </div>
                          }
                          <div class="flex items-center justify-between text-sm font-bold pt-1.5 border-t border-gray-100 dark:border-gray-800">
                            <span class="text-gray-900 dark:text-white">Net pay</span>
                            <span class="text-gray-900 dark:text-white">{{ payslip.netPay | number: '1.0-2' }}</span>
                          </div>
                          <div class="flex justify-end pt-1">
                            <button
                              nz-button nzType="default" nzSize="small" type="button"
                              [nzLoading]="downloadingPayslipId() === payslip.id"
                              (click)="downloadPayslip(payslip)"
                              class="!rounded-lg"
                            >
                              <span nz-icon nzType="download"></span>
                              Download
                            </button>
                          </div>
                        </div>
                      }
                    </div>
                  }
                }
              </div>
            </nz-tab>

            <!-- ================= REVIEWS ================= -->
            <nz-tab nzTitle="Reviews">
              <div class="px-6 pt-4 pb-5 space-y-2.5">
                @if (reviewsLoading()) {
                  <p class="text-sm text-gray-500 dark:text-gray-400 py-4">Loading...</p>
                } @else if (!reviews().length) {
                  <div class="flex flex-col items-center gap-2 py-10 text-gray-400 dark:text-gray-500">
                    <span nz-icon nzType="star" class="!text-2xl"></span>
                    <p class="text-sm m-0">No performance reviews yet.</p>
                  </div>
                } @else {
                  @for (review of reviews(); track review.id) {
                    <div class="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 shadow-xs overflow-hidden">
                      <button type="button" class="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 text-left" (click)="toggleReview(review.id)">
                        <span class="flex items-center gap-2 min-w-0">
                          <span class="text-sm font-semibold text-gray-900 dark:text-white">{{ review.reviewDate | date: 'mediumDate' }}</span>
                          @if (review.rating != null) {
                            <span class="text-amber-500 text-sm">{{ stars(review.rating) }}</span>
                          }
                        </span>
                        <span class="flex items-center gap-2 shrink-0">
                          <nz-tag [nzColor]="reviewStatusColorOf(review.status)">{{ reviewStatusLabel(review.status) }}</nz-tag>
                          <span nz-icon [nzType]="isReviewExpanded(review.id) ? 'up' : 'down'" class="text-gray-400"></span>
                        </span>
                      </button>
                      @if (isReviewExpanded(review.id)) {
                        <div class="px-3.5 pb-3.5 space-y-2.5 border-t border-gray-100 dark:border-gray-800 pt-2.5">
                          <p class="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap m-0">{{ review.notes }}</p>

                          @if (review.responses.length) {
                            <div class="space-y-1.5">
                              @for (response of review.responses; track response.id) {
                                <div
                                  class="rounded-lg p-2.5 text-xs"
                                  [class]="response.authorType === 'EMPLOYEE'
                                    ? 'bg-blue-50 dark:bg-blue-900/20 ml-6'
                                    : 'bg-gray-50 dark:bg-gray-800/60 mr-6'"
                                >
                                  <span class="block font-bold text-gray-500 dark:text-gray-400 mb-0.5">{{ reviewAuthorLabel(response.authorType) }}</span>
                                  <p class="m-0 whitespace-pre-wrap text-gray-700 dark:text-gray-300">{{ response.message }}</p>
                                </div>
                              }
                            </div>
                          }

                          @if (review.status !== 'SIGNED_OFF') {
                            <div class="space-y-2 pt-1">
                              <textarea
                                nz-input rows="3" maxlength="2000" placeholder="Write a reply..."
                                class="!rounded-lg"
                                [ngModel]="reviewReplyDraft(review.id)"
                                (ngModelChange)="setReviewReplyDraft(review.id, $event)"
                              ></textarea>
                              <div class="flex justify-end gap-2">
                                <button
                                  nz-button nzType="text" nzSize="small" type="button"
                                  [nzLoading]="signingOffReviewId() === review.id"
                                  (click)="signOffReview(review)"
                                  class="!rounded-lg"
                                >
                                  <span nz-icon nzType="check"></span>
                                  Sign off
                                </button>
                                <button
                                  nz-button nzType="primary" nzSize="small" type="button"
                                  [disabled]="isReplyBlank(review.id)"
                                  [nzLoading]="sendingReplyReviewId() === review.id"
                                  (click)="sendEmployeeReply(review)"
                                  class="!rounded-lg !bg-blue-700 hover:!bg-blue-800"
                                >
                                  Send reply
                                </button>
                              </div>
                            </div>
                          }
                        </div>
                      }
                    </div>
                  }
                }
              </div>
            </nz-tab>

            <!-- ================= APPRAISALS ================= -->
            <nz-tab nzTitle="Appraisal letters">
              <div class="px-6 pt-4 pb-5 space-y-2.5">
                @if (appraisalsLoading()) {
                  <p class="text-sm text-gray-500 dark:text-gray-400 py-4">Loading...</p>
                } @else if (!appraisals().length) {
                  <div class="flex flex-col items-center gap-2 py-10 text-gray-400 dark:text-gray-500">
                    <span nz-icon nzType="file-text" class="!text-2xl"></span>
                    <p class="text-sm m-0">No appraisal letters yet.</p>
                  </div>
                } @else {
                  @for (appraisal of appraisals(); track appraisal.id) {
                    <div class="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 shadow-xs overflow-hidden">
                      <button type="button" class="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 text-left" (click)="toggleAppraisal(appraisal.id)">
                        <span class="text-sm font-semibold text-gray-900 dark:text-white">{{ appraisal.effectiveDate | date: 'mediumDate' }}</span>
                        <span class="flex items-center gap-2">
                          <span class="text-sm font-bold text-gray-900 dark:text-white">{{ appraisal.newBasicPay | number: '1.0-2' }}</span>
                          <span nz-icon [nzType]="expandedAppraisalId() === appraisal.id ? 'up' : 'down'" class="text-gray-400"></span>
                        </span>
                      </button>
                      @if (expandedAppraisalId() === appraisal.id) {
                        <div class="px-3.5 pb-3.5 border-t border-gray-100 dark:border-gray-800 pt-2.5">
                          <p class="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap m-0">{{ appraisal.letterContent }}</p>
                        </div>
                      }
                    </div>
                  }
                }
              </div>
            </nz-tab>
          </nz-tabs>
        </div>

        @if (applyDialogVisible()) {
          <app-apply-leave-modal (cancel)="closeApplyDialog()" (save)="submitLeaveApplication($event)"></app-apply-leave-modal>
        }
      }
    </div>
  `,
  host: { class: 'flex flex-col flex-1 min-h-0 min-w-0 w-full max-w-full' },
})
export class V2MyWorkspacePageComponent implements OnInit {
  private tokenStorage = inject(TokenStorage);
  private leaveApi = inject(LeaveApiService);
  private attendanceApi = inject(AttendanceApiService);
  private payrollApi = inject(PayrollApiService);
  private performanceApi = inject(PerformanceApiService);
  private toast = inject(ToastService);

  readonly isOwnerAccount = computed(() => this.tokenStorage.isOwner());

  readonly leaveTypeLabel = (type: keyof typeof LEAVE_TYPE_LABEL) => LEAVE_TYPE_LABEL[type];
  readonly leaveStatusLabel = (status: LeaveStatus) => LEAVE_STATUS_LABEL[status];
  readonly leaveStatusColorOf = leaveStatusColor;
  readonly attendanceStatusLabel = (status: AttendanceDayRecord['status']) => ATTENDANCE_STATUS_LABEL[status];
  readonly attendanceStatusColorOf = attendanceStatusColor;
  readonly reviewStatusLabel = (status: Review['status']) => REVIEW_STATUS_LABEL[status];
  readonly reviewStatusColorOf = reviewStatusColor;
  readonly reviewAuthorLabel = (author: 'EMPLOYEE' | 'MANAGEMENT') => REVIEW_AUTHOR_LABEL[author];
  readonly stars = ratingStars;

  ngOnInit(): void {
    if (this.isOwnerAccount()) return;
    this.loadLeaveData();
    this.loadAttendance();
    this.loadPayslips();
    this.loadReviews();
    this.loadAppraisals();
  }

  // ---- Leave ----

  leaveBalance = signal<LeaveBalanceRow[]>([]);
  myLeaveRequests = signal<LeaveRequest[]>([]);
  leaveLoading = signal(false);
  leaveStatusFilterValue: LeaveStatus | null = null;

  readonly leaveStatusFilterOptions: { label: string; value: LeaveStatus | null }[] = [
    { label: 'All statuses', value: null },
    { label: 'Pending', value: 'PENDING' },
    { label: 'Approved', value: 'APPROVED' },
    { label: 'Rejected', value: 'REJECTED' },
    { label: 'Cancelled', value: 'CANCELLED' },
  ];

  filteredLeaveRequests = computed(() => {
    const status = this.leaveStatusFilterValue;
    const rows = this.myLeaveRequests();
    return status ? rows.filter((r) => r.status === status) : rows;
  });

  applyDialogVisible = signal(false);
  cancellingId = signal<string | null>(null);

  loadLeaveData(): void {
    this.leaveLoading.set(true);
    this.leaveApi.myBalance().subscribe({ next: (rows) => this.leaveBalance.set(rows) });
    this.leaveApi.myRequests().subscribe({
      next: (rows) => {
        this.leaveLoading.set(false);
        this.myLeaveRequests.set(rows);
      },
      error: () => this.leaveLoading.set(false),
    });
  }

  openApplyDialog(): void {
    this.applyDialogVisible.set(true);
  }

  closeApplyDialog(): void {
    this.applyDialogVisible.set(false);
  }

  submitLeaveApplication(payload: { leaveType: LeaveRequest['leaveType']; startDate: string; endDate: string; reason?: string }): void {
    this.leaveApi.apply(payload).subscribe({
      next: () => {
        this.applyDialogVisible.set(false);
        this.loadLeaveData();
      },
      error: (err) => {
        this.toast.error(err?.error?.message ?? 'Could not submit leave application.');
      },
    });
  }

  cancelLeaveRequest(id: string): void {
    this.cancellingId.set(id);
    this.leaveApi.cancelMine(id).subscribe({
      next: () => {
        this.cancellingId.set(null);
        this.loadLeaveData();
      },
      error: () => this.cancellingId.set(null),
    });
  }

  // ---- Attendance ----

  private today = new Date();
  attendanceYearValue = this.today.getFullYear();
  attendanceMonthValue = this.today.getMonth() + 1;
  attendanceLoading = signal(false);
  attendanceSummary = signal<EmployeeMonthlySummary | null>(null);

  readonly monthOpts = monthOptions('en');
  readonly yearOpts = yearOptions(this.today.getFullYear());

  loadAttendance(): void {
    this.attendanceLoading.set(true);
    this.attendanceApi.myMonthly(this.attendanceYearValue, this.attendanceMonthValue).subscribe({
      next: (summary) => {
        this.attendanceLoading.set(false);
        this.attendanceSummary.set(summary);
      },
      error: () => this.attendanceLoading.set(false),
    });
  }

  onAttendancePeriodChange(): void {
    this.loadAttendance();
  }

  // ---- Payslips ----

  payslips = signal<Payslip[]>([]);
  payslipsLoading = signal(false);
  expandedPayslipId = signal<string | null>(null);
  downloadingPayslipId = signal<string | null>(null);

  loadPayslips(): void {
    this.payslipsLoading.set(true);
    this.payrollApi.mine().subscribe({
      next: (rows) => {
        this.payslipsLoading.set(false);
        this.payslips.set(rows);
      },
      error: () => this.payslipsLoading.set(false),
    });
  }

  togglePayslip(id: string): void {
    this.expandedPayslipId.update((current) => (current === id ? null : id));
  }

  payslipMonthLabel(payslip: Payslip): string {
    return monthLabel(payslip.year, payslip.month, 'en');
  }

  downloadPayslip(payslip: Payslip): void {
    this.downloadingPayslipId.set(payslip.id);
    this.payrollApi.mineOnePdf(payslip.id).subscribe({
      next: (blob) => {
        this.downloadingPayslipId.set(null);
        downloadBlob(blob, `Payslip-${this.payslipMonthLabel(payslip).replace(/\s+/g, '-')}.pdf`);
      },
      error: () => {
        this.downloadingPayslipId.set(null);
        this.toast.error('Could not download payslip.');
      },
    });
  }

  // ---- Reviews ----

  reviews = signal<Review[]>([]);
  reviewsLoading = signal(false);
  expandedReviewIds = signal<Set<string>>(new Set());
  reviewReplyDrafts = signal<Record<string, string>>({});
  sendingReplyReviewId = signal<string | null>(null);
  signingOffReviewId = signal<string | null>(null);

  loadReviews(): void {
    this.reviewsLoading.set(true);
    this.performanceApi.myReviews().subscribe({
      next: (rows) => {
        this.reviewsLoading.set(false);
        this.reviews.set(rows);
      },
      error: () => this.reviewsLoading.set(false),
    });
  }

  toggleReview(id: string): void {
    this.expandedReviewIds.update((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  isReviewExpanded(id: string): boolean {
    return this.expandedReviewIds().has(id);
  }

  reviewReplyDraft(reviewId: string): string {
    return this.reviewReplyDrafts()[reviewId] ?? '';
  }

  setReviewReplyDraft(reviewId: string, value: string): void {
    this.reviewReplyDrafts.update((drafts) => ({ ...drafts, [reviewId]: value }));
  }

  isReplyBlank(reviewId: string): boolean {
    return richTextIsBlank(this.reviewReplyDraft(reviewId));
  }

  sendEmployeeReply(review: Review): void {
    const message = this.reviewReplyDraft(review.id);
    if (richTextIsBlank(message)) return;
    this.sendingReplyReviewId.set(review.id);
    this.performanceApi.replyAsEmployee(review.id, message.trim()).subscribe({
      next: () => {
        this.sendingReplyReviewId.set(null);
        this.setReviewReplyDraft(review.id, '');
        this.loadReviews();
      },
      error: () => {
        this.sendingReplyReviewId.set(null);
        this.toast.error('Could not send reply.');
      },
    });
  }

  signOffReview(review: Review): void {
    this.signingOffReviewId.set(review.id);
    this.performanceApi.signOffReview(review.id).subscribe({
      next: () => {
        this.signingOffReviewId.set(null);
        this.loadReviews();
      },
      error: () => {
        this.signingOffReviewId.set(null);
        this.toast.error('Could not sign off review.');
      },
    });
  }

  // ---- Appraisals ----

  appraisals = signal<Appraisal[]>([]);
  appraisalsLoading = signal(false);
  expandedAppraisalId = signal<string | null>(null);

  loadAppraisals(): void {
    this.appraisalsLoading.set(true);
    this.performanceApi.myAppraisals().subscribe({
      next: (rows) => {
        this.appraisalsLoading.set(false);
        this.appraisals.set(rows);
      },
      error: () => this.appraisalsLoading.set(false),
    });
  }

  toggleAppraisal(id: string): void {
    this.expandedAppraisalId.update((current) => (current === id ? null : id));
  }
}
