import { Component, OnInit, computed, effect, inject, signal, untracked } from '@angular/core';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';

import { BranchStore } from '../../../../core/branches/branch-store.service';
import { ConfirmService } from '../../../../core/confirm/confirm.service';
import { ExpenseCategory } from '../../../../core/constants/expense-categories';
import { currencySymbol } from '../../../../core/constants/currencies';
import { Expense, ExpenseApiService, ExpensePayload } from '../../../../core/expenses/expense-api.service';
import { PermissionsService } from '../../../../core/roles/permissions.service';
import { ToastService } from '../../../../core/toast/toast.service';
import { ExpenseFilterBarComponent } from './components/expense-filter-bar.component';
import { ExpenseFormModalComponent } from './components/expense-form-modal.component';
import { ExpenseTableComponent } from './components/expense-table.component';
import { dayBoundaryIso, exportExpensesCsv } from './services/expense.utils';

@Component({
  selector: 'app-v2-expenses-page',
  imports: [NzPaginationModule, ExpenseFilterBarComponent, ExpenseFormModalComponent, ExpenseTableComponent],
  template: `
    <!-- Fits the viewport: filter bar + pagination keep their size, the table takes the rest and scrolls internally. -->
    <div class="flex flex-col flex-1 min-w-0 min-h-0 gap-3">
      <app-expense-filter-bar
        class="shrink-0"
        [branches]="branchStore.branches()"
        [canWrite]="canWrite()"
        [hasFilters]="hasFilters()"
        [(selectedBranchIds)]="selectedBranchIds"
        [(selectedCategories)]="selectedCategories"
        [(dateRange)]="dateRange"
        (clearFilters)="clearFilters()"
        (exportCsv)="exportCsv()"
        (addExpense)="openCreate()"
      ></app-expense-filter-bar>

      <app-expense-table
        [expenses]="pagedExpenses()"
        [loading]="loading()"
        [canWrite]="canWrite()"
        (editExpense)="openEdit($event)"
        (deleteExpense)="remove($event)"
      ></app-expense-table>

      <div class="shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-2.5 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs">
        <div class="flex items-center gap-4 text-xs text-gray-500">
          <span><strong class="text-gray-900 dark:text-white font-semibold">{{ expenses().length }}</strong> entries</span>
          <span class="px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold">
            Total: {{ totalLabel() }}
          </span>
        </div>
        <nz-pagination
          nzSize="small"
          [nzPageIndex]="page()"
          [nzPageSize]="pageSize()"
          [nzTotal]="expenses().length"
          [nzShowSizeChanger]="true"
          [nzPageSizeOptions]="[10, 25, 50, 100]"
          (nzPageIndexChange)="page.set($event)"
          (nzPageSizeChange)="pageSize.set($event)"
        ></nz-pagination>
      </div>

      @if (modalVisible()) {
        <app-expense-form-modal
          [expense]="editingExpense()"
          [branches]="branchStore.branches()"
          [saving]="saving()"
          [serverError]="serverError()"
          (cancel)="modalVisible.set(false)"
          (save)="onSave($event)"
        ></app-expense-form-modal>
      }
    </div>
  `,
  host: { class: 'flex flex-col flex-1 min-h-0 min-w-0 w-full max-w-full' },
})
export class V2ExpensesPageComponent implements OnInit {
  private expenseApi = inject(ExpenseApiService);
  readonly branchStore = inject(BranchStore);
  private permissions = inject(PermissionsService);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);

  readonly canWrite = computed(() => this.permissions.canWrite('EXPENSES'));

  readonly expenses = signal<Expense[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly serverError = signal<string | null>(null);
  readonly modalVisible = signal(false);
  readonly editingExpense = signal<Expense | null>(null);

  // Filters are applied server-side; any change reloads the list.
  readonly selectedBranchIds = signal<string[]>([]);
  readonly selectedCategories = signal<ExpenseCategory[]>([]);
  readonly dateRange = signal<Date[]>([]);

  readonly hasFilters = computed(
    () => this.selectedBranchIds().length > 0 || this.selectedCategories().length > 0 || this.dateRange().length > 0,
  );

  readonly page = signal(1);
  readonly pageSize = signal(25);
  readonly pagedExpenses = computed(() => {
    const start = (this.page() - 1) * this.pageSize();
    return this.expenses().slice(start, start + this.pageSize());
  });

  readonly totalLabel = computed(() => {
    const total = this.expenses().reduce((sum, e) => sum + Number(e.amount), 0);
    // A single currency symbol only makes sense when exactly one branch is selected.
    const ids = this.selectedBranchIds();
    const currency = ids.length === 1 ? this.branchStore.branches().find((b) => b.id === ids[0])?.currency : undefined;
    return `${currencySymbol(currency)}${total.toFixed(2)}`;
  });

  constructor() {
    effect(() => {
      this.selectedBranchIds();
      this.selectedCategories();
      this.dateRange();
      untracked(() => { this.page.set(1); this.load(); });
    });
  }

  ngOnInit(): void {
    this.branchStore.ensureLoaded();
  }

  load(): void {
    const [from, to] = this.dateRange();
    this.loading.set(true);
    this.expenseApi
      .list({
        branchIds: this.selectedBranchIds(),
        categories: this.selectedCategories(),
        from: from ? dayBoundaryIso(from, 'start') : undefined,
        to: to ? dayBoundaryIso(to, 'end') : undefined,
      })
      .subscribe({
        next: (rows) => { this.loading.set(false); this.expenses.set(rows); },
        error: () => { this.loading.set(false); this.toast.error('Could not load expenses.'); },
      });
  }

  clearFilters(): void {
    this.selectedBranchIds.set([]);
    this.selectedCategories.set([]);
    this.dateRange.set([]);
  }

  openCreate(): void {
    this.editingExpense.set(null);
    this.serverError.set(null);
    this.modalVisible.set(true);
  }

  openEdit(expense: Expense): void {
    this.editingExpense.set(expense);
    this.serverError.set(null);
    this.modalVisible.set(true);
  }

  onSave(payload: ExpensePayload): void {
    const id = this.editingExpense()?.id;
    this.saving.set(true);
    this.serverError.set(null);
    const req = id ? this.expenseApi.update(id, payload) : this.expenseApi.create(payload);
    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.modalVisible.set(false);
        this.toast.success(id ? 'Expense updated.' : 'Expense added.');
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        const msg = err?.error?.message ?? 'Could not save expense.';
        this.serverError.set(Array.isArray(msg) ? msg.join(' ') : msg);
      },
    });
  }

  async remove(expense: Expense): Promise<void> {
    const ok = await this.confirm.confirm({
      header: 'Delete Expense',
      message: 'Delete this expense entry? This cannot be undone.',
      acceptLabel: 'Delete',
      severity: 'danger',
    });
    if (!ok) return;
    this.expenseApi.remove(expense.id).subscribe({
      next: () => { this.toast.success('Expense deleted.'); this.load(); },
      error: (err) => this.toast.error(err?.error?.message ?? 'Could not delete expense.'),
    });
  }

  exportCsv(): void {
    const rows = this.expenses();
    if (!rows.length) { this.toast.warn('No expenses to export.'); return; }
    exportExpensesCsv(rows);
  }
}
