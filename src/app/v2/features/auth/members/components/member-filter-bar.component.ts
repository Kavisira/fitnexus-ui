import { Component, computed, input, model, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';

import { Branch } from '../../../../../core/branches/branch-api.service';
import { MemberStatus } from '../../../../../core/members/member-api.service';
import { SearchInputComponent } from '../../../../shared/components/search-input/search-input.component';
import { FilterDropdownComponent, FilterOption } from '../../../../shared/components/filter-dropdown/filter-dropdown.component';

@Component({
  selector: 'app-member-filter-bar',
  imports: [
    SearchInputComponent, CommonModule,
    NzButtonModule,
    NzIconModule,
    NzTooltipModule,
    FilterDropdownComponent,
  ],
  template: `
    <div class="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs space-y-3.5">
      <!-- First Row (Tailwind Grid): Search Box on Left, Import & Add Options on Right -->
      <div class="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
        <!-- Search Field -->
        <div class="sm:col-span-5 min-w-0">
          <app-search-input placeholder="Search by name, phone, email..." [(value)]="search"></app-search-input>
        </div>

        <!-- Action Options: View Toggle, Export, Import, Add Member -->
        <div class="sm:col-span-7 flex items-center justify-start sm:justify-end gap-2 flex-wrap min-w-0">
          <!-- View Toggle -->
          <div class="inline-flex rounded-xl bg-gray-100 dark:bg-gray-800 p-0.5 border border-gray-200 dark:border-gray-700 shrink-0">
            <button
              type="button"
              class="px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1"
              [class.bg-white]="viewMode() === 'table'"
              [class.dark:bg-gray-700]="viewMode() === 'table'"
              [class.text-blue-600]="viewMode() === 'table'"
              [class.dark:text-white]="viewMode() === 'table'"
              [class.text-gray-500]="viewMode() !== 'table'"
              (click)="viewMode.set('table')"
              nz-tooltip
              nzTooltipTitle="Table view"
            >
              <span nz-icon nzType="table"></span>
            </button>
            <button
              type="button"
              class="px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1"
              [class.bg-white]="viewMode() === 'grid'"
              [class.dark:bg-gray-700]="viewMode() === 'grid'"
              [class.text-blue-600]="viewMode() === 'grid'"
              [class.dark:text-white]="viewMode() === 'grid'"
              [class.text-gray-500]="viewMode() !== 'grid'"
              (click)="viewMode.set('grid')"
              nz-tooltip
              nzTooltipTitle="Card view"
            >
              <span nz-icon nzType="appstore"></span>
            </button>
          </div>

          <!-- Export CSV Button -->
          <button
            nz-button
            nzType="default"
            (click)="exportCsv.emit()"
            class="!rounded-xl text-xs font-semibold !h-9 !inline-flex !items-center gap-1.5 shrink-0"
            nz-tooltip
            nzTooltipTitle="Export members to CSV"
          >
            <span nz-icon nzType="download"></span>
            <span>Export</span>
          </button>

          <!-- Import Button -->
          @if (canWrite()) {
            <button
              nz-button
              nzType="default"
              (click)="openImport.emit()"
              class="!rounded-xl text-xs font-semibold !h-9 !inline-flex !items-center gap-1.5 shrink-0"
              nz-tooltip
              nzTooltipTitle="Import members from spreadsheet"
            >
              <span nz-icon nzType="upload"></span>
              <span>Import</span>
            </button>

            <!-- Add Member Primary Button -->
            <button
              nz-button
              nzType="primary"
              (click)="openCreate.emit()"
              class="!rounded-xl text-xs font-semibold !h-9 !bg-blue-700 hover:!bg-blue-800 !inline-flex !items-center gap-1.5 shrink-0 shadow-xs"
            >
              <span nz-icon nzType="plus"></span>
              <span>Add Member</span>
            </button>
          }
        </div>
      </div>

      <!-- Second Row: Searchable Filters -->
      <div class="flex items-center gap-2.5 flex-wrap pt-3 border-t border-gray-100 dark:border-gray-800/60">
        <span class="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1.5 shrink-0 mr-1">
          <span nz-icon nzType="filter"></span> Filters:
        </span>

        <!-- Branch Searchable Multi-select Filter -->
        @if (branches().length > 1) {
          <app-filter-dropdown
            label="Branch"
            placeholder="All branches"
            searchPlaceholder="Search branches..."
            [options]="branchOptions()"
            [(selectedValues)]="selectedBranchIds"
          ></app-filter-dropdown>
        }

        <!-- Status Searchable Multi-select Filter -->
        <app-filter-dropdown
          label="Status"
          placeholder="All statuses"
          searchPlaceholder="Search statuses..."
          [options]="statusOptions"
          [selectedValues]="selectedStatusStrings()"
          (selectedValuesChange)="onStatusChange($event)"
        ></app-filter-dropdown>

        <!-- Personal Trainer Filter Button -->
        <button
          nz-button
          [nzType]="ptOnly() ? 'primary' : 'default'"
          (click)="ptOnly.set(!ptOnly())"
          class="!rounded-xl text-xs font-semibold !h-9 !inline-flex !items-center gap-1.5 shrink-0"
        >
          <span nz-icon nzType="team"></span>
          <span>PT Only</span>
        </button>

        <!-- Reset Action Button -->
        @if (hasFilters()) {
          <button
            nz-button
            nzType="text"
            nzDanger
            (click)="clearFilters.emit()"
            class="text-xs font-semibold !h-9 !inline-flex !items-center gap-1.5 shrink-0 hover:!bg-red-50 dark:hover:!bg-red-950/20 !rounded-lg"
          >
            <span nz-icon nzType="close-circle"></span>
            <span>Reset</span>
          </button>
        }
      </div>
    </div>
  `,
  host: { class: 'block w-full' },
})
export class MemberFilterBarComponent {
  readonly branches = input<Branch[]>([]);
  readonly canWrite = input<boolean>(true);
  readonly hasFilters = input<boolean>(false);

  readonly search = model<string>('');
  readonly selectedBranchIds = model<string[]>([]);
  readonly selectedStatuses = model<MemberStatus[]>([]);
  readonly ptOnly = model<boolean>(false);
  readonly viewMode = model<'table' | 'grid'>('table');

  readonly clearFilters = output<void>();
  readonly exportCsv = output<void>();
  readonly openImport = output<void>();
  readonly openCreate = output<void>();

  readonly branchOptions = computed<FilterOption[]>(() =>
    this.branches().map((b) => ({ label: b.location, value: b.id })),
  );

  readonly statusOptions: FilterOption[] = [
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Inactive', value: 'INACTIVE' },
  ];

  readonly selectedStatusStrings = computed(() => this.selectedStatuses() as string[]);

  onStatusChange(vals: string[]): void {
    this.selectedStatuses.set(vals as MemberStatus[]);
  }
}
