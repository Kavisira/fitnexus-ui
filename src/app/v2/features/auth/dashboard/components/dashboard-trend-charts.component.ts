import { Component, input, model, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { ChartData, ChartOptions } from 'chart.js';
import { AppChartComponent } from '../../../../shared/components/app-chart/app-chart.component';

export interface ChartExpandEvent {
  titleKey: string;
  type: 'line' | 'bar' | 'doughnut';
  data: unknown;
  options: unknown;
}

@Component({
  selector: 'app-dashboard-trend-charts',
  imports: [CommonModule, NzIconModule, NzButtonModule, AppChartComponent],
  template: `
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <!-- Chart 1: Finance Trend -->
      <div class="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 dark:border-gray-800 shadow-xs flex flex-col">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h2 class="text-base font-semibold text-gray-900 dark:text-white m-0 flex items-center gap-2">
              <span nz-icon nzType="line-chart" class="text-blue-500"></span>
              Revenue vs expenses vs net profit
            </h2>
            <p class="text-xs text-gray-500 dark:text-gray-300 mt-0.5 mb-0">Monthly financial trajectory and margins</p>
          </div>
          <div class="flex items-center gap-2">
            <div class="inline-flex rounded-lg bg-gray-100 dark:bg-gray-800 p-0.5">
              <button
                type="button"
                class="px-2 py-0.5 text-xs font-semibold rounded-md transition-colors"
                [class.bg-white]="financeTf() === '30D'"
                [class.dark:bg-gray-700]="financeTf() === '30D'"
                [class.text-blue-600]="financeTf() === '30D'"
                [class.dark:text-white]="financeTf() === '30D'"
                [class.text-gray-500]="financeTf() !== '30D'"
                (click)="financeTf.set('30D')"
              >30D</button>
              <button
                type="button"
                class="px-2 py-0.5 text-xs font-semibold rounded-md transition-colors"
                [class.bg-white]="financeTf() === '90D'"
                [class.dark:bg-gray-700]="financeTf() === '90D'"
                [class.text-blue-600]="financeTf() === '90D'"
                [class.dark:text-white]="financeTf() === '90D'"
                [class.text-gray-500]="financeTf() !== '90D'"
                (click)="financeTf.set('90D')"
              >90D</button>
              <button
                type="button"
                class="px-2 py-0.5 text-xs font-semibold rounded-md transition-colors"
                [class.bg-white]="financeTf() === '1Y'"
                [class.dark:bg-gray-700]="financeTf() === '1Y'"
                [class.text-blue-600]="financeTf() === '1Y'"
                [class.dark:text-white]="financeTf() === '1Y'"
                [class.text-gray-500]="financeTf() !== '1Y'"
                (click)="financeTf.set('1Y')"
              >1Y</button>
            </div>
            <button
              nz-button
              nzType="text"
              nzShape="circle"
              class="!text-gray-400 hover:!text-gray-600 dark:!text-gray-300 dark:hover:!text-white"
              (click)="expandFinance()"
            >
              <span nz-icon nzType="fullscreen" class="text-sm"></span>
            </button>
          </div>
        </div>
        <div class="flex-1 min-h-[260px]">
          <app-chart type="line" [data]="financeData()" [options]="chartOptions()" height="260px"></app-chart>
        </div>
      </div>

      <!-- Chart 2: Signups Trend -->
      <div class="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 dark:border-gray-800 shadow-xs flex flex-col">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h2 class="text-base font-semibold text-gray-900 dark:text-white m-0 flex items-center gap-2">
              <span nz-icon nzType="team" class="text-blue-500"></span>
              New member signups
            </h2>
            <p class="text-xs text-gray-500 dark:text-gray-300 mt-0.5 mb-0">Monthly registration momentum</p>
          </div>
          <div class="flex items-center gap-2">
            <div class="inline-flex rounded-lg bg-gray-100 dark:bg-gray-800 p-0.5">
              <button
                type="button"
                class="px-2 py-0.5 text-xs font-semibold rounded-md transition-colors"
                [class.bg-white]="signupTf() === '30D'"
                [class.dark:bg-gray-700]="signupTf() === '30D'"
                [class.text-blue-600]="signupTf() === '30D'"
                [class.dark:text-white]="signupTf() === '30D'"
                [class.text-gray-500]="signupTf() !== '30D'"
                (click)="signupTf.set('30D')"
              >30D</button>
              <button
                type="button"
                class="px-2 py-0.5 text-xs font-semibold rounded-md transition-colors"
                [class.bg-white]="signupTf() === '90D'"
                [class.dark:bg-gray-700]="signupTf() === '90D'"
                [class.text-blue-600]="signupTf() === '90D'"
                [class.dark:text-white]="signupTf() === '90D'"
                [class.text-gray-500]="signupTf() !== '90D'"
                (click)="signupTf.set('90D')"
              >90D</button>
              <button
                type="button"
                class="px-2 py-0.5 text-xs font-semibold rounded-md transition-colors"
                [class.bg-white]="signupTf() === '1Y'"
                [class.dark:bg-gray-700]="signupTf() === '1Y'"
                [class.text-blue-600]="signupTf() === '1Y'"
                [class.dark:text-white]="signupTf() === '1Y'"
                [class.text-gray-500]="signupTf() !== '1Y'"
                (click)="signupTf.set('1Y')"
              >1Y</button>
            </div>
            <button
              nz-button
              nzType="text"
              nzShape="circle"
              class="!text-gray-400 hover:!text-gray-600 dark:!text-gray-300 dark:hover:!text-white"
              (click)="expandSignup()"
            >
              <span nz-icon nzType="fullscreen" class="text-sm"></span>
            </button>
          </div>
        </div>
        <div class="flex-1 min-h-[260px]">
          <app-chart type="line" [data]="signupData()" [options]="chartOptions()" height="260px"></app-chart>
        </div>
      </div>
    </div>
  `,
  host: {
    class: 'block w-full',
  },
})
export class DashboardTrendChartsComponent {
  readonly financeData = input.required<ChartData<'line'>>();
  readonly signupData = input.required<ChartData<'line'>>();
  readonly chartOptions = input.required<ChartOptions<'line'>>();

  readonly financeTf = model<'30D' | '90D' | '1Y'>('30D');
  readonly signupTf = model<'30D' | '90D' | '1Y'>('30D');

  readonly expandChart = output<ChartExpandEvent>();

  expandFinance(): void {
    this.expandChart.emit({
      titleKey: 'dashboard.financeTrend',
      type: 'line',
      data: this.financeData(),
      options: this.chartOptions(),
    });
  }

  expandSignup(): void {
    this.expandChart.emit({
      titleKey: 'dashboard.memberSignups',
      type: 'line',
      data: this.signupData(),
      options: this.chartOptions(),
    });
  }
}

