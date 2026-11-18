import { Component, input, output } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';

import { OpsSummary } from '../../../../../core/dashboard/dashboard-api.service';
import { StatExpandEvent } from './dashboard-kpi-row.component';

const LEAD_STATUS_LABELS: Record<string, string> = {
  NEW: 'New',
  CONTACTED: 'Contacted',
  TRIAL_SCHEDULED: 'Trial scheduled',
  TRIAL_COMPLETED: 'Trial completed',
  CONVERTED: 'Converted',
  LOST: 'Lost',
};

const CARD = 'bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs';

/**
 * Operations dashboard for Trainer / Front Desk (backend returns view 'OPS').
 * Day-to-day numbers only — no revenue/expense figures for this role group.
 */
@Component({
  selector: 'app-dashboard-ops-view',
  imports: [NzButtonModule, NzIconModule, NzTooltipModule],
  template: `
    @let d = data();
    <!-- KPI cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div [class]="card + ' p-5 flex items-start justify-between gap-3'">
        <div>
          <div class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Today's check-ins</div>
          <div class="text-3xl font-extrabold text-gray-900 dark:text-white mt-1">{{ d.todaysCheckins }}</div>
          <div class="text-xs text-gray-500 dark:text-gray-400 mt-2">Member check-ins logged today</div>
        </div>
        <div class="flex items-center gap-1">
          <span class="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
            <span nz-icon nzType="camera" class="text-lg"></span>
          </span>
          <button nz-button nzType="text" nzShape="circle" nz-tooltip nzTooltipTitle="Expand"
            (click)="expandStat.emit({ labelKey: 'dashboard.todaysCheckins', value: '' + d.todaysCheckins, icon: 'camera', severity: 'blue' })">
            <span nz-icon nzType="fullscreen"></span>
          </button>
        </div>
      </div>

      <div [class]="card + ' p-5 flex items-start justify-between gap-3'">
        <div>
          <div class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Expiring in 7 days</div>
          <div class="text-3xl font-extrabold text-gray-900 dark:text-white mt-1">{{ d.expiringSoon }}</div>
          <div class="text-xs text-gray-500 dark:text-gray-400 mt-2">Memberships due for renewal this week</div>
        </div>
        <div class="flex items-center gap-1">
          <span class="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300">
            <span nz-icon nzType="clock-circle" class="text-lg"></span>
          </span>
          <button nz-button nzType="text" nzShape="circle" nz-tooltip nzTooltipTitle="Expand"
            (click)="expandStat.emit({ labelKey: 'dashboard.expiringIn7', value: '' + d.expiringSoon, icon: 'clock-circle', severity: 'warn' })">
            <span nz-icon nzType="fullscreen"></span>
          </button>
        </div>
      </div>
    </div>

    <!-- Lists -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <section [class]="card + ' p-5'">
        <header class="flex items-center gap-2 mb-1">
          <span nz-icon nzType="heart" class="text-pink-500"></span>
          <h2 class="text-sm font-bold text-gray-900 dark:text-white m-0">BMI attention</h2>
        </header>
        <p class="text-xs text-gray-500 dark:text-gray-400 mt-0 mb-3">Members whose latest reading is underweight or obese</p>
        @for (m of d.bmiHighlights; track m.id) {
          <div class="flex items-center justify-between gap-3 py-2.5 border-t border-gray-100 dark:border-gray-800 first:border-t-0">
            <span class="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{{ m.name }}</span>
            <span class="flex items-center gap-2 shrink-0">
              <span class="text-sm font-semibold text-gray-700 dark:text-gray-200">{{ m.bmi }}</span>
              <span class="px-2 py-0.5 rounded-full text-xs font-semibold" [class]="bmiChip(m.bmiStatus)">{{ bmiLabel(m.bmiStatus) }}</span>
            </span>
          </div>
        } @empty {
          <div class="flex flex-col items-center gap-1.5 py-8 text-center">
            <span nz-icon nzType="check-circle" class="text-2xl text-emerald-500"></span>
            <p class="text-sm font-semibold text-gray-700 dark:text-gray-200 m-0">All members in a healthy range</p>
            <p class="text-xs text-gray-500 dark:text-gray-400 m-0">Nobody needs BMI follow-up right now.</p>
          </div>
        }
      </section>

      <section [class]="card + ' p-5'">
        <header class="flex items-center gap-2 mb-1">
          <span nz-icon nzType="phone" class="text-blue-500"></span>
          <h2 class="text-sm font-bold text-gray-900 dark:text-white m-0">Follow-ups due</h2>
        </header>
        <p class="text-xs text-gray-500 dark:text-gray-400 mt-0 mb-3">Leads to contact today or overdue</p>
        @for (l of d.followUps; track l.id) {
          <div class="flex items-center justify-between gap-3 py-2.5 border-t border-gray-100 dark:border-gray-800 first:border-t-0">
            <div class="min-w-0">
              <div class="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{{ l.name }}</div>
              <div class="text-xs text-gray-500 dark:text-gray-400">{{ l.phone }}</div>
            </div>
            <span class="px-2 py-0.5 rounded-md text-xs font-semibold shrink-0 bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
              {{ leadStatus(l.status) }}
            </span>
          </div>
        } @empty {
          <div class="flex flex-col items-center gap-1.5 py-8 text-center">
            <span nz-icon nzType="check-circle" class="text-2xl text-emerald-500"></span>
            <p class="text-sm font-semibold text-gray-700 dark:text-gray-200 m-0">No pending outreach</p>
            <p class="text-xs text-gray-500 dark:text-gray-400 m-0">You have no follow-ups due today.</p>
          </div>
        }
      </section>
    </div>
  `,
  host: { class: 'flex flex-col gap-4' },
})
export class DashboardOpsViewComponent {
  readonly data = input.required<OpsSummary>();
  readonly expandStat = output<StatExpandEvent>();

  readonly card = CARD;

  leadStatus(status: string): string {
    return LEAD_STATUS_LABELS[status] ?? status;
  }

  bmiLabel(status: string): string {
    return status === 'UNDERWEIGHT' ? 'Underweight' : status === 'OBESE' ? 'Obese' : status;
  }

  bmiChip(status: string): string {
    return status === 'OBESE'
      ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300'
      : 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
  }
}
