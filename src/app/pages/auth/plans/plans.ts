import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { MessageModule } from 'primeng/message';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { TooltipModule } from 'primeng/tooltip';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';

import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { TranslationService } from '../../../core/i18n/translation.service';
import { ToastService } from '../../../core/toast/toast.service';
import { ConfirmService } from '../../../core/confirm/confirm.service';
import { Plan, PlanApiService, PlanDuration, PlanPayload } from '../../../core/plans/plan-api.service';
import { BranchStore } from '../../../core/branches/branch-store.service';
import { PermissionsService } from '../../../core/roles/permissions.service';
import { currencySymbol } from '../../../core/constants/currencies';

/**
 * Plans & Packages — branch-wise membership plan definitions (spec
 * section 4, first pass: definitions only, no Stripe billing or member
 * assignment yet — those need the Members module first). Each branch
 * defines its own plans with its own price, always shown/entered in
 * that branch's currency and taxed at its branch's rate. Same card-grid
 * pattern as Branches/Employees.
 *
 * Offers (an independent, org-wide discount/promo catalog — see
 * pages/auth/offers) are configured entirely on their own screen and
 * aren't tied to a plan at all, so this page doesn't reference them.
 */
@Component({
  selector: 'app-plans',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    InputNumberModule,
    SelectModule,
    MessageModule,
    IconFieldModule,
    InputIconModule,
    TooltipModule,
    CardModule,
    TagModule,
    TranslatePipe,
  ],
  templateUrl: './plans.html',
  styleUrls: ['./plans.css'],
})
export class Plans implements OnInit {
  private fb = inject(FormBuilder);
  private planApi = inject(PlanApiService);
  private branchStore = inject(BranchStore);
  private toast = inject(ToastService);
  private confirmService = inject(ConfirmService);
  private i18n = inject(TranslationService);
  private permissions = inject(PermissionsService);

  // Gates every add/edit/delete action on this screen — the server
  // re-checks write access on each request regardless (PermissionGuard),
  // this just keeps the UI from offering actions that would 403.
  canWrite = computed(() => this.permissions.canWrite('PLANS'));

  currencySymbol = currencySymbol;

  plans = signal<Plan[]>([]);
  // Shared cache — see BranchStore; this page only ever wants ACTIVE branches.
  branches = this.branchStore.activeBranches;
  loading = signal(false);
  saving = signal(false);

  searchTerm = signal('');
  branchFilter = signal<string | null>(null);
  durationFilter = signal<string | null>(null);

  dialogVisible = signal(false);
  editingId = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  durationOptions: { label: string; value: PlanDuration }[] = [
    { label: 'Monthly', value: 'MONTHLY' },
    { label: 'Quarterly', value: 'QUARTERLY' },
    { label: 'Annual', value: 'ANNUAL' },
    { label: 'Class pack', value: 'CLASS_PACK' },
    { label: 'Drop-in', value: 'DROP_IN' },
  ];

  branchOptions = computed(() => this.branches().map((b) => ({ label: b.location, value: b.id })));
  branchFilterOptions = computed(() => [{ label: this.i18n.t('plans.allBranches'), value: null }, ...this.branchOptions()]);
  durationFilterOptions = computed(() => [
    { label: this.i18n.t('plans.allDurations'), value: null },
    ...this.durationOptions,
  ]);

  hasActiveFilters = computed(() => !!this.searchTerm().trim() || !!this.branchFilter() || !!this.durationFilter());

  clearFilters(): void {
    this.searchTerm.set('');
    this.branchFilter.set(null);
    this.durationFilter.set(null);
  }

  filteredPlans = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const branchId = this.branchFilter();
    const duration = this.durationFilter();

