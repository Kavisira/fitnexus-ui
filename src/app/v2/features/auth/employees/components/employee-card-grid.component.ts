import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzDropdownModule } from 'ng-zorro-antd/dropdown';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';

import { Employee } from '../../../../../core/employees/employee-api.service';

@Component({
  selector: 'app-employee-card-grid',
  imports: [CommonModule, NzButtonModule, NzIconModule, NzDropdownModule, NzAvatarModule],
  template: `
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      @for (emp of employees(); track emp.id) {
        <div class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 shadow-xs flex flex-col justify-between hover:border-gray-200 dark:hover:border-gray-700 transition-all">
          <div>
            <!-- Top Row: Avatar & Actions -->
            <div class="flex items-start justify-between gap-2">
              <div class="flex items-center gap-3">
                <nz-avatar [nzText]="initials(emp)" class="!w-11 !h-11 !leading-11 !bg-indigo-600 !text-white font-bold shrink-0 text-base"></nz-avatar>
                <div class="min-w-0">
                  <div class="font-bold text-gray-900 dark:text-white truncate flex items-center gap-1.5 text-sm">
                    <span>{{ emp.name }}</span>
                    @if (emp.user) {
                      <span class="px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">Login</span>
                    }
                  </div>
                  <span class="text-xs text-gray-500 dark:text-gray-400 font-medium">{{ emp.role }}</span>
                </div>
              </div>

              <!-- Action Menu -->
              <button
                nz-button nzType="text" nzShape="circle" nz-dropdown [nzDropdownMenu]="menu"
                nzTrigger="click" nzPlacement="bottomRight"
                class="!text-gray-400 hover:!text-gray-600 dark:hover:!text-white shrink-0"
              >
                <span nz-icon nzType="ellipsis" class="text-base font-bold"></span>
              </button>

              <nz-dropdown-menu #menu="nzDropdownMenu">
                <ul nz-menu class="min-w-44 !p-1 !rounded-xl !shadow-lg border border-gray-100 dark:border-gray-800">
                  <li nz-menu-item (click)="editEmployee.emit(emp)" class="!px-3.5 !py-2 !rounded-lg text-slate-700 dark:text-slate-200">
                    <span nz-icon nzType="eye" class="mr-3 text-base text-slate-500 dark:text-slate-400"></span>
                    <span class="text-[13.5px] font-normal">{{ canWrite() ? 'View / Edit' : 'View' }}</span>
                  </li>
                  <li nz-menu-item (click)="performance.emit(emp)" class="!px-3.5 !py-2 !rounded-lg text-slate-700 dark:text-slate-200">
                    <span nz-icon nzType="line-chart" class="mr-3 text-base text-slate-500 dark:text-slate-400"></span>
                    <span class="text-[13.5px] font-normal">Performance</span>
                  </li>
                  @if (canWrite()) {
                    <li nz-menu-divider class="!my-1 border-gray-100 dark:border-gray-800"></li>
                    <li nz-menu-item (click)="deleteEmployee.emit(emp)" class="!px-3.5 !py-2 !rounded-lg text-slate-700 dark:text-slate-200 hover:!text-red-600">
                      <span nz-icon nzType="delete" class="mr-3 text-base text-slate-500 dark:text-slate-400"></span>
                      <span class="text-[13.5px] font-normal">Delete</span>
                    </li>
                  }
                </ul>
              </nz-dropdown-menu>
            </div>

            <!-- Details Section -->
            <div class="mt-4 space-y-1.5 text-xs text-gray-500 dark:text-gray-400">
              <div class="flex items-center gap-2 truncate">
                <span nz-icon nzType="phone" class="text-gray-400"></span>
                <span class="text-gray-800 dark:text-gray-200">{{ emp.phone }}</span>
              </div>
              @if (emp.email) {
                <div class="flex items-center gap-2 truncate">
                  <span nz-icon nzType="mail" class="text-gray-400"></span>
                  <span class="truncate">{{ emp.email }}</span>
                </div>
              }
              <div class="flex items-center gap-2 truncate">
                <span nz-icon nzType="branches" class="text-gray-400"></span>
                <span>{{ emp.branch?.location || '—' }}</span>
              </div>
            </div>
          </div>

          <!-- Footer Badge -->
          <div class="mt-4 pt-3 border-t border-gray-50 dark:border-gray-800 flex items-center justify-between text-xs">
            <span class="text-gray-400">Status</span>
            <span
              class="px-2 py-0.5 rounded-full font-semibold"
              [class.bg-emerald-50]="emp.status === 'ACTIVE'"
              [class.text-emerald-700]="emp.status === 'ACTIVE'"
              [class.dark:bg-emerald-900/30]="emp.status === 'ACTIVE'"
              [class.dark:text-emerald-300]="emp.status === 'ACTIVE'"
              [class.bg-gray-100]="emp.status === 'INACTIVE'"
              [class.text-gray-600]="emp.status === 'INACTIVE'"
            >
              {{ emp.status }}
            </span>
          </div>
        </div>
      }
    </div>
  `,
})
export class EmployeeCardGridComponent {
  readonly employees = input.required<Employee[]>();
  readonly canWrite = input<boolean>(true);

  readonly editEmployee = output<Employee>();
  readonly performance = output<Employee>();
  readonly deleteEmployee = output<Employee>();

  initials(emp: Employee): string {
    return (emp.name || '?').trim().charAt(0).toUpperCase();
  }
}

