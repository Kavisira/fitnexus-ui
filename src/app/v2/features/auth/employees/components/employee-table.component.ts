import { Component, computed, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzDropdownModule } from 'ng-zorro-antd/dropdown';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';

import { Employee } from '../../../../../core/employees/employee-api.service';

@Component({
  selector: 'app-employee-table',
  imports: [CommonModule, NzTableModule, NzButtonModule, NzIconModule, NzDropdownModule, NzAvatarModule],
  template: `
    <div class="flex flex-col flex-1 min-h-0 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs overflow-hidden max-w-full">
      <!-- Only the table body scrolls; header is sticky (see v2/shared/styles/data-table.css) -->
<div class="v2-data-table flex-1 min-h-0 overflow-auto w-full">
        <nz-table
          #table
          [nzData]="sortedEmployees()"
          [nzLoading]="loading()"
          [nzShowPagination]="false"
          [nzFrontPagination]="false"
          class="w-full text-left"
        >
        <thead>
          <tr class="text-xs uppercase font-semibold text-gray-500 dark:text-gray-400 bg-gray-50/50 dark:bg-gray-800/40 border-b border-gray-100 dark:border-gray-800">
            <th nzAlign="left" class="py-3 px-4 min-w-56 cursor-pointer select-none" (click)="toggleSort('name')">
              <div class="inline-flex items-center gap-1.5">
                <span>Employee</span>
                @if (sortField() === 'name') {
                  <span nz-icon [nzType]="sortOrder() === 1 ? 'up' : 'down'" class="text-[10px] text-blue-600"></span>
                }
              </div>
            </th>
            <th nzAlign="left" class="py-3 px-3 w-44 hidden md:table-cell cursor-pointer select-none" (click)="toggleSort('branch')">
              <div class="inline-flex items-center gap-1.5">
                <span>Branch</span>
                @if (sortField() === 'branch') {
                  <span nz-icon [nzType]="sortOrder() === 1 ? 'up' : 'down'" class="text-[10px] text-blue-600"></span>
                }
              </div>
            </th>
            <th nzAlign="left" class="py-3 px-3 w-40 cursor-pointer select-none" (click)="toggleSort('role')">
              <div class="inline-flex items-center gap-1.5">
                <span>Role</span>
                @if (sortField() === 'role') {
                  <span nz-icon [nzType]="sortOrder() === 1 ? 'up' : 'down'" class="text-[10px] text-blue-600"></span>
                }
              </div>
            </th>
            <th nzAlign="center" class="py-3 px-3 w-28 text-center cursor-pointer select-none" (click)="toggleSort('status')">
              <div class="inline-flex items-center justify-center gap-1.5">
                <span>Status</span>
                @if (sortField() === 'status') {
                  <span nz-icon [nzType]="sortOrder() === 1 ? 'up' : 'down'" class="text-[10px] text-blue-600"></span>
                }
              </div>
            </th>
            <th nzAlign="right" class="py-3 px-4 w-24 text-right">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50 dark:divide-gray-800/60 text-sm">
          @for (emp of sortedEmployees(); track emp.id) {
            <tr class="hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors">
              <td nzAlign="left" class="py-3 px-4">
                <div class="flex items-center gap-3">
                  <nz-avatar [nzText]="initials(emp)" class="!bg-indigo-600 !text-white font-semibold shrink-0"></nz-avatar>
                  <div class="min-w-0">
                    <div class="font-semibold text-gray-900 dark:text-white truncate flex items-center gap-1.5">
                      <span>{{ emp.name }}</span>
                      @if (emp.user) {
                        <span class="px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">Login</span>
                      }
                    </div>
                    <div class="text-xs text-gray-400 dark:text-gray-400 truncate">{{ emp.phone }}</div>
                  </div>
                </div>
              </td>

              <td nzAlign="left" class="py-3 px-3 hidden md:table-cell">
                <span class="text-xs text-gray-600 dark:text-gray-300 font-medium">{{ emp.branch?.location || '—' }}</span>
              </td>

              <td nzAlign="left" class="py-3 px-3">
                <span class="px-2 py-0.5 rounded-md text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                  {{ emp.role }}
                </span>
              </td>

              <td nzAlign="center" class="py-3 px-3 text-center">
                <span
                  class="px-2.5 py-0.5 rounded-full text-xs font-semibold inline-block"
                  [class.bg-emerald-50]="emp.status === 'ACTIVE'"
                  [class.text-emerald-700]="emp.status === 'ACTIVE'"
                  [class.dark:bg-emerald-900/30]="emp.status === 'ACTIVE'"
                  [class.dark:text-emerald-300]="emp.status === 'ACTIVE'"
                  [class.bg-gray-100]="emp.status === 'INACTIVE'"
                  [class.text-gray-600]="emp.status === 'INACTIVE'"
                  [class.dark:bg-gray-800]="emp.status === 'INACTIVE'"
                  [class.dark:text-gray-400]="emp.status === 'INACTIVE'"
                >
                  {{ emp.status }}
                </span>
              </td>

              <td nzAlign="right" class="py-3 px-4 text-right">
                <button
                  nz-button nzType="text" nzShape="circle" nz-dropdown [nzDropdownMenu]="menu"
                  nzTrigger="click" nzPlacement="bottomRight"
                  class="!text-gray-400 hover:!text-gray-600 dark:hover:!text-white"
                >
                  <span nz-icon nzType="ellipsis" class="text-base font-bold"></span>
                </button>

                <nz-dropdown-menu #menu="nzDropdownMenu">
                  <ul nz-menu class="min-w-48 !p-1.5 !rounded-xl !shadow-xl border border-gray-100 dark:border-gray-800">
                    <li nz-menu-item (click)="editEmployee.emit(emp)" class="!py-2 !px-3 !rounded-lg">
                      <div class="flex items-center gap-3 text-slate-700 dark:text-slate-200">
                        <span nz-icon nzType="eye" class="text-base text-slate-500 dark:text-slate-400 shrink-0"></span>
                        <span class="text-sm font-normal">{{ canWrite() ? 'View / Edit' : 'View' }}</span>
                      </div>
                    </li>
                    <li nz-menu-item (click)="performance.emit(emp)" class="!py-2 !px-3 !rounded-lg">
                      <div class="flex items-center gap-3 text-slate-700 dark:text-slate-200">
                        <span nz-icon nzType="line-chart" class="text-base text-slate-500 dark:text-slate-400 shrink-0"></span>
                        <span class="text-sm font-normal">Performance</span>
                      </div>
                    </li>
                    @if (canWrite()) {
                      <li nz-menu-divider class="!my-1.5 border-gray-100 dark:border-gray-800"></li>
                      <li nz-menu-item (click)="deleteEmployee.emit(emp)" class="!py-2 !px-3 !rounded-lg hover:!bg-red-50 dark:hover:!bg-red-950/20">
                        <div class="flex items-center gap-3 text-red-600 dark:text-red-400">
                          <span nz-icon nzType="delete" class="text-base text-red-500 shrink-0"></span>
                          <span class="text-sm font-normal text-red-600 dark:text-red-400">Delete</span>
                        </div>
                      </li>
                    }
                  </ul>
                </nz-dropdown-menu>
              </td>
            </tr>
          }
        </tbody>
      </nz-table>
      </div>
    </div>
  `,
  // min-h-80 keeps the table usable on short screens (the page scrolls instead).
  host: { class: 'flex flex-col flex-1 min-h-80 w-full' },
})
export class EmployeeTableComponent {
  readonly employees = input.required<Employee[]>();
  readonly loading = input<boolean>(false);
  readonly canWrite = input<boolean>(true);

