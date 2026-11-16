import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { AnalyticsSummary } from '../../../../../core/dashboard/dashboard-api.service';

export interface StatExpandEvent {
  labelKey: string;
  value: string;
  icon: string;
  severity: 'good' | 'bad' | 'warn' | 'blue' | 'default';
}

@Component({
  selector: 'app-dashboard-kpi-row',
  imports: [CommonModule, NzIconModule, NzButtonModule, NzTooltipModule],
  template: `
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- Card 1: Revenue this month -->
      <div class="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 dark:border-gray-800 shadow-xs flex flex-col justify-between">
        <div class="flex items-start justify-between">
          <div>
            <span class="text-xs font-semibold text-gray-500 dark:text-gray-300">Revenue this month</span>
            <div class="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              {{ data().finance.revenueThisMonth | currency:currency():'symbol':'1.0-0' }}
            </div>
          </div>
          <div class="flex items-center gap-1.5">
            <div class="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <span nz-icon nzType="wallet" class="text-lg"></span>
            </div>
            <button
              nz-button
              nzType="text"
              nzShape="circle"
              class="!text-gray-400 hover:!text-gray-600 dark:!text-gray-300 dark:hover:!text-white"
              (click)="expand('dashboard.revenueThisMonth', '' + data().finance.revenueThisMonth, 'wallet', 'good')"
            >
              <span nz-icon nzType="fullscreen" class="text-sm"></span>
            </button>
          </div>
        </div>
        <div class="mt-4 pt-3 border-t border-gray-50 dark:border-gray-800/80 text-xs text-gray-500 dark:text-gray-300">
          <strong class="text-emerald-600 dark:text-emerald-400">{{ marginPct() }}% Margin</strong> &bull; {{ data().finance.expensesThisMonth | currency:currency():'symbol':'1.0-0' }} expenses
        </div>
      </div>

      <!-- Card 2: Active members -->
      <div class="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 dark:border-gray-800 shadow-xs flex flex-col justify-between">
        <div class="flex items-start justify-between">
          <div>
            <span class="text-xs font-semibold text-gray-500 dark:text-gray-300">Active members</span>
            <div class="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              {{ data().members.activeCount }}
            </div>
          </div>
          <div class="flex items-center gap-1.5">
            <div class="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <span nz-icon nzType="team" class="text-lg"></span>
            </div>
            <button
              nz-button
              nzType="text"
              nzShape="circle"
              class="!text-gray-400 hover:!text-gray-600 dark:!text-gray-300 dark:hover:!text-white"
              (click)="expand('dashboard.activeMembers', '' + data().members.activeCount, 'team', 'blue')"
            >
              <span nz-icon nzType="fullscreen" class="text-sm"></span>
            </button>
          </div>
        </div>
        <div class="mt-4 pt-3 border-t border-gray-50 dark:border-gray-800/80 text-xs text-gray-500 dark:text-gray-300">
          <strong class="text-blue-600 dark:text-blue-400">+{{ data().members.newThisMonth }} new this month</strong> &bull; {{ data().members.expiringIn30 }} expiring in 30d
        </div>
      </div>

      <!-- Card 3: Members checked in -->
      <div class="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 dark:border-gray-800 shadow-xs flex flex-col justify-between">
        <div class="flex items-start justify-between">
          <div>
            <span class="text-xs font-semibold text-gray-500 dark:text-gray-300">Members checked in</span>
            <div class="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              {{ data().today.distinctMembersCheckedIn }}
            </div>
          </div>
          <div class="flex items-center gap-1.5">
            <div class="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
              <span nz-icon nzType="check-circle" class="text-lg"></span>
            </div>
            <button
              nz-button
              nzType="text"
              nzShape="circle"
              class="!text-gray-400 hover:!text-gray-600 dark:!text-gray-300 dark:hover:!text-white"
              (click)="expand('dashboard.membersCheckedInToday', '' + data().today.distinctMembersCheckedIn, 'check-circle', 'blue')"
            >
              <span nz-icon nzType="fullscreen" class="text-sm"></span>
            </button>
          </div>
        </div>
        <div class="mt-4 pt-3 border-t border-gray-50 dark:border-gray-800/80 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-300">
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 font-semibold text-[11px]">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Live
          </span>
          <span>Today's floor visits</span>
        </div>
      </div>

      <!-- Card 4: Staff on duty -->
      <div class="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 dark:border-gray-800 shadow-xs flex flex-col justify-between">
        <div class="flex items-start justify-between">
          <div>
            <span class="text-xs font-semibold text-gray-500 dark:text-gray-300">Staff on duty</span>
            <div class="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              {{ data().today.present }}<span class="text-base font-normal text-gray-400">/{{ data().today.totalActiveEmployees }}</span>
              <span class="text-xs font-semibold text-emerald-600 dark:text-emerald-400 ml-1.5">Present</span>
            </div>
          </div>
          <div class="flex items-center gap-1.5">
            <div class="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <span nz-icon nzType="solution" class="text-lg"></span>
            </div>
            <button
              nz-button
              nzType="text"
              nzShape="circle"
              class="!text-gray-400 hover:!text-gray-600 dark:!text-gray-300 dark:hover:!text-white"
              (click)="expand('dashboard.employeesPresent', data().today.present + '/' + data().today.totalActiveEmployees, 'solution', 'good')"
            >
              <span nz-icon nzType="fullscreen" class="text-sm"></span>
            </button>
          </div>
        </div>
        <div class="mt-4 pt-3 border-t border-gray-50 dark:border-gray-800/80 text-xs text-gray-500 dark:text-gray-300">
          {{ data().today.absent }} absent &bull; Across {{ data().organization.totalBranches }} branches
        </div>
      </div>
    </div>
  `,
  host: {
    class: 'block w-full',
  },
})
export class DashboardKpiRowComponent {
  readonly data = input.required<AnalyticsSummary>();
  readonly currency = input<string>('INR');
  readonly marginPct = input<number>(0);

  readonly expandStat = output<StatExpandEvent>();

  expand(labelKey: string, value: string, icon: string, severity: 'good' | 'bad' | 'warn' | 'blue' | 'default'): void {
    this.expandStat.emit({ labelKey, value, icon, severity });
  }
}
