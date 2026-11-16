import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { BranchBreakdownRow } from '../../../../../core/dashboard/dashboard-api.service';

@Component({
  selector: 'app-dashboard-branch-table',
  imports: [CommonModule, NzIconModule, NzButtonModule, NzTableModule, NzTagModule],
  template: `
    <div class="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 dark:border-gray-800 shadow-xs flex flex-col">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h2 class="text-base font-semibold text-gray-900 dark:text-white m-0 flex items-center gap-2">
            <span nz-icon nzType="branches" class="text-blue-500"></span>
            Branch Performance
          </h2>
          <p class="text-xs text-gray-500 dark:text-gray-300 mt-0.5 mb-0">Performance breakdown across all registered branches</p>
        </div>
        <div class="flex items-center gap-2">
          <span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
            {{ rows().length }} locations
          </span>
          <button
            nz-button
            nzType="text"
            nzShape="circle"
            class="!text-gray-400 hover:!text-gray-600 dark:!text-gray-300 dark:hover:!text-white"
            (click)="expandTable.emit(rows())"
          >
            <span nz-icon nzType="fullscreen" class="text-sm"></span>
          </button>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead>
            <tr class="border-b border-gray-100 dark:border-gray-800 text-xs font-semibold uppercase text-gray-500 dark:text-gray-300">
              <th class="py-2.5 px-3">Branch</th>
              <th class="py-2.5 px-3 text-right">Active Members</th>
              <th class="py-2.5 px-3 text-right">Revenue</th>
              <th class="py-2.5 px-3 text-right">Expenses</th>
              <th class="py-2.5 px-3 text-right">Net Profit</th>
              <th class="py-2.5 px-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50 dark:divide-gray-800/60">
            @for (b of rows(); track b.branchId) {
              <tr class="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                <td class="py-3 px-3 font-medium text-gray-900 dark:text-white flex items-center gap-2">
                  <span
                    class="w-2 h-2 rounded-full"
                    [class.bg-emerald-500]="b.activeMembers > 0"
                    [class.bg-gray-300]="b.activeMembers === 0"
                  ></span>
                  {{ b.location }}
                </td>
                <td class="py-3 px-3 text-right text-gray-600 dark:text-gray-300">{{ b.activeMembers }}</td>
                <td class="py-3 px-3 text-right font-semibold text-gray-900 dark:text-white">
                  {{ b.revenueThisMonth | currency:b.currency:'symbol':'1.0-0' }}
                </td>
                <td class="py-3 px-3 text-right text-gray-500 dark:text-gray-300">
                  {{ b.expensesThisMonth | currency:b.currency:'symbol':'1.0-0' }}
                </td>
                <td
                  class="py-3 px-3 text-right font-semibold"
                  [class.text-emerald-600]="b.revenueThisMonth - b.expensesThisMonth >= 0"
                  [class.text-red-500]="b.revenueThisMonth - b.expensesThisMonth < 0"
                >
                  {{ b.revenueThisMonth - b.expensesThisMonth | currency:b.currency:'symbol':'1.0-0' }}
                </td>
                <td class="py-3 px-3 text-center">
                  @if (b.activeMembers > 0 && (b.revenueThisMonth - b.expensesThisMonth >= 0)) {
                    <span class="px-2 py-0.5 text-xs font-semibold rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                      Profitable
                    </span>
                  } @else if (b.activeMembers > 0) {
                    <span class="px-2 py-0.5 text-xs font-semibold rounded-md bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                      Active
                    </span>
                  } @else {
                    <span class="px-2 py-0.5 text-xs font-semibold rounded-md bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                      Inactive
                    </span>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
  host: {
    class: 'block w-full',
  },
})
export class DashboardBranchTableComponent {
  readonly rows = input.required<BranchBreakdownRow[]>();
  readonly expandTable = output<BranchBreakdownRow[]>();
}