    let plans = this.plans();
    if (branchId) {
      plans = plans.filter((p) => p.branchId === branchId);
    }
    if (duration) {
      plans = plans.filter((p) => p.duration === duration);
    }
    if (!term) {
      return plans;
    }
    return plans.filter((plan) =>
      [plan.name, plan.branch?.location].filter(Boolean).some((value) => value!.toLowerCase().includes(term)),
    );
  });

  form = this.fb.group({
    branchId: ['', [Validators.required]],
    name: ['', [Validators.required, Validators.minLength(2)]],
    price: [null as number | null, [Validators.required, Validators.min(0)]],
    duration: ['MONTHLY' as PlanDuration, [Validators.required]],
  });

  get f() {
    return this.form.controls;
  }

  // Tracks the form's live value as a signal so the tax-inclusive price
  // preview below the price/duration fields updates as the user types,
  // without needing a manual subscription to unsubscribe.
  private formValue = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });

  taxPreviewText = computed(() => {
    const value = this.formValue();
    const branchId = value?.branchId;
    const price = value?.price;
    if (!branchId || price === null || price === undefined || (price as unknown as string) === '') {
      return null;
    }
    const branch = this.branches().find((b) => b.id === branchId);
    if (!branch) {
      return null;
    }
    const rate = Number(branch.taxRatePercent) || 0;
    const total = Number(price) * (1 + rate / 100);
    const symbol = currencySymbol(branch.currency);
    return `${this.i18n.t('plans.taxPreviewPrefix')} ${symbol}${total.toFixed(2)} ${this.i18n
      .t('plans.taxPreviewSuffix')
      .replace('{rate}', String(rate))}`;
  });

  ngOnInit(): void {
    this.loadBranches();
    this.loadPlans();
  }

  loadBranches(): void {
    this.branchStore.ensureLoaded();
  }

  loadPlans(): void {
    this.loading.set(true);
    this.planApi.list().subscribe({
      next: (plans) => {
        this.loading.set(false);
        this.plans.set(plans);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error(this.i18n.t('plans.loadError'));
      },
    });
  }

  openCreate(): void {
    this.errorMessage.set(null);
    this.editingId.set(null);
    this.form.reset({
      branchId: this.branches().length === 1 ? this.branches()[0].id : '',
      name: '',
      price: null,
      duration: 'MONTHLY',
    });
    this.dialogVisible.set(true);
  }

  openEdit(plan: Plan): void {
    this.errorMessage.set(null);
    this.editingId.set(plan.id);
    this.form.reset({
      branchId: plan.branchId,
      name: plan.name,
      price: Number(plan.price),
      duration: plan.duration,
    });
    this.dialogVisible.set(true);
  }

  closeDialog(): void {
    this.dialogVisible.set(false);
  }

  save(): void {
    this.errorMessage.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    const raw = this.form.getRawValue();
    const payload: PlanPayload = {
      branchId: raw.branchId!,
      name: raw.name!,
      price: raw.price!,
      duration: raw.duration!,
    };

    const editingId = this.editingId();
    const request = editingId ? this.planApi.update(editingId, payload) : this.planApi.create(payload);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.dialogVisible.set(false);
        this.toast.success(this.i18n.t(editingId ? 'plans.updatedSuccess' : 'plans.createdSuccess'));
        this.loadPlans();
      },
      error: (err) => {
        this.saving.set(false);
        const message = err?.error?.message ?? this.i18n.t('plans.saveError');
        this.errorMessage.set(Array.isArray(message) ? message.join(' ') : message);
        this.toast.error(Array.isArray(message) ? message.join(' ') : message);
      },
    });
  }

  async remove(plan: Plan): Promise<void> {
    const confirmed = await this.confirmService.confirm({
      message: this.i18n.t('plans.deleteConfirm'),
      header: this.i18n.t('plans.deleteConfirmHeader'),
      acceptLabel: this.i18n.t('common.delete'),
      severity: 'danger',
    });
    if (!confirmed) {
      return;
    }

    this.planApi.remove(plan.id).subscribe({
      next: () => {
        this.toast.success(this.i18n.t('plans.deletedSuccess'));
        this.loadPlans();
      },
      error: (err) => {
        const message = err?.error?.message ?? this.i18n.t('plans.saveError');
        this.toast.error(Array.isArray(message) ? message.join(' ') : message);
      },
    });
  }

  durationLabel(duration: PlanDuration): string {
    return this.durationOptions.find((d) => d.value === duration)?.label ?? duration;
  }

  orDash(value: string | number | null | undefined): string {
    if (value === null || value === undefined || value === '') {
      return '-';
    }
    return String(value);
  }

  /** Total = price * (1 + branch tax rate), formatted to 2 decimals —
   * used on every card so the amount actually shown always reflects tax,
   * not just the raw entered price. */
  priceWithTax(plan: Plan): string {
    const rate = Number(plan.branch?.taxRatePercent ?? 0) || 0;
    const total = Number(plan.price) * (1 + rate / 100);
    return total.toFixed(2);
  }

  taxRateLabel(plan: Plan): string {
    const rate = Number(plan.branch?.taxRatePercent ?? 0) || 0;
    return `${this.i18n.t('plans.totalWithTaxLabel')} (${rate}%)`;
  }

}
