import { Component, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';

import { Expense } from '../../../../../core/expenses/expense-api.service';
import { ExpenseCategory } from '../../../../../core/constants/expense-categories';
import { EXPENSE_CATEGORY_CHIP, EXPENSE_CATEGORY_LABEL, EXPENSE_CATEGORY_NZ_ICON, formatExpenseAmount } from '../services/expense.utils';

@Component({
  selector: 'app-expense-table',
  imports: [DatePipe, NzButtonModule, NzIconModule, NzTableModule, NzTooltipModule],
  template: `
    <!-- Card fills the space left on the page; only the table body scrolls (header is sticky). -->
    <div class="flex flex-col flex-1 min-h-0 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs overflow-hidden max-w-full">
      <div class="v2-data-table flex-1 min-h-0 overflow-auto w-full">
        <nz-table
          [nzData]="expenses()"
          [nzLoading]="loading()"
          [nzShowPagination]="false"
          [nzFrontPagination]="false"
          [nzNoResult]="empty"
          class="w-full text-left"
        >
          <thead>
            <tr class="text-xs uppercase font-semibold text-gray-500 dark:text-gray-400">
              <th class="py-3 px-4 w-36">Date</th>
              <th class="py-3 px-3 w-44">Category</th>
              <th class="py-3 px-3 w-44 hidden md:table-cell">Branch</th>
              <th nzAlign="right" class="py-3 px-3 w-32">Amount</th>
              <th class="py-3 px-3 hidden lg:table-cell">Note</th>
              @if (canWrite()) {
                <th nzAlign="right" class="py-3 px-4 w-28">Actions</th>
              }
            </tr>
          </thead>
          <tbody class="text-sm">
            @for (e of expenses(); track e.id) {
              <tr class="hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors">
                <td class="py-3 px-4 text-gray-700 dark:text-gray-300 whitespace-nowrap">{{ e.expenseDate | date: 'MMM d, y' }}</td>
                <td class="py-3 px-3">
                  <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold" [class]="chip(e.category)">
                    <span nz-icon [nzType]="icon(e.category)"></span>{{ label(e.category) }}
                  </span>
                </td>
                <td class="py-3 px-3 hidden md:table-cell text-xs text-gray-600 dark:text-gray-300">{{ e.branch?.location ?? '—' }}</td>
                <td nzAlign="right" class="py-3 px-3 font-semibold text-gray-900 dark:text-white whitespace-nowrap">{{ amount(e) }}</td>
                <td class="py-3 px-3 hidden lg:table-cell text-xs text-gray-500 dark:text-gray-400 max-w-72 truncate">{{ e.note || '—' }}</td>
                @if (canWrite()) {
                  <td nzAlign="right" class="py-3 px-4 whitespace-nowrap">
                    <button nz-button nzType="text" nzShape="circle" nz-tooltip nzTooltipTitle="Edit" (click)="editExpense.emit(e)">
                      <span nz-icon nzType="edit"></span>
                    </button>
                    <button nz-button nzType="text" nzShape="circle" nzDanger nz-tooltip nzTooltipTitle="Delete" (click)="deleteExpense.emit(e)">
                      <span nz-icon nzType="delete"></span>
                    </button>
                  </td>
                }
              </tr>
            }
          </tbody>
        </nz-table>
        <ng-template #empty>
          <div class="flex flex-col items-center gap-2 py-10 text-gray-400">
            <span nz-icon nzType="wallet" class="text-3xl"></span>
            <span class="text-sm">No expenses found.</span>
          </div>
        </ng-template>
      </div>
    </div>
  `,
  // min-h-80 keeps a usable table on short screens (the page scrolls instead).
  host: { class: 'flex flex-col flex-1 min-h-80 w-full' },
})
export class ExpenseTableComponent {
  readonly expenses = input.required<Expense[]>();
  readonly loading = input<boolean>(false);
  readonly canWrite = input<boolean>(true);

  readonly editExpense = output<Expense>();
  readonly deleteExpense = output<Expense>();

  label(c: ExpenseCategory): string { return EXPENSE_CATEGORY_LABEL[c]; }
  icon(c: ExpenseCategory): string { return EXPENSE_CATEGORY_NZ_ICON[c]; }
  chip(c: ExpenseCategory): string { return EXPENSE_CATEGORY_CHIP[c]; }
  amount(e: Expense): string { return formatExpenseAmount(e); }
}
