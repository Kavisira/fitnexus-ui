import { Component, computed, input, model, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';

import { Branch } from '../../../../../core/branches/branch-api.service';
import { ExpenseCategory } from '../../../../../core/constants/expense-categories';
import { FilterDropdownComponent, FilterOption } from '../../../../shared/components/filter-dropdown/filter-dropdown.component';
import { EXPENSE_CATEGORY_OPTIONS } from '../services/expense.utils';

@Component({
  selector: 'app-expense-filter-bar',
  imports: [FormsModule, NzButtonModule, NzDatePickerModule, NzIconModule, NzTooltipModule, FilterDropdownComponent],
  template: `
    <!-- Single row: date range + filters (left), actions (right); wraps on narrow screens -->
    <div class="bg-white dark:bg-gray-900 px-4 py-3 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs">
      <div class="flex items-center gap-2 flex-wrap">
        <nz-range-picker
          class="!w-full sm:!w-64 !h-9 !rounded-xl shrink-0"
          nzFormat="MMM d, yyyy"
          [nzPlaceHolder]="['From date', 'To date']"
          [ngModel]="dateRange()"
          (ngModelChange)="onRangeChange($event)"
        ></nz-range-picker>
        @if (branches().length > 1) {
          <app-filter-dropdown
            label="Branch" placeholder="All branches" searchPlaceholder="Search branches..."
            [options]="branchOptions()" [(selectedValues)]="selectedBranchIds"
          ></app-filter-dropdown>
        }
        <app-filter-dropdown
          label="Category" placeholder="All categories" searchPlaceholder="Search categories..."
          [options]="categoryOptions" [selectedValues]="selectedCategoryStrings()"
          (selectedValuesChange)="onCategoryChange($event)"
        ></app-filter-dropdown>
        @if (hasFilters()) {
          <button
            nz-button nzType="text" nzDanger (click)="clearFilters.emit()"
            class="text-xs font-semibold !h-9 !inline-flex !items-center gap-1.5 shrink-0 hover:!bg-red-50 dark:hover:!bg-red-950/20 !rounded-lg"
          >
            <span nz-icon nzType="close-circle"></span><span>Reset</span>
          </button>
        }

        <div class="flex items-center gap-2 ml-auto shrink-0">
          <button
            nz-button nzType="default" (click)="exportCsv.emit()"
            class="!rounded-xl text-xs font-semibold !h-9 !inline-flex !items-center gap-1.5 shrink-0"
            nz-tooltip nzTooltipTitle="Export the filtered expenses to CSV"
          >
            <span nz-icon nzType="download"></span><span>Export</span>
          </button>
          @if (canWrite()) {
            <button
              nz-button nzType="primary" (click)="addExpense.emit()"
              class="!rounded-xl text-xs font-semibold !h-9 !bg-blue-600 hover:!bg-blue-500 !inline-flex !items-center gap-1.5 shrink-0 shadow-xs"
            >
              <span nz-icon nzType="plus"></span><span>Add Expense</span>
            </button>
          }
        </div>
      </div>
    </div>
  `,
  host: { class: 'block w-full' },
})
export class ExpenseFilterBarComponent {
  readonly branches = input.required<Branch[]>();
  readonly canWrite = input<boolean>(true);
  readonly hasFilters = input<boolean>(false);

  readonly selectedBranchIds = model<string[]>([]);
  readonly selectedCategories = model<ExpenseCategory[]>([]);
  readonly dateRange = model<Date[]>([]);

  readonly clearFilters = output<void>();
  readonly exportCsv = output<void>();
  readonly addExpense = output<void>();

  readonly categoryOptions = EXPENSE_CATEGORY_OPTIONS;
  readonly branchOptions = computed<FilterOption[]>(() => this.branches().map((b) => ({ label: b.location, value: b.id })));
  readonly selectedCategoryStrings = computed(() => this.selectedCategories() as string[]);

  onCategoryChange(values: string[]): void {
    this.selectedCategories.set(values as ExpenseCategory[]);
  }

  onRangeChange(range: Date[] | null): void {
    this.dateRange.set(range ?? []);
  }
}
