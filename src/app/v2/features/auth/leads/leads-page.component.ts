import { Component, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';

import { AuthApiService, MeResponse } from '../../../../core/auth/auth-api.service';
import { BranchStore } from '../../../../core/branches/branch-store.service';
import { ConfirmService } from '../../../../core/confirm/confirm.service';
import { EmployeeStore } from '../../../../core/employees/employee-store.service';
import { Lead, LeadApiService, LeadPayload } from '../../../../core/leads/lead-api.service';
import { PermissionsService } from '../../../../core/roles/permissions.service';
import { ToastService } from '../../../../core/toast/toast.service';
import { SearchInputComponent } from '../../../shared/components/search-input/search-input.component';
import { LeadCardGridComponent } from './components/lead-card-grid.component';
import { LeadDetailModalComponent } from './components/lead-detail-modal.component';
import { LeadFormModalComponent } from './components/lead-form-modal.component';
import { STATUS_OPTIONS } from './services/lead.utils';

/**
 * Leads — a sales/prospect CRM screen, chain-wide by default (an owner
 * sees every branch's leads; a staff login only sees leads they
 * created or are assigned to, entirely enforced server-side — see
 * LeadsController.ownScope / LeadsService). Shown as the same
 * card-grid pattern as Branches/Plans, with a status pill filter row
 * since status is the one dimension worth filtering on here.
 *
 * No connection to Members or Forms: marking a lead "Converted" is
 * purely a status change on the Lead record itself — it does not
 * create a Member or pre-fill anything.
 */
@Component({
  selector: 'app-v2-leads-page',
  imports: [
    NzButtonModule, NzIconModule, SearchInputComponent,
    LeadCardGridComponent, LeadFormModalComponent, LeadDetailModalComponent,
  ],
  template: `
    <div class="flex flex-col flex-1 min-w-0 space-y-4">
      <div class="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs">
        <div class="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          <div class="sm:col-span-7 min-w-0">
            <app-search-input placeholder="Search leads..." [(value)]="search"></app-search-input>
          </div>
          <div class="sm:col-span-5 flex items-center justify-start sm:justify-end gap-2 flex-wrap min-w-0">
            @if (canWrite()) {
              <button
                nz-button nzType="primary" (click)="openCreate()"
                class="!h-9 !rounded-xl !px-4 !inline-flex !items-center gap-1.5 text-xs font-semibold !bg-blue-700 hover:!bg-blue-800 shadow-xs shrink-0"
              >
                <span nz-icon nzType="plus"></span><span>Add Lead</span>
              </button>
            }
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
          <span class="text-xs font-semibold text-gray-400 dark:text-gray-500 shrink-0">Status:</span>
          @for (opt of statusFilterOptions; track opt.value) {
            <button
              type="button"
              (click)="statusFilter.set(opt.value)"
              class="px-3 py-1 rounded-full text-xs font-semibold transition-colors shrink-0"
              [class]="statusFilter() === opt.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'"
            >
              {{ opt.label }} ({{ statusCount(opt.value) }})
            </button>
          }
        </div>
      </div>

      <app-lead-card-grid
        [leads]="filteredLeads()"
        [loading]="loading()"
        [canWrite]="canWrite()"
        (openDetail)="openDetail($event)"
        (openHistory)="openDetail($event, 1)"
        (deleteLead)="deleteLead($event)"
      ></app-lead-card-grid>

      <div class="text-xs text-gray-500 px-1">
        Showing <strong class="text-gray-900 dark:text-white">{{ filteredLeads().length }}</strong> of {{ leads().length }} leads
      </div>

      @if (createModalVisible()) {
        <app-lead-form-modal
          [saving]="saving()"
          [serverError]="serverError()"
          [branchOptions]="branchOptions()"
          [employeeOptions]="employeeOptions()"
          [canReadBranches]="canReadBranches()"
          [canReadEmployees]="canReadEmployees()"
          [defaultBranchId]="defaultBranchId()"
          [defaultAssignedToEmployeeId]="defaultAssignedToEmployeeId()"
          (cancel)="createModalVisible.set(false)"
          (save)="onCreate($event)"
        ></app-lead-form-modal>
      }

      @if (detailLead(); as lead) {
        <app-lead-detail-modal
          #detailModal
          [lead]="lead"
          [initialTab]="detailInitialTab()"
          [saving]="saving()"
          [savingNote]="savingNote()"
          [serverError]="serverError()"
          [canWrite]="canWrite()"
          [branchOptions]="branchOptions()"
          [employeeOptions]="employeeOptions()"
          [canReadBranches]="canReadBranches()"
          [canReadEmployees]="canReadEmployees()"
          (close)="closeDetail()"
          (save)="onSaveDetail($event)"
          (addNote)="onAddNote($event)"
        ></app-lead-detail-modal>
      }
    </div>
  `,
  host: { class: 'flex flex-col flex-1 min-h-0 min-w-0 w-full max-w-full' },
})
export class V2LeadsPageComponent implements OnInit {
  private leadApi = inject(LeadApiService);
  private branchStore = inject(BranchStore);
  private employeeStore = inject(EmployeeStore);
  private authApi = inject(AuthApiService);
  private permissions = inject(PermissionsService);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);

  @ViewChild('detailModal') detailModal?: LeadDetailModalComponent;

  // Gates every add/edit/create/delete action on this screen — the
  // server re-checks write access on each request regardless
  // (PermissionGuard), this just keeps the UI from offering actions
  // that would 403.
  readonly canWrite = computed(() => this.permissions.canWrite('LEADS'));

  // A staff login with only LEADS permission can't call the Branches or
  // Employees list endpoints (403 — PermissionGuard). These drive
  // whether this screen even tries to, versus falling back to the
  // user's own branch/employee record (from /auth/me, always readable)
  // for the create/detail forms' branch and "assigned to" fields.
  readonly canReadBranches = computed(() => this.permissions.canRead('BRANCHES'));
  readonly canReadEmployees = computed(() => this.permissions.canRead('EMPLOYEES'));

  readonly branches = this.branchStore.activeBranches;
  readonly employees = this.employeeStore.activeEmployees;
  readonly me = signal<MeResponse | null>(null);

  readonly leads = signal<Lead[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly savingNote = signal(false);
  readonly serverError = signal<string | null>(null);

  readonly search = signal('');
  readonly statusFilterOptions: { value: 'ALL' | Lead['status']; label: string }[] = [
    { value: 'ALL', label: 'All' },
    ...STATUS_OPTIONS,
  ];
  readonly statusFilter = signal<'ALL' | Lead['status']>('ALL');

  readonly createModalVisible = signal(false);
  readonly detailLead = signal<Lead | null>(null);

  // Falls back to "just my own branch" when the user can't read the
  // Branches list — a single, unchangeable option rather than an empty
  // dropdown.
  readonly branchOptions = computed(() => {
    if (this.canReadBranches()) {
      return this.branches().map((b) => ({ label: b.location, value: b.id }));
    }
    const own = this.me();
    return own?.branch ? [{ label: own.branch.location, value: own.branch.id }] : [];
  });

  // Every active employee, for the "Assigned to" dropdown — a real
  // Employee link, not free text. Falls back to "just myself" when the
  // user can't read the Employees list (e.g. a staff login scoped to
  // LEADS only).
  readonly employeeOptions = computed(() => {
    if (this.canReadEmployees()) {
      return this.employees().map((e) => ({ label: e.name, value: e.id }));
    }
    const own = this.me();
    return own?.employeeId ? [{ label: own.employeeName ?? own.name, value: own.employeeId }] : [];
  });

  readonly defaultBranchId = computed(() => (!this.canReadBranches() ? (this.me()?.branch?.id ?? '') : ''));
  readonly defaultAssignedToEmployeeId = computed(() => this.me()?.employeeId ?? null);

  statusCount(value: 'ALL' | Lead['status']): number {
    const leads = this.leads();
    if (value === 'ALL') return leads.length;
    return leads.filter((l) => l.status === value).length;
  }

  readonly filteredLeads = computed(() => {
    const term = this.search().trim().toLowerCase();
    const status = this.statusFilter();
    let leads = this.leads();
    if (status !== 'ALL') {
      leads = leads.filter((l) => l.status === status);
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

  ngOnInit(): void {
    this.loadMe();
    this.loadBranches();
    this.loadEmployees();
    this.load();
  }

  /** Always safe to call — unlike Branches/Employees, /auth/me has no
   * permission-matrix gate (it's just your own record). */
  private loadMe(): void {
    this.authApi.me().subscribe({
      next: (me) => this.me.set(me),
      // Non-fatal — worst case, the branch/assigned-to fallback options
      // built from `me()` just stay empty for a user without any of
      // Branches/Employees/a-linked-employee-record.
      error: () => {},
    });
  }

  private loadBranches(): void {
    // Skip the call entirely for a user who can't read Branches — it
    // would just 403 (PermissionGuard). branchOptions() falls back to
    // the user's own branch (from /auth/me) in that case.
    if (!this.canReadBranches()) {
      return;
    }
    this.branchStore.ensureLoaded();
  }

  private loadEmployees(): void {
    if (!this.canReadEmployees()) {
      return;
    }
    this.employeeStore.ensureLoaded();
  }

  load(): void {
    this.loading.set(true);
    this.leadApi.list().subscribe({
      next: (leads) => {
        this.loading.set(false);
        this.leads.set(leads);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('Could not load leads.');
      },
    });
  }

  openCreate(): void {
    this.serverError.set(null);
    this.createModalVisible.set(true);
  }

  onCreate(payload: LeadPayload): void {
    this.saving.set(true);
    this.serverError.set(null);
    this.leadApi.create(payload).subscribe({
      next: () => {
        this.saving.set(false);
        this.createModalVisible.set(false);
        this.toast.success('Lead created.');
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        const msg = err?.error?.message ?? 'Could not save lead.';
        this.serverError.set(Array.isArray(msg) ? msg.join(' ') : msg);
        this.toast.error(Array.isArray(msg) ? msg.join(' ') : msg);
      },
    });
  }

  // tab = 0 (Lead Details, default) or 1 (Follow-up History) — the card
  // grid's history icon opens straight into tab 1 via openDetail(lead, 1).
  readonly detailInitialTab = signal(0);

  openDetail(lead: Lead, tab = 0): void {
    this.serverError.set(null);
    this.detailInitialTab.set(tab);
    this.detailLead.set(lead);

    // Re-fetch the full record so the timeline is current even if the
    // card grid's copy is stale (it only carries the last 4 notes).
    this.leadApi.get(lead.id).subscribe({
      next: (fresh) => this.detailLead.set(fresh),
      error: () => this.toast.error('Could not load lead.'),
    });
  }

  closeDetail(): void {
    this.detailLead.set(null);
  }

  onSaveDetail(payload: Partial<LeadPayload>): void {
    const lead = this.detailLead();
    if (!lead) {
      return;
    }
    this.saving.set(true);
    this.serverError.set(null);
    this.leadApi.update(lead.id, payload).subscribe({
      next: (updated) => {
        this.saving.set(false);
        this.detailLead.set(updated);
        this.toast.success('Lead updated.');
        this.load();
        // Refresh so an auto-logged "marked as lost/converted/reopened"
        // note shows up immediately in the timeline without closing the
        // dialog.
        this.leadApi.get(lead.id).subscribe((fresh) => this.detailLead.set(fresh));
      },
      error: (err) => {
        this.saving.set(false);
        // Surfaces both the required-comment block and the
        // branch/employee-not-found validation returned by the backend.
        const msg = err?.error?.message ?? 'Could not save lead.';
        this.serverError.set(Array.isArray(msg) ? msg.join(' ') : msg);
        this.toast.error(Array.isArray(msg) ? msg.join(' ') : msg);
      },
    });
  }

  onAddNote(event: { note: string; nextFollowUpAt: Date | null }): void {
    const lead = this.detailLead();
    if (!lead) {
      return;
    }
    this.savingNote.set(true);
    this.leadApi.addActivity(lead.id, event.note, event.nextFollowUpAt ? event.nextFollowUpAt.toISOString() : undefined).subscribe({
      next: () => {
        this.savingNote.set(false);
        this.detailModal?.resetNoteForm();
        // Re-fetch — picks up both the new timeline entry and the
        // lead's nextFollowUpAt if this note updated it.
        this.leadApi.get(lead.id).subscribe((fresh) => this.detailLead.set(fresh));
        this.load();
      },
      error: () => {
        this.savingNote.set(false);
        this.toast.error('Could not add note.');
      },
    });
  }

  async deleteLead(lead: Lead): Promise<void> {
    const ok = await this.confirm.confirm({
      header: 'Delete Lead',
      message: `Permanently delete "${lead.name}"? This cannot be undone.`,
      acceptLabel: 'Delete',
      severity: 'danger',
    });
    if (!ok) {
      return;
    }

    this.leadApi.remove(lead.id).subscribe({
      next: () => {
        this.toast.success('Lead deleted.');
        this.closeDetail();
        this.load();
      },
      error: (err) => {
        const msg = err?.error?.message ?? 'Could not delete lead.';
        this.toast.error(Array.isArray(msg) ? msg.join(' ') : msg);
      },
    });
  }
}
