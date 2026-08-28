import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { MessageModule } from 'primeng/message';
import { TooltipModule } from 'primeng/tooltip';
import { TagModule } from 'primeng/tag';
import { ChartModule } from 'primeng/chart';

import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { TranslationService } from '../../../core/i18n/translation.service';
import { ToastService } from '../../../core/toast/toast.service';
import { ConfirmService } from '../../../core/confirm/confirm.service';
import { PermissionsService } from '../../../core/roles/permissions.service';
import { Expense, ExpenseApiService, ExpensePayload } from '../../../core/expenses/expense-api.service';
import { Branch, BranchApiService } from '../../../core/branches/branch-api.service';
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_ICON, ExpenseCategory } from '../../../core/constants/expense-categories';
import { currencySymbol } from '../../../core/constants/currencies';
import { ThemeService } from '../../../core/theme/theme.service';

/**
 * Expenses — per-branch expense tracking (rent, salary, utilities,
 * equipment, maintenance, marketing, other). A filterable/sortable
 * table rather than the card-grid pattern used by Members/Employees,
 * since a ledger of dated money-out entries is naturally tabular. Read
 * access lets staff see the branch's expense history; write access
 * (gated by canWrite, same PermissionsService pattern as every other
 * screen) is needed to log, edit, or delete an entry.
 */
@Component({
  selector: 'app-expenses',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    ButtonModule,
    DialogModule,
    TableModule,
    InputTextModule,
    InputNumberModule,
    SelectModule,
    DatePickerModule,
    MessageModule,
    TooltipModule,
    TagModule,
    ChartModule,
    TranslatePipe,
  ],
  templateUrl: './expenses.html',
  styleUrls: ['./expenses.css'],
})
export class Expenses implements OnInit {
  private fb = inject(FormBuilder);
  private expenseApi = inject(ExpenseApiService);
  private branchApi = inject(BranchApiService);
  private toast = inject(ToastService);
  private confirmService = inject(ConfirmService);
  private i18n = inject(TranslationService);
  private permissions = inject(PermissionsService);
  private theme = inject(ThemeService);

  canWrite = computed(() => this.permissions.canWrite('EXPENSES'));

  expenses = signal<Expense[]>([]);
  branches = signal<Branch[]>([]);
  loading = signal(false);
  saving = signal(false);

  categories = EXPENSE_CATEGORIES;

  // ---- Filters (all applied server-side — reloads the list) ----
  branchFilter = signal<string | null>(null);
  categoryFilter = signal<ExpenseCategory | null>(null);
  fromFilter = signal<Date | null>(null);
  toFilter = signal<Date | null>(null);

  branchOptions = computed(() => [
    { label: this.i18n.t('expensesPage.allBranches'), value: null },
    ...this.branches().map((b) => ({ label: b.location, value: b.id })),
  ]);

  categoryOptions = computed(() => [
    { label: this.i18n.t('expensesPage.allCategories'), value: null },
    ...this.categories.map((c) => ({ label: this.i18n.t(`expensesPage.category.${c}`), value: c })),
  ]);

  categoryFormOptions = computed(() =>
    this.categories.map((c) => ({ label: this.i18n.t(`expensesPage.category.${c}`), value: c })),
  );

  hasActiveFilters = computed(
    () => !!this.branchFilter() || !!this.categoryFilter() || !!this.fromFilter() || !!this.toFilter(),
  );

  // Sum of whatever the table is currently showing — a lightweight
  // at-a-glance total without building out a separate summary dashboard.
  totalAmount = computed(() => this.expenses().reduce((sum, e) => sum + Number(e.amount), 0));

  // ---- Charts — both computed off whatever the table is currently
  // showing, so they respect the branch/category/date filters exactly
  // like the table does, rather than always summarizing everything. ----

  private static readonly CATEGORY_COLORS: Record<ExpenseCategory, string> = {
    RENT: '#3b82f6',
    SALARY: '#7c3aed',
    UTILITIES: '#d97706',
    EQUIPMENT: '#0d9488',
    MAINTENANCE: '#db2777',
    MARKETING: '#16a34a',
    OTHER: '#64748b',
  };

  private axisColor = computed(() => (this.theme.mode() === 'dark' ? '#9ca3af' : '#6b7280'));
  private gridColor = computed(() => (this.theme.mode() === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'));

  categoryBreakdown = computed(() => {
    const totals = new Map<ExpenseCategory, number>();
    for (const e of this.expenses()) {
      totals.set(e.category, (totals.get(e.category) ?? 0) + Number(e.amount));
    }
    return this.categories
      .filter((c) => totals.has(c))
      .map((c) => ({ category: c, amount: totals.get(c)! }));
  });

  categoryChartData = computed(() => {
    const rows = this.categoryBreakdown();
    return {
      labels: rows.map((r) => this.categoryLabel(r.category)),
      datasets: [
        {
          data: rows.map((r) => r.amount),
          backgroundColor: rows.map((r) => Expenses.CATEGORY_COLORS[r.category]),
        },
      ],
    };
  });

  doughnutChartOptions = computed(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom' as const, labels: { color: this.axisColor() } } },
  }));

