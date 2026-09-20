import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { DatePickerModule } from 'primeng/datepicker';
import { TextareaModule } from 'primeng/textarea';
import { EditorModule } from 'primeng/editor';
import { TagModule } from 'primeng/tag';

import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { TranslationService } from '../../../core/i18n/translation.service';
import { TokenStorage } from '../../../core/auth/token-storage.service';
import { PageHeaderService } from '../../../shared/page-header/page-header.service';
import { LeaveApiService, LeaveBalanceRow, LeaveRequest, LeaveStatus, LeaveType } from '../../../core/leave/leave-api.service';
import { AttendanceApiService, AttendanceDayRecord, EmployeeMonthlySummary, AttendanceStatus } from '../../../core/attendance/attendance-api.service';
import { PayrollApiService, Payslip } from '../../../core/payroll/payroll-api.service';
import { PerformanceApiService, Review, Appraisal } from '../../../core/performance/performance-api.service';
import { ToastService } from '../../../core/toast/toast.service';
import { downloadBlob } from '../../../core/common/csv-browser.util';

/**
 * My Workspace — self-service home for any logged-in employee (not the
 * Owner, who has no Employee record and is redirected away from this
 * route entirely, same as the old "Employee Portal" dashboard tab this
 * replaces). Apply Leave and Attendance Tracker are real today; Payslips,
 * Reviews and Appraisal Letters are placeholders until the payroll and
 * appraisal-cycle phases land their backend models — see the phased
 * implementation plan discussed with the user.
 */
// Quill (the p-editor's underlying rich-text engine) reports an empty
// editor as HTML like "<p><br></p>", so a plain .trim() on the model
// value never sees it as blank — strip tags first to get the real text.
function richTextIsBlank(html: string): boolean {
  return !html?.replace(/<[^>]*>/g, '').trim();
}

@Component({
  selector: 'app-my-workspace',
  standalone: true,
  imports: [CommonModule, ButtonModule, DialogModule, SelectModule, FormsModule, DatePickerModule, TextareaModule, EditorModule, TagModule, TranslatePipe],
  templateUrl: './my-workspace.html',
  styleUrls: ['./my-workspace.css'],
})
export class MyWorkspace implements OnInit {
  // Exposed for the template's [disabled] check on the rich-text field.
  readonly richTextIsBlank = richTextIsBlank;
  private leaveApi = inject(LeaveApiService);
  private attendanceApi = inject(AttendanceApiService);
  private payrollApi = inject(PayrollApiService);
  private toast = inject(ToastService);
  private performanceApi = inject(PerformanceApiService);
  private tokenStorage = inject(TokenStorage);
  private i18n = inject(TranslationService);
  private pageHeader = inject(PageHeaderService);
  private destroyRef = inject(DestroyRef);

  isOwnerAccount = computed(() => this.tokenStorage.isOwner());

  tabs = [
    { id: 'leave', labelKey: 'myWorkspace.tabs.leave', icon: 'calendar-plus' },
    { id: 'attendance', labelKey: 'myWorkspace.tabs.attendance', icon: 'calendar-clock' },
    { id: 'payslips', labelKey: 'myWorkspace.tabs.payslips', icon: 'wallet' },
    { id: 'reviews', labelKey: 'myWorkspace.tabs.reviews', icon: 'star' },
    { id: 'appraisals', labelKey: 'myWorkspace.tabs.appraisals', icon: 'file' },
  ];
  activeTab = signal<string>('leave');

  selectTab(id: string): void {
    this.activeTab.set(id);
  }

  ngOnInit(): void {
    this.pageHeader.setTitleKey('myWorkspace.title');
    this.destroyRef.onDestroy(() => this.pageHeader.clear());
    if (this.isOwnerAccount()) {
      return;
    }
    this.loadLeaveData();
    this.loadAttendance();
    this.loadPayslips();
    this.loadReviews();
    this.loadAppraisals();
  }

  // ---- Apply Leave (moved from Dashboard's Employee Portal tab —
  // identical behavior, just relocated per the product decision that
  // self-service belongs in its own section, not under Dashboard). ----

