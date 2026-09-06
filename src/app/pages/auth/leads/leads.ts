import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { TagModule } from 'primeng/tag';
import { MessageModule } from 'primeng/message';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { TooltipModule } from 'primeng/tooltip';
import { CardModule } from 'primeng/card';
import { AvatarModule } from 'primeng/avatar';

import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { TranslationService } from '../../../core/i18n/translation.service';
import { ToastService } from '../../../core/toast/toast.service';
import { ConfirmService } from '../../../core/confirm/confirm.service';
import { Lead, LeadActivity, LeadApiService, LeadPayload, LeadStatus } from '../../../core/leads/lead-api.service';
import { BranchStore } from '../../../core/branches/branch-store.service';
import { LEAD_SOURCES } from '../../../core/constants/lead-sources';
import { PermissionsService } from '../../../core/roles/permissions.service';
import { EmployeeStore } from '../../../core/employees/employee-store.service';
import { AuthApiService, MeResponse } from '../../../core/auth/auth-api.service';

type StatusSeverity = 'info' | 'success' | 'warn' | 'danger' | 'secondary';

const STATUS_SEVERITY: Record<LeadStatus, StatusSeverity> = {
  NEW: 'info',
  CONTACTED: 'secondary',
  TRIAL_SCHEDULED: 'warn',
  TRIAL_COMPLETED: 'warn',
  CONVERTED: 'success',
  LOST: 'danger',
};

/**
 * Leads — chain-wide by default (an owner sees every branch's leads,
 * filterable by branch), shown as the same card-grid/list-toggle
 * pattern as Branches. Clicking any lead opens a large detail dialog
 * that doubles as the edit form, with a follow-up timeline underneath
 * it fed by manually logged notes (see LeadActivity on the backend).
 */
@Component({
  selector: 'app-leads',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    TextareaModule,
    SelectModule,
    DatePickerModule,
    TagModule,
    MessageModule,
    IconFieldModule,
    InputIconModule,
    TooltipModule,
    CardModule,
    AvatarModule,
    TranslatePipe,
  ],
  templateUrl: './leads.html',
  styleUrls: ['./leads.css'],
})
export class Leads implements OnInit {
  private fb = inject(FormBuilder);
  private leadApi = inject(LeadApiService);
  private branchStore = inject(BranchStore);
  private employeeStore = inject(EmployeeStore);
  private authApi = inject(AuthApiService);
  private toast = inject(ToastService);
  private confirmService = inject(ConfirmService);
  private i18n = inject(TranslationService);
  private permissions = inject(PermissionsService);

  // Gates every add/edit/create action on this screen — the server
  // re-checks write access on each request regardless (PermissionGuard),
  // this just keeps the UI from offering actions that would 403.
  canWrite = computed(() => this.permissions.canWrite('LEADS'));

  // A staff login with only LEADS permission can't call the Branches or
  // Employees list endpoints (403 — PermissionGuard). These drive
  // whether this screen even tries to, versus falling back to the
  // user's own branch/employee record (from /auth/me, always readable)
  // for the create/detail forms' branch and "assigned to" fields.
  canReadBranches = computed(() => this.permissions.canRead('BRANCHES'));
  canReadEmployees = computed(() => this.permissions.canRead('EMPLOYEES'));

  leads = signal<Lead[]>([]);
  // Shared cache — see BranchStore; this page only ever wants ACTIVE branches.
  branches = this.branchStore.activeBranches;
  // Real employees to assign a lead to — "Assigned to" used to be a
  // free-text name field; now it's a real link to an Employee record
  // (see Lead.assignedToEmployeeId on the backend).
  // Shared cache — see EmployeeStore; this page only ever wants ACTIVE employees.
  employees = this.employeeStore.activeEmployees;
  // The logged-in user's own profile (name, branch, linked employee) —
  // used to default/lock "branch" and "assigned to" to themselves when
  // they can't browse the full Branches/Employees lists.
  me = signal<MeResponse | null>(null);
  loading = signal(false);
  saving = signal(false);
  savingNote = signal(false);

  searchTerm = signal('');
  branchFilter = signal<string | null>(null);
  sourceFilter = signal<string | null>(null);
  assignedToFilter = signal<string | null>(null);
  // [start, end] from the p-datepicker range picker, or null — filters
  // on the lead's createdAt.
  dateRange = signal<Date[] | null>(null);

