import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSelectModule } from 'ng-zorro-antd/select';

import { BranchStore } from '../../../../core/branches/branch-store.service';
import { ConfirmService } from '../../../../core/confirm/confirm.service';
import { Plan, PlanApiService, PlanPayload } from '../../../../core/plans/plan-api.service';
import { PermissionsService } from '../../../../core/roles/permissions.service';
import { ToastService } from '../../../../core/toast/toast.service';
import { SearchInputComponent } from '../../../shared/components/search-input/search-input.component';
import { PlanCardGridComponent } from './components/plan-card-grid.component';
import { PlanFormModalComponent } from './components/plan-form-modal.component';
import { DURATION_OPTIONS } from './services/plan.utils';

/**
 * Plans & Packages — branch-wise membership plan definitions (spec
 * section 4, first pass: definitions only, no Stripe billing or member
 * assignment yet — those need the Members module first). Each branch
 * defines its own plans with its own price, always shown/entered in
 * that branch's currency and taxed at its branch's rate. Same card-grid
 * pattern as Branches/Employees.
 *
 * Offers (an independent, org-wide discount/promo catalog — see
 * v2/features/auth/offers) are configured entirely on their own screen
 * and aren't tied to a plan at all, so this page doesn't reference them.
 */
@Component({
  selector: 'app-v2-plans-page',
  imports: [
    FormsModule, NzButtonModule, NzIconModule, NzSelectModule, SearchInputComponent,
    PlanCardGridComponent, PlanFormModalComponent,
  ],
  template: `
    <div class="flex flex-col flex-1 min-w-0 space-y-4">
      <div class="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs">
        <div class="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          <div class="sm:col-span-7 min-w-0">
            <app-search-input placeholder="Search plans..." [(value)]="search"></app-search-input>
          </div>
          <div class="sm:col-span-5 flex items-center justify-start sm:justify-end gap-2 flex-wrap min-w-0">
            @if (canWrite()) {
              <button
                nz-button nzType="primary" (click)="openCreate()"
                class="!h-9 !rounded-xl !px-4 !inline-flex !items-center gap-1.5 text-xs font-semibold !bg-blue-700 hover:!bg-blue-800 shadow-xs shrink-0"
              >
                <span nz-icon nzType="plus"></span><span>Add Plan</span>
              </button>
            }
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
          <span class="text-xs font-semibold text-gray-400 dark:text-gray-500 shrink-0">Filter:</span>
          <nz-select class="!w-40" [ngModel]="branchFilter()" (ngModelChange)="branchFilter.set($event)">
            <nz-option nzLabel="All branches" nzValue="ALL"></nz-option>
            @for (b of branches(); track b.id) {
              <nz-option [nzLabel]="b.location" [nzValue]="b.id"></nz-option>
            }
          </nz-select>
          <nz-select class="!w-36" [ngModel]="durationFilter()" (ngModelChange)="durationFilter.set($event)">
            <nz-option nzLabel="All durations" nzValue="ALL"></nz-option>
            @for (d of durationOptions; track d.value) {
              <nz-option [nzLabel]="d.label" [nzValue]="d.value"></nz-option>
            }
          </nz-select>
        </div>
      </div>

      <app-plan-card-grid
        [plans]="filteredPlans()"
        [loading]="loading()"
        [canWrite]="canWrite()"
        (editPlan)="openEdit($event)"
        (deletePlan)="remove($event)"
      ></app-plan-card-grid>

      <div class="text-xs text-gray-500 px-1">
        Showing <strong class="text-gray-900 dark:text-white">{{ filteredPlans().length }}</strong> of {{ plans().length }} plans
      </div>

      @if (modalVisible()) {
        <app-plan-form-modal
          [plan]="editingPlan()"
          [branches]="branches()"
          [saving]="saving()"
          [serverError]="serverError()"
          (cancel)="modalVisible.set(false)"
          (save)="onSave($event)"
        ></app-plan-form-modal>
      }
    </div>
  `,
  host: { class: 'flex flex-col flex-1 min-h-0 min-w-0 w-full max-w-full' },
})
export class V2PlansPageComponent implements OnInit {
  private planApi = inject(PlanApiService);
  private branchStore = inject(BranchStore);
  private permissions = inject(PermissionsService);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);

  // Gates every add/edit/delete action on this screen — the server
  // re-checks write access on each request regardless (PermissionGuard),
  // this just keeps the UI from offering actions that would 403.
  readonly canWrite = computed(() => this.permissions.canWrite('PLANS'));

  // A plan cannot exist without a branch — same pattern as every other
  // branch-scoped screen; this page only ever offers ACTIVE branches in
  // the dropdown (shared BranchStore).
  readonly branches = this.branchStore.activeBranches;

  readonly plans = signal<Plan[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly serverError = signal<string | null>(null);
  readonly modalVisible = signal(false);
  readonly editingPlan = signal<Plan | null>(null);

  readonly search = signal('');
  readonly branchFilter = signal<string>('ALL');
  readonly durationFilter = signal<string>('ALL');
  readonly durationOptions = DURATION_OPTIONS;

  readonly filteredPlans = computed(() => {
    const term = this.search().trim().toLowerCase();
    const branchId = this.branchFilter();
    const duration = this.durationFilter();
    let plans = this.plans();
    if (branchId !== 'ALL') {
      plans = plans.filter((plan) => plan.branch?.id === branchId);
    }
    if (duration !== 'ALL') {
      plans = plans.filter((plan) => plan.duration === duration);
    }
    if (!term) {
      return plans;
    }
    return plans.filter((plan) =>
      [plan.name, plan.branch?.location].filter(Boolean).some((value) => value!.toLowerCase().includes(term)),
    );
  });

  ngOnInit(): void {
    this.branchStore.ensureLoaded();
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.planApi.list().subscribe({
      next: (plans) => {
        this.loading.set(false);
        this.plans.set(plans);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('Could not load plans.');
      },
    });
  }

  openCreate(): void {
    this.editingPlan.set(null);
    this.serverError.set(null);
    this.modalVisible.set(true);
  }

  openEdit(plan: Plan): void {
    this.editingPlan.set(plan);
    this.serverError.set(null);
    this.modalVisible.set(true);
  }

  onSave(payload: PlanPayload): void {
    const id = this.editingPlan()?.id;
    this.saving.set(true);
    this.serverError.set(null);
    const req = id ? this.planApi.update(id, payload) : this.planApi.create(payload);
    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.modalVisible.set(false);
        this.toast.success(id ? 'Plan updated.' : 'Plan created.');
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        // Surfaces the per-branch unique-name conflict returned by the
        // backend, same as the old UI (shown inline in the modal; no
        // client-side pre-validation for uniqueness).
        const msg = err?.error?.message ?? 'Could not save plan.';
        this.serverError.set(Array.isArray(msg) ? msg.join(' ') : msg);
        this.toast.error(Array.isArray(msg) ? msg.join(' ') : msg);
      },
    });
  }

  async remove(plan: Plan): Promise<void> {
    // Unlike Branches' soft deactivate, deleting a plan is a real, hard
    // delete — worded and confirmed as permanent.
    const ok = await this.confirm.confirm({
      header: 'Delete Plan',
      message: `Permanently delete "${plan.name}"? This cannot be undone.`,
      acceptLabel: 'Delete',
      severity: 'danger',
    });
    if (!ok) return;

    this.planApi.remove(plan.id).subscribe({
      next: () => {
        this.toast.success('Plan deleted.');
        this.load();
      },
      error: (err) => {
        const msg = err?.error?.message ?? 'Could not delete plan.';
        this.toast.error(Array.isArray(msg) ? msg.join(' ') : msg);
      },
    });
  }
}