  leaveBalance = signal<LeaveBalanceRow[]>([]);
  myLeaveRequests = signal<LeaveRequest[]>([]);
  leaveLoading = signal(false);

  applyDialogVisible = signal(false);
  applyLeaveType = signal<LeaveType>('CASUAL');
  applyStartDate = signal<Date | null>(null);
  applyEndDate = signal<Date | null>(null);
  applyReason = signal('');
  applySaving = signal(false);
  applyError = signal<string | null>(null);

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
    this.applyLeaveType.set('CASUAL');
    this.applyStartDate.set(null);
    this.applyEndDate.set(null);
    this.applyReason.set('');
    this.applyError.set(null);
    this.applyDialogVisible.set(true);
  }

  closeApplyDialog(): void {
    this.applyDialogVisible.set(false);
  }

  submitLeaveApplication(): void {
    const start = this.applyStartDate();
    const end = this.applyEndDate();
    if (!start || !end) {
      this.applyError.set(this.i18n.t('dashboard.leave.datesRequired'));
      return;
    }
    this.applySaving.set(true);
    this.applyError.set(null);
    this.leaveApi
      .apply({
        leaveType: this.applyLeaveType(),
        startDate: start.toISOString().slice(0, 10),
        endDate: end.toISOString().slice(0, 10),
        reason: this.applyReason() || undefined,
      })
      .subscribe({
        next: () => {
          this.applySaving.set(false);
          this.applyDialogVisible.set(false);
          this.loadLeaveData();
        },
        error: (err) => {
          this.applySaving.set(false);
          this.applyError.set(err?.error?.message ?? this.i18n.t('dashboard.leave.applyError'));
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

  leaveStatusSeverity(status: LeaveStatus): 'success' | 'danger' | 'warn' | 'secondary' {
    if (status === 'APPROVED') return 'success';
    if (status === 'REJECTED') return 'danger';
    if (status === 'CANCELLED') return 'secondary';
    return 'warn';
  }

  leaveTypeOptions = computed(() => [
    { label: this.i18n.t('leaveManagement.type.CASUAL'), value: 'CASUAL' as LeaveType },
    { label: this.i18n.t('leaveManagement.type.SICK'), value: 'SICK' as LeaveType },
    { label: this.i18n.t('leaveManagement.type.EARNED'), value: 'EARNED' as LeaveType },
  ]);

  leaveTypeLabel(type: LeaveType): string {
    return this.i18n.t(`leaveManagement.type.${type}`);
  }

  // ---- Attendance Tracker — self-service month view, backed by the
  // new AttendanceController.myMonthly endpoint (no ATTENDANCE
  // permission required, same self-only pattern as leave). ----

  today = new Date();
  attendanceYear = signal(this.today.getFullYear());
  attendanceMonth = signal(this.today.getMonth() + 1); // 1-12
  attendanceLoading = signal(false);
  attendanceSummary = signal<EmployeeMonthlySummary | null>(null);

  // Locale-formatted month names rather than 12 new translation keys —
  // Intl already knows the current locale from TranslationService.
  monthOptions = computed(() => {
    const locale = this.i18n.lang() === 'ta' ? 'ta-IN' : 'en-US';
    const formatter = new Intl.DateTimeFormat(locale, { month: 'long' });
    return Array.from({ length: 12 }, (_, i) => ({ label: formatter.format(new Date(2000, i, 1)), value: i + 1 }));
  });
  yearOptions = computed(() => {
    const current = this.today.getFullYear();
    return Array.from({ length: 5 }, (_, i) => current - i).map((y) => ({ label: String(y), value: y }));
  });

  loadAttendance(): void {
    this.attendanceLoading.set(true);
    this.attendanceApi.myMonthly(this.attendanceYear(), this.attendanceMonth()).subscribe({
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

  attendanceStatusSeverity(status: AttendanceStatus): 'success' | 'danger' | 'warn' | 'info' | 'secondary' {
    if (status === 'PRESENT') return 'success';
    if (status === 'ABSENT') return 'danger';
    if (status === 'HALF_DAY') return 'warn';
    if (status === 'ON_LEAVE') return 'info';
    return 'secondary';
  }

  attendanceStatusLabel(status: AttendanceStatus): string {
    return this.i18n.t(`myWorkspace.attendanceStatus.${status}`);
  }

  trackDay(_index: number, day: AttendanceDayRecord): string {
    return day.id;
  }

  // ---- Payslips — self-service list backed by PayrollController.mine.
  // Payroll must be generated by the Owner first (see the admin Payroll
  // screen); nothing appears here for a month that hasn't been run
  // yet. ----

  payslips = signal<Payslip[]>([]);
  payslipsLoading = signal(false);
  expandedPayslipId = signal<string | null>(null);

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

  monthLabel(year: number, month: number): string {
    const locale = this.i18n.lang() === 'ta' ? 'ta-IN' : 'en-US';
    return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1));
  }

  trackPayslip(_index: number, payslip: Payslip): string {
    return payslip.id;
  }

  downloadingPayslipId = signal<string | null>(null);

  downloadPayslip(payslip: Payslip): void {
    this.downloadingPayslipId.set(payslip.id);
    this.payrollApi.mineOnePdf(payslip.id).subscribe({
      next: (blob) => {
        this.downloadingPayslipId.set(null);
        downloadBlob(blob, `Payslip-${this.monthLabel(payslip.year, payslip.month).replace(/\s+/g, '-')}.pdf`);
      },
      error: () => {
        this.downloadingPayslipId.set(null);
        this.toast.error(this.i18n.t('myWorkspace.payslipDownloadError'));
      },
    });
  }

  // ---- Reviews — self-service list backed by
  // PerformanceController.myReviews. Logged ad hoc by a manager, no
  // fixed cadence (see the Review model's doc comment). ----

  reviews = signal<Review[]>([]);
  reviewsLoading = signal(false);

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

  ratingStars(rating: number | null): string {
    if (rating == null) return '';
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  }

  trackReview(_index: number, review: Review): string {
    return review.id;
  }

  reviewStatusSeverity(status: Review['status']): 'success' | 'warn' | 'info' {
    if (status === 'SIGNED_OFF') return 'success';
    if (status === 'PENDING_MANAGEMENT') return 'warn';
    return 'info';
  }

  trackResponse(_index: number, response: Review['responses'][number]): string {
    return response.id;
  }

  // Reply drafts, one per review, and per-review saving state — same
  // pattern as the admin side's management reply box.
  reviewReplyDrafts = signal<Record<string, string>>({});
  sendingReplyReviewId = signal<string | null>(null);
  signingOffReviewId = signal<string | null>(null);

  reviewReplyDraft(reviewId: string): string {
    return this.reviewReplyDrafts()[reviewId] ?? '';
  }

  setReviewReplyDraft(reviewId: string, value: string): void {
    this.reviewReplyDrafts.update((drafts) => ({ ...drafts, [reviewId]: value }));
  }

  sendEmployeeReply(review: Review): void {
    const message = this.reviewReplyDraft(review.id);
    if (richTextIsBlank(message)) {
      return;
    }
    this.sendingReplyReviewId.set(review.id);
    this.performanceApi.replyAsEmployee(review.id, message).subscribe({
      next: () => {
        this.sendingReplyReviewId.set(null);
        this.setReviewReplyDraft(review.id, '');
        this.loadReviews();
      },
      error: () => this.sendingReplyReviewId.set(null),
    });
  }

  signOffReview(review: Review): void {
    this.signingOffReviewId.set(review.id);
    this.performanceApi.signOffReview(review.id).subscribe({
      next: () => {
        this.signingOffReviewId.set(null);
        this.loadReviews();
      },
      error: () => this.signingOffReviewId.set(null),
    });
  }

  // ---- Appraisal Letters — self-service list backed by
  // PerformanceController.myAppraisals. ----

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

  trackAppraisal(_index: number, appraisal: Appraisal): string {
    return appraisal.id;
  }
}