  viewMode = signal<'grid' | 'list'>('grid');
  setViewMode(mode: 'grid' | 'list'): void {
    this.viewMode.set(mode);
  }

  // Create dialog (lightweight — no timeline, lead doesn't exist yet)
  // and detail dialog (edit form + timeline for an existing lead) are
  // deliberately separate, since the detail view needs a persisted id
  // before any activity/timeline call makes sense.
  createDialogVisible = signal(false);
  detailDialogVisible = signal(false);
  detailLead = signal<Lead | null>(null);
  errorMessage = signal<string | null>(null);
  noteText = signal('');
  noteFollowUpAt = signal<Date | null>(null);

  // Detail dialog: the follow-up timeline is the important part once a
  // lead exists, so the edit-details form starts collapsed and only
  // expands on request — the accordion's own open/closed state, reset
  // to collapsed each time a lead is opened (see openDetail).
  detailsExpanded = signal(false);

  sourceOptions = LEAD_SOURCES;

  // Full list — used for badge labels (statusLabel) wherever a lead's
  // status needs to be shown as text, including CONVERTED/LOST.
  statusOptions: { label: string; value: LeadStatus }[] = [
    { label: 'New', value: 'NEW' },
    { label: 'Contacted', value: 'CONTACTED' },
    { label: 'Trial scheduled', value: 'TRIAL_SCHEDULED' },
    { label: 'Trial completed', value: 'TRIAL_COMPLETED' },
    { label: 'Converted', value: 'CONVERTED' },
    { label: 'Lost', value: 'LOST' },
  ];

  // The status dropdown only offers the active pipeline stages —
  // CONVERTED/LOST are reached exclusively through the "Conclude"
  // checkbox below, which also captures the required comment.
  activeStatusOptions = this.statusOptions.filter((s) => s.value !== 'CONVERTED' && s.value !== 'LOST');

  concludeOutcomeOptions: { label: string; value: 'CONVERTED' | 'LOST' }[] = [
    { label: 'Converted', value: 'CONVERTED' },
    { label: 'Lost', value: 'LOST' },
  ];

  // Falls back to "just my own branch" when the user can't read the
  // Branches list — a single, unchangeable option rather than an empty
  // dropdown.
  branchOptions = computed(() => {
    if (this.canReadBranches()) {
      return this.branches().map((b) => ({ label: b.location, value: b.id }));
    }
    const own = this.me();
    return own?.branch ? [{ label: own.branch.location, value: own.branch.id }] : [];
  });
  branchFilterOptions = computed(() => [{ label: this.i18n.t('leads.allBranches'), value: null }, ...this.branchOptions()]);

  sourceFilterOptions = computed(() => [
    { label: this.i18n.t('leads.allSources'), value: null },
    ...this.sourceOptions,
  ]);

  // Every active employee, for the "Assigned to" dropdown on the
  // create/detail forms — a real Employee link now, not free text.
  // Falls back to "just myself" when the user can't read the Employees
  // list (e.g. a staff login scoped to LEADS only).
  employeeOptions = computed(() => {
    if (this.canReadEmployees()) {
      return this.employees().map((e) => ({ label: e.name, value: e.id }));
    }
    const own = this.me();
    return own?.employeeId ? [{ label: own.employeeName ?? own.name, value: own.employeeId }] : [];
  });

  assignedToFilterOptions = computed(() => [
    { label: this.i18n.t('leads.allAssignees'), value: null },
    ...this.employeeOptions(),
  ]);

  hasActiveFilters = computed(
    () =>
      !!this.searchTerm().trim() ||
      !!this.branchFilter() ||
      !!this.sourceFilter() ||
      !!this.assignedToFilter() ||
      !!this.dateRange(),
  );

  clearFilters(): void {
    this.searchTerm.set('');
    this.branchFilter.set(null);
    this.sourceFilter.set(null);
    this.assignedToFilter.set(null);
    this.dateRange.set(null);
  }

  filteredLeads = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const branchId = this.branchFilter();
    const source = this.sourceFilter();
    const assignedTo = this.assignedToFilter();
    const range = this.dateRange();

