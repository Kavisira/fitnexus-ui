import { Component, computed, input, model, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzDropdownModule } from 'ng-zorro-antd/dropdown';

export interface FilterOption {
  label: string;
  value: string;
}

@Component({
  selector: 'app-filter-dropdown',
  imports: [CommonModule, FormsModule, NzButtonModule, NzIconModule, NzInputModule, NzDropdownModule],
  template: `
    <button
      nz-button
      nzType="default"
      nz-dropdown
      [nzDropdownMenu]="menu"
      [nzClickHide]="false"
      nzTrigger="click"
      class="!h-9 !rounded-xl text-xs font-medium flex items-center justify-between gap-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:border-blue-500 hover:text-blue-600 transition-colors shrink-0 max-w-56"
      [class.!border-blue-500]="selectedValues().length > 0"
      [class.!text-blue-600]="selectedValues().length > 0"
      [class.dark:!text-blue-400]="selectedValues().length > 0"
      [class.!bg-blue-50/40]="selectedValues().length > 0"
      [class.dark:!bg-blue-950/20]="selectedValues().length > 0"
    >
      <span class="truncate">{{ displayLabel() }}</span>
      <div class="flex items-center gap-1 shrink-0 ml-1">
        @if (selectedValues().length > 0) {
          <span class="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
            {{ selectedValues().length }}
          </span>
        }
        <span nz-icon nzType="down" class="text-[10px] text-gray-400"></span>
      </div>
    </button>

    <nz-dropdown-menu #menu="nzDropdownMenu">
      <div class="p-2.5 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 w-60 space-y-2">
        <!-- Search Field at Top -->
        <nz-input-wrapper class="w-full">
          <span nzInputPrefix nz-icon nzType="search" class="text-gray-400 text-xs"></span>
          <input
            nz-input
            type="text"
            [ngModel]="searchQuery()"
            (ngModelChange)="searchQuery.set($event)"
            [placeholder]="searchPlaceholder()"
            class="!h-8 !rounded-lg text-xs bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 w-full"
          />
        </nz-input-wrapper>

        <!-- Options Checkbox List -->
        <div class="max-h-52 overflow-y-auto space-y-0.5 py-1 pr-1">
          @for (opt of filteredOptions(); track opt.value) {
            <label
              class="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-gray-100/70 dark:hover:bg-gray-800 cursor-pointer text-xs select-none transition-colors"
              [class.bg-blue-50/60]="isSelected(opt.value)"
              [class.dark:bg-blue-950/30]="isSelected(opt.value)"
              (click)="toggleOption(opt.value)"
            >
              <input
                type="checkbox"
                [checked]="isSelected(opt.value)"
                class="rounded border-gray-300 text-blue-600 focus:ring-0 cursor-pointer"
                (click)="$event.stopPropagation(); toggleOption(opt.value)"
              />
              <span class="truncate flex-1 font-normal text-gray-700 dark:text-gray-200" [class.font-semibold]="isSelected(opt.value)">
                {{ opt.label }}
              </span>
            </label>
          } @empty {
            <div class="py-3 text-center text-xs text-gray-400">
              No matching options
            </div>
          }
        </div>

        <!-- Footer: Count & Clear -->
        @if (selectedValues().length > 0) {
          <div class="pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs px-1">
            <span class="text-gray-500 font-medium">{{ selectedValues().length }} selected</span>
            <button
              nz-button
              nzType="link"
              nzDanger
              (click)="clear()"
              class="!p-0 text-xs font-semibold hover:underline"
            >
              Clear
            </button>
          </div>
        }
      </div>
    </nz-dropdown-menu>
  `,
  host: { class: 'inline-block shrink-0' },
})
export class FilterDropdownComponent {
  readonly label = input.required<string>();
  readonly placeholder = input<string>('All');
  readonly searchPlaceholder = input<string>('Search options...');
  readonly options = input.required<FilterOption[]>();
  readonly selectedValues = model<string[]>([]);

  readonly searchQuery = signal('');

  readonly filteredOptions = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const opts = this.options();
    if (!q) return opts;
    return opts.filter(o => o.label.toLowerCase().includes(q));
  });

  readonly displayLabel = computed(() => {
    const selected = this.selectedValues();
    if (selected.length === 0) return this.placeholder();
    const opts = this.options();
    const firstOpt = opts.find(o => o.value === selected[0]);
    const firstName = firstOpt ? firstOpt.label : selected[0];
    if (selected.length === 1) return firstName;
    return `${firstName} (+${selected.length - 1})`;
  });

  isSelected(val: string): boolean {
    return this.selectedValues().includes(val);
  }

  toggleOption(val: string): void {
    const current = this.selectedValues();
    if (current.includes(val)) {
      this.selectedValues.set(current.filter(v => v !== val));
    } else {
      this.selectedValues.set([...current, val]);
    }
  }

  clear(): void {
    this.selectedValues.set([]);
  }
}

