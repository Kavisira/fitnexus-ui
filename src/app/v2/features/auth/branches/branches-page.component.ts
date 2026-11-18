import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';

import { Branch, BranchApiService, BranchPayload } from '../../../../core/branches/branch-api.service';
import { BranchStore } from '../../../../core/branches/branch-store.service';
import { ConfirmService } from '../../../../core/confirm/confirm.service';
import { PermissionsService } from '../../../../core/roles/permissions.service';
import { ToastService } from '../../../../core/toast/toast.service';
import { SearchInputComponent } from '../../../shared/components/search-input/search-input.component';
import { FilterDropdownComponent, FilterOption } from '../../../shared/components/filter-dropdown/filter-dropdown.component';
import { BranchCardGridComponent } from './components/branch-card-grid.component';
import { BranchFormModalComponent } from './components/branch-form-modal.component';

/**
 * Branches is the org's most-used screen, so it's a single card-grid view
 * rather than a plain data table — every branch is a self-contained card
 * showing its key details at once (location, contact, language/tax,
 * member count, main/status badges).
 *
 * There's no separate "branch name" field — Location (a free-text
 * description of where the branch is) is the identifying field, is
 * mandatory, and must be unique per organization (enforced server-side).
 * Address is a fully separate, optional free-text field for extra detail.
 */