    let leads = this.leads();
    if (branchId) {
      leads = leads.filter((l) => l.branchId === branchId);
    }
    if (source) {
      leads = leads.filter((l) => l.source === source);
    }
    if (assignedTo) {
      leads = leads.filter((l) => l.assignedToEmployeeId === assignedTo);
    }
    if (range && range[0]) {
      const from = new Date(range[0]);
      from.setHours(0, 0, 0, 0);
      // Only a start date picked yet — treat the end as "through now".
      const to = range[1] ? new Date(range[1]) : new Date();
      to.setHours(23, 59, 59, 999);
      leads = leads.filter((l) => {
        const created = new Date(l.createdAt).getTime();
        return created >= from.getTime() && created <= to.getTime();
      });
    }
    if (!term) {
      return leads;
    }
    return leads.filter((lead) =>
      [lead.name, lead.phone, lead.email, lead.source, lead.assignedToEmployee?.name, lead.branch?.location]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(term)),
    );
  });

  createForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    phone: ['', [Validators.required, Validators.minLength(5)]],
    email: ['', [Validators.email]],
    branchId: ['', [Validators.required]],
    source: ['Walk-in'],
    interestedPlan: [''],
    assignedToEmployeeId: [null as string | null],
    nextFollowUpAt: [null as Date | null],
  });

  detailForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    phone: ['', [Validators.required, Validators.minLength(5)]],
    email: ['', [Validators.email]],
    branchId: ['', [Validators.required]],
    source: [''],
    interestedPlan: [''],
    assignedToEmployeeId: [null as string | null],
    status: ['NEW' as LeadStatus],
    // "Conclude" — checking this reveals concludeOutcome + concludeComment
    // below and takes over from the status dropdown, which only handles
    // the active pipeline stages (NEW..TRIAL_COMPLETED).
    concludeChecked: [false],
    concludeOutcome: ['CONVERTED' as 'CONVERTED' | 'LOST'],
    concludeComment: [''],
    nextFollowUpAt: [null as Date | null],
  });

  get cf() {
    return this.createForm.controls;
  }
  get df() {
    return this.detailForm.controls;
  }

  ngOnInit(): void {
    this.loadMe();
    this.loadBranches();
    this.loadEmployees();
    this.loadLeads();
  }

  /** Always safe to call — unlike Branches/Employees, /auth/me has no
   * permission-matrix gate (it's just your own record). */
  loadMe(): void {
    this.authApi.me().subscribe({
      next: (me) => this.me.set(me),
      // Non-fatal — worst case, the branch/assigned-to fallback options
      // built from `me()` just stay empty for a user without any of
      // Branches/Employees/a-linked-employee-record.
      error: () => {},
    });
  }

  loadBranches(): void {
    // Skip the call entirely for a user who can't read Branches — it
    // would just 403 (PermissionGuard). branchOptions() falls back to
    // the user's own branch (from /auth/me) in that case.
    if (!this.canReadBranches()) {
      return;
    }
    this.branchStore.ensureLoaded();
  }

  loadEmployees(): void {
    // Same reasoning as loadBranches — skip the call if it would 403;
    // employeeOptions() falls back to just the user themselves.
    if (!this.canReadEmployees()) {
      return;
    }
    this.employeeStore.ensureLoaded();
  }

  loadLeads(): void {
    this.loading.set(true);
    this.leadApi.list().subscribe({
      next: (leads) => {
        this.loading.set(false);
        this.leads.set(leads);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error(this.i18n.t('leads.loadError'));
      },
    });
  }

  // ---- Create ----

  openCreate(): void {
    this.errorMessage.set(null);
    const own = this.me();
    this.createForm.reset({
      name: '',
      phone: '',
      email: '',
      // Defaults to the user's own branch when they can't pick from the
      // full list (no Branches read access) — still overridable if they
      // *can* read Branches and just happen to also be branch-scoped.
      branchId: !this.canReadBranches() ? (own?.branch?.id ?? '') : '',
      source: 'Walk-in',
      interestedPlan: '',
      // Defaults "assigned to" to the user themselves — always a
      // reasonable starting point, and the only option at all when they
      // can't read the Employees list.
      assignedToEmployeeId: own?.employeeId ?? null,
      nextFollowUpAt: null,
    });
    this.createDialogVisible.set(true);
  }

  closeCreate(): void {
    this.createDialogVisible.set(false);
  }

  saveCreate(): void {
    this.errorMessage.set(null);
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    const raw = this.createForm.getRawValue();
    const payload: LeadPayload = {
      name: raw.name!,
      phone: raw.phone!,
      email: raw.email || undefined,
      branchId: raw.branchId!,
      source: raw.source || undefined,
      interestedPlan: raw.interestedPlan || undefined,
      assignedToEmployeeId: raw.assignedToEmployeeId || undefined,
      nextFollowUpAt: raw.nextFollowUpAt ? raw.nextFollowUpAt.toISOString() : undefined,
    };

    this.leadApi.create(payload).subscribe({
      next: () => {
        this.saving.set(false);
        this.createDialogVisible.set(false);
        this.toast.success(this.i18n.t('leads.createdSuccess'));
        this.loadLeads();
      },
      error: (err) => {
        this.saving.set(false);
        const message = err?.error?.message ?? this.i18n.t('leads.saveError');
        this.errorMessage.set(Array.isArray(message) ? message.join(' ') : message);
        this.toast.error(Array.isArray(message) ? message.join(' ') : message);
      },
    });
  }

  // ---- Detail / edit / timeline ----

  openDetail(lead: Lead): void {
    this.errorMessage.set(null);
    this.noteText.set('');
    this.noteFollowUpAt.set(null);
    this.detailsExpanded.set(false);
    this.detailLead.set(lead);
    this.detailDialogVisible.set(true);
    this.applyDetailForm(lead);

    // Re-fetch the full record so the timeline is current even if the
    // list view's copy is stale.
    this.leadApi.get(lead.id).subscribe({
      next: (fresh) => {
        this.detailLead.set(fresh);
        this.applyDetailForm(fresh);
      },
      error: () => this.toast.error(this.i18n.t('leads.loadError')),
    });
  }

  private applyDetailForm(lead: Lead): void {
    const concluded = lead.status === 'CONVERTED' || lead.status === 'LOST';
    this.detailForm.reset({
      name: lead.name,
      phone: lead.phone,
      email: lead.email ?? '',
      branchId: lead.branchId,
      source: lead.source ?? '',
      interestedPlan: lead.interestedPlan ?? '',
      assignedToEmployeeId: lead.assignedToEmployeeId ?? null,
      // If not concluded, keep whatever active-pipeline status it's on;
      // if concluded, this just isn't used by the dropdown but stays a
      // sane fallback.
      status: concluded ? 'NEW' : lead.status,
      concludeChecked: concluded,
      concludeOutcome: lead.status === 'LOST' ? 'LOST' : 'CONVERTED',
      concludeComment: lead.status === 'LOST' ? lead.lostReason ?? '' : lead.concludeComment ?? '',
      nextFollowUpAt: lead.nextFollowUpAt ? new Date(lead.nextFollowUpAt) : null,
    });
  }

  closeDetail(): void {
    this.detailDialogVisible.set(false);
    this.detailLead.set(null);
  }

  saveDetail(): void {
    this.errorMessage.set(null);
    if (this.detailForm.invalid) {
      this.detailForm.markAllAsTouched();
      return;
    }

    const lead = this.detailLead();
    if (!lead) {
      return;
    }

    const raw = this.detailForm.getRawValue();

    // "Conclude" takes over status entirely when checked: pick the
    // outcome (Converted/Lost) and require its comment. Unchecking a
    // previously-concluded lead reopens it back to Contacted and clears
    // both comment fields — everything else is a normal active-pipeline
    // edit via the status dropdown.
    let status: LeadStatus = raw.status!;
    let lostReason: string | null | undefined;
    let concludeComment: string | null | undefined;

    if (raw.concludeChecked) {
      status = raw.concludeOutcome!;
      const comment = raw.concludeComment?.trim();
      if (!comment) {
        this.errorMessage.set(this.i18n.t('leads.concludeCommentRequired'));
        return;
      }
      if (status === 'LOST') {
        lostReason = comment;
        concludeComment = null;
      } else {
        concludeComment = comment;
        lostReason = null;
      }
    } else if (lead.status === 'CONVERTED' || lead.status === 'LOST') {
      status = 'CONTACTED';
      lostReason = null;
      concludeComment = null;
    }

    this.saving.set(true);
    const payload: Partial<LeadPayload> = {
      name: raw.name!,
      phone: raw.phone!,
      email: raw.email || undefined,
      branchId: raw.branchId!,
      source: raw.source || undefined,
      interestedPlan: raw.interestedPlan || undefined,
      assignedToEmployeeId: raw.assignedToEmployeeId || null,
      status,
      lostReason,
      concludeComment,
      nextFollowUpAt: raw.nextFollowUpAt ? raw.nextFollowUpAt.toISOString() : null,
    };

    this.leadApi.update(lead.id, payload).subscribe({
      next: (updated) => {
        this.saving.set(false);
        this.detailLead.set(updated);
        this.toast.success(this.i18n.t('leads.updatedSuccess'));
        this.loadLeads();
        // Refresh so an auto-logged "marked as lost" note shows up
        // immediately in the timeline without closing the dialog.
        this.leadApi.get(lead.id).subscribe((fresh) => this.detailLead.set(fresh));
      },
      error: (err) => {
        this.saving.set(false);
        const message = err?.error?.message ?? this.i18n.t('leads.saveError');
        this.errorMessage.set(Array.isArray(message) ? message.join(' ') : message);
        this.toast.error(Array.isArray(message) ? message.join(' ') : message);
      },
    });
  }

  addNote(): void {
    const lead = this.detailLead();
    const note = this.noteText().trim();
    if (!lead || !note) {
      return;
    }

    const followUp = this.noteFollowUpAt();
    this.savingNote.set(true);
    this.leadApi.addActivity(lead.id, note, followUp ? followUp.toISOString() : undefined).subscribe({
      next: () => {
        this.savingNote.set(false);
        this.noteText.set('');
        this.noteFollowUpAt.set(null);
        // Re-fetch — picks up both the new timeline entry and the
        // lead's nextFollowUpAt if this note updated it.
        this.leadApi.get(lead.id).subscribe((fresh) => {
          this.detailLead.set(fresh);
          this.applyDetailForm(fresh);
        });
        this.loadLeads();
      },
      error: () => {
        this.savingNote.set(false);
        this.toast.error(this.i18n.t('leads.noteError'));
      },
    });
  }

  async deleteLead(lead: Lead): Promise<void> {
    const confirmed = await this.confirmService.confirm({
      message: this.i18n.t('leads.deleteConfirm'),
      header: this.i18n.t('leads.deleteConfirmHeader'),
      acceptLabel: this.i18n.t('common.delete'),
      severity: 'danger',
    });
    if (!confirmed) {
      return;
    }

    this.leadApi.remove(lead.id).subscribe({
      next: () => {
        this.toast.success(this.i18n.t('leads.deletedSuccess'));
        this.closeDetail();
        this.loadLeads();
      },
      error: (err) => {
        const message = err?.error?.message ?? this.i18n.t('leads.saveError');
        this.toast.error(Array.isArray(message) ? message.join(' ') : message);
      },
    });
  }

  // ---- Display helpers ----

  initials(lead: Lead): string {
    return (lead.name || '?').trim().charAt(0).toUpperCase();
  }

  orDash(value: string | number | null | undefined): string {
    if (value === null || value === undefined || value === '') {
      return '-';
    }
    return String(value);
  }

  statusLabel(status: LeadStatus): string {
    return this.statusOptions.find((s) => s.value === status)?.label ?? status;
  }

  statusSeverity(status: LeadStatus): StatusSeverity {
    return STATUS_SEVERITY[status];
  }

  /** The list/card endpoints embed just the single latest note (see
   * LeadsService.findAll) — this reads it out, or null if none logged. */
  lastNote(lead: Lead): string | null {
    return lead.activities?.[0]?.note ?? null;
  }

  /** The last few notes (up to 4, see LeadsService.findAll), most recent
   * first — used by the list-view card's recent-notes column. */
  recentNotes(lead: Lead): LeadActivity[] {
    return lead.activities ?? [];
  }

  /** The comment attached to a concluded lead's outcome — lostReason for
   * LOST, concludeComment for CONVERTED — or null while the lead is
   * still active. Shown on the card once a lead is concluded. */
  concludeInfo(lead: Lead): string | null {
    if (lead.status === 'LOST') {
      return lead.lostReason;
    }
    if (lead.status === 'CONVERTED') {
      return lead.concludeComment;
    }
    return null;
  }

  /** A lead is overdue when it has a follow-up date in the past and
   * hasn't reached a terminal stage (Converted/Lost) yet. */
  isOverdue(lead: Lead): boolean {
    if (!lead.nextFollowUpAt || lead.status === 'CONVERTED' || lead.status === 'LOST') {
      return false;
    }
    return new Date(lead.nextFollowUpAt).getTime() < Date.now();
  }
}