  // Last 6 months of whatever's currently loaded, grouped by month —
  // independent of the from/to filter so there's always a trend to look
  // at even when a narrow date range is selected for the table itself.
  monthlyTrend = computed(() => {
    const now = new Date();
    const months: { key: string; label: string; start: Date; end: Date }[] = [];
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      months.push({ key: `${start.getFullYear()}-${start.getMonth()}`, label: start.toLocaleDateString(undefined, { month: 'short' }), start, end });
    }
    const all = this.expenses();
    return months.map((m) => ({
      label: m.label,
      amount: all
        .filter((e) => {
          const d = new Date(e.expenseDate);
          return d >= m.start && d < m.end;
        })
        .reduce((sum, e) => sum + Number(e.amount), 0),
    }));
  });

  monthlyTrendChartData = computed(() => {
    const rows = this.monthlyTrend();
    return {
      labels: rows.map((r) => r.label),
      datasets: [
        {
          label: this.i18n.t('expensesPage.totalLabel'),
          data: rows.map((r) => r.amount),
          backgroundColor: '#3b82f6',
          borderRadius: 6,
        },
      ],
    };
  });

  barChartOptions = computed(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { color: this.axisColor() }, grid: { display: false } },
      y: { ticks: { color: this.axisColor() }, grid: { color: this.gridColor() }, beginAtZero: true },
    },
  }));

  clearFilters(): void {
    this.branchFilter.set(null);
    this.categoryFilter.set(null);
    this.fromFilter.set(null);
    this.toFilter.set(null);
    this.loadExpenses();
  }

  applyFilters(): void {
    this.loadExpenses();
  }

  dialogVisible = signal(false);
  editingId = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  form = this.fb.group({
    branchId: ['', [Validators.required]],
    category: ['OTHER' as ExpenseCategory, [Validators.required]],
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    expenseDate: [new Date(), [Validators.required]],
    note: [''],
  });

  get f() {
    return this.form.controls;
  }

  ngOnInit(): void {
    this.branchApi.list().subscribe({ next: (branches) => this.branches.set(branches) });
    this.loadExpenses();
  }

  loadExpenses(): void {
    this.loading.set(true);
    const from = this.fromFilter();
    const to = this.toFilter();
    this.expenseApi
      .list({
        branchId: this.branchFilter() ?? undefined,
        category: this.categoryFilter() ?? undefined,
        from: from ? from.toISOString() : undefined,
        to: to ? to.toISOString() : undefined,
      })
      .subscribe({
        next: (expenses) => {
          this.loading.set(false);
          this.expenses.set(expenses);
        },
        error: () => {
          this.loading.set(false);
          this.toast.error(this.i18n.t('expensesPage.loadError'));
        },
      });
  }

  openCreate(): void {
    this.errorMessage.set(null);
    this.editingId.set(null);
    const defaultBranchId = this.branches()[0]?.id ?? '';
    this.form.reset({
      branchId: defaultBranchId,
      category: 'OTHER',
      amount: null,
      expenseDate: new Date(),
      note: '',
    });
    this.dialogVisible.set(true);
  }

  openEdit(expense: Expense): void {
    this.errorMessage.set(null);
    this.editingId.set(expense.id);
    this.form.reset({
      branchId: expense.branchId,
      category: expense.category,
      amount: Number(expense.amount),
      expenseDate: new Date(expense.expenseDate),
      note: expense.note ?? '',
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

    const raw = this.form.getRawValue();
    this.saving.set(true);
    const payload: ExpensePayload = {
      branchId: raw.branchId!,
      category: raw.category!,
      amount: raw.amount!,
      expenseDate: raw.expenseDate ? raw.expenseDate.toISOString() : undefined,
      note: raw.note?.trim() || undefined,
    };

    const editingId = this.editingId();
    const request = editingId ? this.expenseApi.update(editingId, payload) : this.expenseApi.create(payload);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.dialogVisible.set(false);
        this.toast.success(this.i18n.t(editingId ? 'expensesPage.updatedSuccess' : 'expensesPage.createdSuccess'));
        this.loadExpenses();
      },
      error: (err) => {
        this.saving.set(false);
        const message = err?.error?.message ?? this.i18n.t('expensesPage.saveError');
        this.errorMessage.set(Array.isArray(message) ? message.join(' ') : message);
      },
    });
  }

  async remove(expense: Expense): Promise<void> {
    const confirmed = await this.confirmService.confirm({
      message: this.i18n.t('expensesPage.deleteConfirm'),
      header: this.i18n.t('expensesPage.deleteConfirmHeader'),
      acceptLabel: this.i18n.t('common.delete'),
      severity: 'danger',
    });
    if (!confirmed) {
      return;
    }

    this.expenseApi.remove(expense.id).subscribe({
      next: () => {
        this.toast.success(this.i18n.t('expensesPage.deletedSuccess'));
        this.loadExpenses();
      },
      error: (err) => {
        const message = err?.error?.message ?? this.i18n.t('expensesPage.saveError');
        this.toast.error(Array.isArray(message) ? message.join(' ') : message);
      },
    });
  }

  categoryLabel(category: ExpenseCategory): string {
    return this.i18n.t(`expensesPage.category.${category}`);
  }

  /** Indexing EXPENSE_CATEGORY_ICON directly in the template trips
   * strict template type-checking, since p-table's `let-expense` row
   * variable is implicitly `any` — routing it through a typed method
   * parameter here sidesteps that without loosening the Record's type. */
  categoryIconClass(category: ExpenseCategory): string {
    return EXPENSE_CATEGORY_ICON[category];
  }

  formatAmount(expense: Expense): string {
    const symbol = currencySymbol(expense.branch?.currency);
    return `${symbol}${Number(expense.amount).toFixed(2)}`;
  }

  totalAmountLabel = computed(() => {
    const branchId = this.branchFilter();
    const currency = branchId ? this.branches().find((b) => b.id === branchId)?.currency : undefined;
    const symbol = currencySymbol(currency);
    return `${symbol}${this.totalAmount().toFixed(2)}`;
  });
}
