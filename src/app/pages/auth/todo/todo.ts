import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { SelectModule } from 'primeng/select';
import { DialogModule } from 'primeng/dialog';
import { TextareaModule } from 'primeng/textarea';
import { TooltipModule } from 'primeng/tooltip';

import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { TranslationService } from '../../../core/i18n/translation.service';
import { PageHeaderService } from '../../../shared/page-header/page-header.service';
import { ToastService } from '../../../core/toast/toast.service';
import { PermissionsService } from '../../../core/roles/permissions.service';
import { LeaveApiService, LeaveRequest, LeaveStatus, LeaveType } from '../../../core/leave/leave-api.service';
import { TodoBadgeService } from '../../../core/todo/todo-badge.service';

/**
 * To-Do: the single place an admin/approver looks for "things that
 * need my attention right now". Today that's just pending leave
 * requests (moved here from Leave Management, which now only holds
 * the allocation *configuration* — a setup screen, not a queue).
 *
 * This page is deliberately structured to grow: each item on this
 * page is one attention-needing task from *some* category. Leave
 * requests are the first category; "Review Submissions" and anything
 * else that needs a human decision should become additional sections
 * here rather than living on their own separate pages, so there's one
 * place to check instead of many.
 */
@Component({
  selector: 'app-todo',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, TagModule, SelectModule, DialogModule, TextareaModule, TooltipModule, TranslatePipe],
  templateUrl: './todo.html',
  styleUrls: ['./todo.css'],
})
export class Todo implements OnInit {
  private leaveApi = inject(LeaveApiService);
  private toast = inject(ToastService);
  private i18n = inject(TranslationService);
  private destroyRef = inject(DestroyRef);
  private pageHeader = inject(PageHeaderService);
  private permissions = inject(PermissionsService);
  private todoBadge = inject(TodoBadgeService);

  canWrite = computed(() => this.permissions.canWrite('LEAVES'));

  loading = signal(true);
  requests = signal<LeaveRequest[]>([]);
  // "Needs attention" defaults to pending-only — this is a to-do list,
  // not a history log — but the filter is still here so the same
  // screen can double as "what did I already decide".
  statusFilter = signal<LeaveStatus | null>('PENDING');

  statusFilterOptions = computed(() => [
    { label: this.i18n.t('todo.leave.allStatuses'), value: null },
    { label: this.i18n.t('todo.leave.status.PENDING'), value: 'PENDING' as LeaveStatus },
    { label: this.i18n.t('todo.leave.status.APPROVED'), value: 'APPROVED' as LeaveStatus },
    { label: this.i18n.t('todo.leave.status.REJECTED'), value: 'REJECTED' as LeaveStatus },
    { label: this.i18n.t('todo.leave.status.CANCELLED'), value: 'CANCELLED' as LeaveStatus },
  ]);

  decisionDialogVisible = signal(false);
  decisionTarget = signal<LeaveRequest | null>(null);
  decisionApprove = signal(true);
  decisionNote = signal('');
  deciding = signal(false);

  ngOnInit(): void {
    this.pageHeader.setTitleKey('todo.title');
    this.destroyRef.onDestroy(() => this.pageHeader.clear());
    this.loadRequests();
  }

  loadRequests(): void {
    this.loading.set(true);
    this.leaveApi.teamRequests({ status: this.statusFilter() ?? undefined }).subscribe({
      next: (requests) => {
        this.loading.set(false);
        this.requests.set(requests);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error(this.i18n.t('todo.leave.loadError'));
      },
    });
  }

  onStatusFilterChange(status: LeaveStatus | null): void {
    this.statusFilter.set(status);
    this.loadRequests();
  }

  openDecision(request: LeaveRequest, approve: boolean): void {
    this.decisionTarget.set(request);
    this.decisionApprove.set(approve);
    this.decisionNote.set('');
    this.decisionDialogVisible.set(true);
  }

  closeDecision(): void {
    this.decisionDialogVisible.set(false);
  }

  confirmDecision(): void {
    const target = this.decisionTarget();
    if (!target) return;
    this.deciding.set(true);
    const call = this.decisionApprove()
      ? this.leaveApi.approve(target.id, this.decisionNote() || undefined)
      : this.leaveApi.reject(target.id, this.decisionNote() || undefined);
    call.subscribe({
      next: () => {
        this.deciding.set(false);
        this.decisionDialogVisible.set(false);
        this.toast.success(this.i18n.t(this.decisionApprove() ? 'todo.leave.approvedSuccess' : 'todo.leave.rejectedSuccess'));
        this.loadRequests();
        // The sidebar badge counts pending items across all
        // categories — refresh it now instead of waiting for its own
        // poll, so approving/rejecting here updates it immediately.
        this.todoBadge.refresh();
      },
      error: (err) => {
        this.deciding.set(false);
        this.toast.error(err?.error?.message ?? this.i18n.t('todo.leave.decisionError'));
      },
    });
  }

  statusSeverity(status: LeaveStatus): 'success' | 'danger' | 'warn' | 'secondary' {
    if (status === 'APPROVED') return 'success';
    if (status === 'REJECTED') return 'danger';
    if (status === 'CANCELLED') return 'secondary';
    return 'warn';
  }

  leaveTypeLabel(type: LeaveType): string {
    return this.i18n.t(`todo.leave.type.${type}`);
  }
}
