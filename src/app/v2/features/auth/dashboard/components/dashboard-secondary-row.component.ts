import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { ChartData, ChartOptions } from 'chart.js';
import { AppChartComponent } from '../../../../shared/components/app-chart/app-chart.component';
import { AnalyticsSummary } from '../../../../../core/dashboard/dashboard-api.service';
import { ChartExpandEvent } from './dashboard-trend-charts.component';

@Component({
  selector: 'app-dashboard-secondary-row',
  imports: [CommonModule, NzIconModule, NzButtonModule, AppChartComponent],
  template: `
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <!-- Col 1: Revenue by Plan (Donut) -->
      <div class="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 dark:border-gray-800 shadow-xs flex flex-col">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h2 class="text-base font-semibold text-gray-900 dark:text-white m-0 flex items-center gap-2">
              <span nz-icon nzType="pie-chart" class="text-emerald-500"></span>
              Revenue by plan
            </h2>
            <p class="text-xs text-gray-500 dark:text-gray-300 mt-0.5 mb-0">Package distribution</p>
          </div>
          <button
            nz-button
            nzType="text"
            nzShape="circle"
            class="!text-gray-400 hover:!text-gray-600 dark:!text-gray-300 dark:hover:!text-white"
            (click)="expandPlan()"
          >
            <span nz-icon nzType="fullscreen" class="text-sm"></span>
          </button>
        </div>
        <div class="flex-1 min-h-[220px] flex items-center justify-center">
          @if (hasPlanRevenue()) {
            <app-chart type="doughnut" [data]="planData()" [options]="donutOptions()" height="220px"></app-chart>
          } @else {
            <div class="text-center p-6 text-gray-400">
              <span nz-icon nzType="pie-chart" class="text-3xl mb-2"></span>
              <p class="text-sm font-semibold m-0">No plan revenue yet</p>
              <p class="text-xs mt-1 mb-0">Revenue breakdown appears as packages are sold</p>
            </div>
          }
        </div>
      </div>

      <!-- Col 2: Leads by Status (Bar) -->
      <div class="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 dark:border-gray-800 shadow-xs flex flex-col">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h2 class="text-base font-semibold text-gray-900 dark:text-white m-0 flex items-center gap-2">
              <span nz-icon nzType="bar-chart" class="text-purple-500"></span>
              Leads pipeline
            </h2>
            <p class="text-xs text-gray-500 dark:text-gray-300 mt-0.5 mb-0">
              {{ data().leads.total }} total leads ({{ data().leads.conversionRate }}% conv.)
            </p>
          </div>
          <button
            nz-button
            nzType="text"
            nzShape="circle"
            class="!text-gray-400 hover:!text-gray-600 dark:!text-gray-300 dark:hover:!text-white"
            (click)="expandLeads()"
          >
            <span nz-icon nzType="fullscreen" class="text-sm"></span>
          </button>
        </div>
        <div class="flex-1 min-h-[220px] flex items-center justify-center">
          @if (hasLeadsData()) {
            <app-chart type="bar" [data]="leadsData()" [options]="barOptions()" height="220px"></app-chart>
          } @else {
            <div class="text-center p-6 text-gray-400 dark:text-gray-300">
              <span nz-icon nzType="filter" class="text-3xl mb-2"></span>
              <p class="text-sm font-semibold m-0 text-gray-700 dark:text-gray-200">No leads in pipeline</p>
              <p class="text-xs mt-1 mb-0 text-gray-400 dark:text-gray-400">Active prospective members will be shown here</p>
            </div>
          }
        </div>
      </div>

      <!-- Col 3: Operations & Alerts Widget -->
      <div class="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 dark:border-gray-800 shadow-xs flex flex-col">
        <div class="mb-4">
          <h2 class="text-base font-semibold text-gray-900 dark:text-white m-0 flex items-center gap-2">
            <span nz-icon nzType="bell" class="text-amber-500"></span>
            Operations & Alerts
          </h2>
          <p class="text-xs text-gray-500 dark:text-gray-300 mt-0.5 mb-0">Real-time gym status snapshot</p>
        </div>

        <div class="space-y-3 flex-1 flex flex-col justify-between">
          <!-- Member Check-ins -->
          <div class="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <span nz-icon nzType="team"></span>
              </div>
              <div>
                <div class="text-xs font-semibold text-gray-800 dark:text-gray-100">Member Check-ins</div>
                <div class="text-xs text-gray-500 dark:text-gray-300"><strong>{{ data().today.distinctMembersCheckedIn }}</strong> checked in today</div>
              </div>
            </div>
            <span class="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
              Live
            </span>
          </div>

          <!-- Staff Presence -->
          <div class="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <span nz-icon nzType="solution"></span>
              </div>
              <div>
                <div class="text-xs font-semibold text-gray-800 dark:text-gray-100">Staff Presence</div>
                <div class="text-xs text-gray-500 dark:text-gray-300">{{ data().today.present }} present, {{ data().today.absent }} absent</div>
              </div>
            </div>
            <span class="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300">
              {{ data().today.present }}/{{ data().today.totalActiveEmployees }}
            </span>
          </div>

          <!-- Renewals Due (7d) -->
          <div class="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <span nz-icon nzType="clock-circle"></span>
              </div>
              <div>
                <div class="text-xs font-semibold text-gray-800 dark:text-gray-100">Renewals Due (7d)</div>
                <div class="text-xs text-gray-500 dark:text-gray-300">{{ data().members.expiringIn7 }} memberships expiring soon</div>
              </div>
            </div>
            @if (data().members.expiringIn7 > 0) {
              <span class="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300">
                {{ data().members.expiringIn7 }}
              </span>
            } @else {
              <span class="px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300">
                All good
              </span>
            }
          </div>

          <!-- Monthly Signups -->
          <div class="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <span nz-icon nzType="arrow-up"></span>
              </div>
              <div>
                <div class="text-xs font-semibold text-gray-800 dark:text-gray-100">Monthly Signups</div>
                <div class="text-xs text-gray-500 dark:text-gray-300">+{{ data().members.newThisMonth }} new registrations this month</div>
              </div>
            </div>
            <span class="px-2 py-0.5 text-xs font-semibold rounded-full bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300">
              +{{ data().members.newThisMonth }}
            </span>
          </div>
        </div>
      </div>
    </div>
  `,
  host: {
    class: 'block w-full',
  },
})
export class DashboardSecondaryRowComponent {
  readonly data = input.required<AnalyticsSummary>();
  readonly planData = input.required<ChartData<'doughnut'>>();
  readonly donutOptions = input.required<ChartOptions<'doughnut'>>();
  readonly leadsData = input.required<ChartData<'bar'>>();
  readonly barOptions = input.required<ChartOptions<'bar'>>();
  readonly hasPlanRevenue = input.required<boolean>();
  readonly hasLeadsData = input.required<boolean>();

  readonly expandChart = output<ChartExpandEvent>();

  expandPlan(): void {
    this.expandChart.emit({
      titleKey: 'dashboard.revenueByPlan',
      type: 'doughnut',
      data: this.planData(),
      options: this.donutOptions(),
    });
  }

  expandLeads(): void {
    this.expandChart.emit({
      titleKey: 'dashboard.leadsPipeline',
      type: 'bar',
      data: this.leadsData(),
      options: this.barOptions(),
    });
  }
}