@Component({
  selector: 'app-v2-branches-page',
  imports: [
    NzAlertModule, NzButtonModule, NzIconModule, SearchInputComponent,
    FilterDropdownComponent, BranchCardGridComponent, BranchFormModalComponent,
  ],
  template: `
    <div class="flex flex-col flex-1 min-w-0 space-y-4">
      @if (isFirstBranchSetup()) {
        <nz-alert
          nzType="info"
          nzShowIcon
          nzMessage="Welcome to FitNexus! Let's create your first branch"
          nzDescription="Members, employees, and most other screens need at least one branch before you can use them. Click &quot;Add Branch&quot; below to get started."
        ></nz-alert>
      }

      <div class="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs">
        <div class="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          <div class="sm:col-span-7 min-w-0">
            <app-search-input placeholder="Search branches..." [(value)]="search"></app-search-input>
          </div>
          <div class="sm:col-span-5 flex items-center justify-start sm:justify-end gap-2 flex-wrap min-w-0">
            @if (canWrite()) {
              <button
                nz-button nzType="primary" (click)="openCreate()"
                class="!h-9 !rounded-xl !px-4 !inline-flex !items-center gap-1.5 text-xs font-semibold !bg-blue-700 hover:!bg-blue-800 shadow-xs shrink-0"
                [class.animate-pulse]="isFirstBranchSetup()"
              >
                <span nz-icon nzType="plus"></span><span>Add Branch</span>
              </button>
            }
          </div>
        </div>

        <div class="flex items-center gap-2.5 flex-wrap mt-3 pt-3 border-t border-gray-100 dark:border-gray-800/60">
          <span class="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1.5 shrink-0 mr-1">
            <span nz-icon nzType="filter"></span> Filters:
          </span>

          <app-filter-dropdown
            label="Status"
            placeholder="All statuses"
            searchPlaceholder="Search statuses..."
            [options]="statusOptions"
            [selectedValues]="selectedStatuses()"
            (selectedValuesChange)="onStatusChange($event)"
          ></app-filter-dropdown>

          @if (selectedStatuses().length > 0) {
            <button
              nz-button
              nzType="text"
              nzDanger
              (click)="selectedStatuses.set([])"
              class="text-xs font-semibold !h-9 !inline-flex !items-center gap-1.5 shrink-0 hover:!bg-red-50 dark:hover:!bg-red-950/20 !rounded-lg"
            >
              <span nz-icon nzType="close-circle"></span>
              <span>Reset</span>
            </button>
          }
        </div>
      </div>

      <app-branch-card-grid
        [branches]="filteredBranches()"
        [loading]="loading()"
        [canWrite]="canWrite()"
        (editBranch)="openEdit($event)"
        (toggleStatus)="toggleStatus($event)"
      ></app-branch-card-grid>

      <div class="text-xs text-gray-500 px-1">
        Showing <strong class="text-gray-900 dark:text-white">{{ filteredBranches().length }}</strong> of {{ branches().length }} branches
      </div>

      @if (modalVisible()) {
        <app-branch-form-modal
          [branch]="editingBranch()"
          [saving]="saving()"
          [serverError]="serverError()"
          [isCreatingFirstBranch]="isCreatingFirstBranch()"
          (cancel)="modalVisible.set(false)"
          (save)="onSave($event)"
        ></app-branch-form-modal>
      }
    </div>
  `,
  host: { class: 'flex flex-col flex-1 min-h-0 min-w-0 w-full max-w-full' },
})
export class V2BranchesPageComponent implements OnInit {
  private branchApi = inject(BranchApiService);
  private branchStore = inject(BranchStore);
  private permissions = inject(PermissionsService);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);
  private route = inject(ActivatedRoute);

  // Gates every add/edit/activate/deactivate action on this screen — the
  // server re-checks write access on each request regardless
  // (PermissionGuard), this just keeps the UI from offering actions
  // that would 403.
  readonly canWrite = computed(() => this.permissions.canWrite('BRANCHES'));

  // Reads straight from the shared store — this page is also the one
  // place that mutates branch data, so its own reload() calls (below)
  // keep the store current for every other page reading it too (Plans,
  // Leads, Members, Attendance, Expenses, Dashboard, Employees).
  readonly branches = this.branchStore.branches;
  readonly loading = this.branchStore.loading;
  readonly saving = signal(false);
  readonly serverError = signal<string | null>(null);
  readonly modalVisible = signal(false);
  readonly editingBranch = signal<Branch | null>(null);

  readonly search = signal('');

  // Searchable multi-select Status filter — same app-filter-dropdown
  // component/pattern used on Employees, instead of a bespoke pill row,
  // so filter UI is consistent across screens. Independent of the text
  // search (both apply together).
  readonly statusOptions: FilterOption[] = [
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Inactive', value: 'INACTIVE' },
  ];
  readonly selectedStatuses = signal<('ACTIVE' | 'INACTIVE')[]>([]);

  onStatusChange(vals: string[]): void {
    this.selectedStatuses.set(vals as ('ACTIVE' | 'INACTIVE')[]);
  }

  readonly filteredBranches = computed(() => {
    const term = this.search().trim().toLowerCase();
    const statuses = this.selectedStatuses();
    let branches = this.branches();
    if (statuses.length > 0) {
      branches = branches.filter((branch) => statuses.includes(branch.status as 'ACTIVE' | 'INACTIVE'));
    }
    if (!term) {
      return branches;
    }
    return branches.filter((branch) =>
      [branch.location, branch.currency, branch.status]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(term)),
    );
  });

  // Creating the org's very first branch: it becomes the main branch
  // automatically, so the "Main branch" checkbox is hidden entirely
  // rather than asking a question with only one sensible answer. Once
  // at least one branch exists, every subsequent create/edit shows it.
  readonly isCreatingFirstBranch = computed(() => !this.editingBranch() && this.branches().length === 0);

  // Set when firstBranchGuard (core/auth/auth.guard.ts) redirected a
  // brand-new Owner here because the org has zero branches yet — shows
  // a one-time explanatory banner instead of the normal empty state.
  readonly isFirstBranchSetup = signal(false);

  ngOnInit(): void {
    this.isFirstBranchSetup.set(this.route.snapshot.queryParamMap.get('firstBranch') === '1');
    this.load();
  }

  load(): void {
    this.branchStore.reload(() => this.toast.error('Could not load branches.'));
  }

  openCreate(): void {
    this.editingBranch.set(null);
    this.serverError.set(null);
    this.modalVisible.set(true);
  }

  openEdit(branch: Branch): void {
    this.editingBranch.set(branch);
    this.serverError.set(null);
    this.modalVisible.set(true);
  }

  onSave(payload: BranchPayload): void {
    const id = this.editingBranch()?.id;
    this.saving.set(true);
    this.serverError.set(null);
    const req = id ? this.branchApi.update(id, payload) : this.branchApi.create(payload);
    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.modalVisible.set(false);
        this.toast.success(id ? 'Branch updated.' : 'Branch created.');
        // Re-pull the full list from the server rather than patching the
        // signal locally, so the grid always reflects the latest data
        // (e.g. another branch being demoted from Main) after any save.
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        // Surfaces both the unique-location conflict and the
        // billing-tier branch-limit error returned by the backend,
        // same as the old UI (shown inline in the modal; no
        // client-side pre-validation for either case).
        const msg = err?.error?.message ?? 'Could not save branch.';
        this.serverError.set(Array.isArray(msg) ? msg.join(' ') : msg);
        this.toast.error(Array.isArray(msg) ? msg.join(' ') : msg);
      },
    });
  }

  // Single entry point the card grid's action icon calls — routes to
  // activate or deactivate based on the branch's current status, so any
  // status change (either direction) always re-fetches up-to-date data.
  async toggleStatus(branch: Branch): Promise<void> {
    if (branch.status === 'ACTIVE') {
      await this.deactivate(branch);
    } else {
      this.activate(branch);
    }
  }

  private async deactivate(branch: Branch): Promise<void> {
    // Deactivation is a soft status change, not a real delete — worded
    // and confirmed as such, matching the old UI.
    const ok = await this.confirm.confirm({
      header: 'Deactivate Branch',
      message: `Deactivate "${branch.location}"? It can be reactivated at any time.`,
      acceptLabel: 'Deactivate',
      severity: 'danger',
    });
    if (!ok) return;

    this.branchApi.deactivate(branch.id).subscribe({
      next: () => {
        this.toast.success('Branch deactivated.');
        this.load();
      },
      error: (err) => {
        const msg = err?.error?.message ?? 'Could not save branch.';
        this.toast.error(Array.isArray(msg) ? msg.join(' ') : msg);
      },
    });
  }

  private activate(branch: Branch): void {
    this.branchApi.activate(branch.id).subscribe({
      next: () => {
        this.toast.success('Branch activated.');
        this.load();
      },
      error: (err) => {
        const msg = err?.error?.message ?? 'Could not save branch.';
        this.toast.error(Array.isArray(msg) ? msg.join(' ') : msg);
      },
    });
  }
}