  readonly editEmployee = output<Employee>();
  readonly performance = output<Employee>();
  readonly deleteEmployee = output<Employee>();

  readonly sortField = signal<'name' | 'branch' | 'role' | 'status' | null>(null);
  readonly sortOrder = signal<1 | -1>(1);

  readonly sortedEmployees = computed(() => {
    const field = this.sortField();
    const list = this.employees();
    if (!field) return list;
    const order = this.sortOrder();
    return [...list].sort((a, b) => {
      let vA = '';
      let vB = '';
      if (field === 'name') { vA = a.name ?? ''; vB = b.name ?? ''; }
      else if (field === 'branch') { vA = a.branch?.location ?? ''; vB = b.branch?.location ?? ''; }
      else if (field === 'role') { vA = a.role ?? ''; vB = b.role ?? ''; }
      else if (field === 'status') { vA = a.status ?? ''; vB = b.status ?? ''; }
      return vA.localeCompare(vB) * order;
    });
  });

  toggleSort(field: 'name' | 'branch' | 'role' | 'status'): void {
    if (this.sortField() === field) {
      this.sortOrder.update(o => (o === 1 ? -1 : 1));
    } else {
      this.sortField.set(field);
      this.sortOrder.set(1);
    }
  }

  initials(emp: Employee): string {
    return (emp.name || '?').trim().charAt(0).toUpperCase();
  }
}

