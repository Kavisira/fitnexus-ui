import { Expense } from '../../../../../core/expenses/expense-api.service';
import { EXPENSE_CATEGORIES, ExpenseCategory } from '../../../../../core/constants/expense-categories';
import { currencySymbol } from '../../../../../core/constants/currencies';
import { FilterOption } from '../../../../shared/components/filter-dropdown/filter-dropdown.component';

export const EXPENSE_CATEGORY_LABEL: Record<ExpenseCategory, string> = {
  RENT: 'Rent',
  SALARY: 'Salary',
  UTILITIES: 'Utilities',
  EQUIPMENT: 'Equipment',
  MAINTENANCE: 'Maintenance',
  MARKETING: 'Marketing',
  OTHER: 'Other',
};

/** NG-ZORRO icon per category (v1 used PrimeIcons). */
export const EXPENSE_CATEGORY_NZ_ICON: Record<ExpenseCategory, string> = {
  RENT: 'home',
  SALARY: 'wallet',
  UTILITIES: 'thunderbolt',
  EQUIPMENT: 'tool',
  MAINTENANCE: 'setting',
  MARKETING: 'notification',
  OTHER: 'ellipsis',
};

/** Tailwind chip classes per category. */
export const EXPENSE_CATEGORY_CHIP: Record<ExpenseCategory, string> = {
  RENT: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  SALARY: 'bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  UTILITIES: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  EQUIPMENT: 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
  MAINTENANCE: 'bg-pink-50 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
  MARKETING: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  OTHER: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

export const EXPENSE_CATEGORY_OPTIONS: FilterOption[] = EXPENSE_CATEGORIES.map((c) => ({
  label: EXPENSE_CATEGORY_LABEL[c],
  value: c,
}));

export function formatExpenseAmount(expense: Expense): string {
  return `${currencySymbol(expense.branch?.currency)}${Number(expense.amount).toFixed(2)}`;
}

/** Converts a picked date to an ISO string at local start/end of day, so a
 * range filter includes every expense logged on its boundary days. */
export function dayBoundaryIso(date: Date, edge: 'start' | 'end'): string {
  const d = new Date(date);
  if (edge === 'start') d.setHours(0, 0, 0, 0);
  else d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

export function exportExpensesCsv(rows: Expense[]): void {
  const headers = ['Date', 'Category', 'Branch', 'Amount', 'Currency', 'Note'];
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = rows.map((e) =>
    [e.expenseDate.slice(0, 10), EXPENSE_CATEGORY_LABEL[e.category], e.branch?.location ?? '', Number(e.amount).toFixed(2), e.branch?.currency ?? '', e.note ?? '']
      .map(esc)
      .join(','),
  );
  const blob = new Blob([[headers.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Expenses-Export-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
