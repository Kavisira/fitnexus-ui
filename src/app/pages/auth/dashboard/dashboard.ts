import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';

import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { TranslationService } from '../../../core/i18n/translation.service';
import { ThemeService } from '../../../core/theme/theme.service';
import {
  AnalyticsSummary,
  DashboardApiService,
  DashboardSummary,
  OpsSummary,
} from '../../../core/dashboard/dashboard-api.service';
import { currencySymbol } from '../../../core/constants/currencies';
import { Branch, BranchApiService } from '../../../core/branches/branch-api.service';

const PALETTE = {
  blue: '#3b82f6',
  purple: '#7c3aed',
  green: '#16a34a',
  amber: '#d97706',
  red: '#ef4444',
  slate: '#64748b',
  teal: '#0d9488',
  pink: '#db2777',
};
const CHART_COLORS = [PALETTE.blue, PALETTE.purple, PALETTE.green, PALETTE.amber, PALETTE.red, PALETTE.teal, PALETTE.pink, PALETTE.slate];

/**
 * Dashboard — content varies by role (see DashboardService server-side):
 * Owner/Branch Manager get the full analytics view (members, revenue,
 * expenses, net profit, leads pipeline, all as charts); Trainer/Front
 * Desk get a narrower day-to-day ops view (today's check-ins, members
 * needing BMI attention, follow-ups due) with no money figures at all.
 * Read access to this screen is hardcoded true for every role
 * server-side — see RolesService.can — so it never appears in Roles &
 * Permissions and is always in the sidenav.
 */
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, CardModule, ChartModule, TagModule, DialogModule, SelectModule, FormsModule, TranslatePipe],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css'],
})
export class Dashboard implements OnInit {
  private dashboardApi = inject(DashboardApiService);
  private branchApi = inject(BranchApiService);
  private i18n = inject(TranslationService);
  private theme = inject(ThemeService);

  loading = signal(true);
  errorMessage = signal<string | null>(null);
  summary = signal<DashboardSummary | null>(null);

  isAnalytics = computed(() => this.summary()?.view === 'ANALYTICS');
  analytics = computed(() => (this.summary()?.view === 'ANALYTICS' ? (this.summary() as AnalyticsSummary) : null));
  ops = computed(() => (this.summary()?.view === 'OPS' ? (this.summary() as OpsSummary) : null));

  private axisColor = computed(() => (this.theme.mode() === 'dark' ? '#9ca3af' : '#6b7280'));
  private gridColor = computed(() => (this.theme.mode() === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'));

  // ---- Branch filter — only shown once there's more than one branch
  // to choose from (a staff login is already pinned to their own
  // branch server-side regardless, so this only ever matters for an
  // Owner/Branch Manager looking across the whole org). ----
  branches = signal<Branch[]>([]);
  selectedBranchId = signal<string | null>(null);
  showBranchFilter = computed(() => this.isAnalytics() && this.branches().length > 1);
  branchOptions = computed(() => [
    { label: this.i18n.t('dashboard.allBranches'), value: null },
    ...this.branches().map((b) => ({ label: b.location, value: b.id })),
  ]);

  onBranchChange(branchId: string | null): void {
    this.selectedBranchId.set(branchId);
    this.load();
  }

  // ---- Expand-to-modal — any chart card's expand icon reopens that
  // same chart full-size in a dialog rather than a separate route, so
  // the underlying data/options stay in sync automatically. ----
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- chart data/options shapes vary per chart type; PrimeNG's own ChartModule typing is loose here too.
  expandedChart = signal<{ titleKey: string; type: 'line' | 'bar' | 'doughnut'; data: any; options: any } | null>(null);

  openExpand(titleKey: string, type: 'line' | 'bar' | 'doughnut', data: any, options: any): void {
    this.expandedChart.set({ titleKey, type, data, options });
  }

  closeExpand(): void {
    this.expandedChart.set(null);
  }

  ngOnInit(): void {
    this.branchApi.list().subscribe({ next: (branches) => this.branches.set(branches) });
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.dashboardApi.summary(this.selectedBranchId()).subscribe({
      next: (summary) => {
        this.loading.set(false);
        this.summary.set(summary);
      },
      error: () => {
        this.loading.set(false);
        this.errorMessage.set(this.i18n.t('dashboard.loadError'));
      },
    });
  }

  // ---- Chart data/options — all computed off the loaded summary +
  // current theme, so they redraw automatically on either change. ----

  signupChartData = computed(() => {
    const points = this.analytics()?.members.signupSeries ?? [];
    return {
      labels: points.map((p) => p.label),
      datasets: [
        {
          label: this.i18n.t('dashboard.newSignups'),
          data: points.map((p) => p.count ?? 0),
          borderColor: PALETTE.blue,
          backgroundColor: 'rgba(59, 130, 246, 0.15)',
          tension: 0.35,
          fill: true,
        },
      ],
    };
  });

  financeChartData = computed(() => {
    const fin = this.analytics()?.finance;
    const labels = fin?.revenueSeries.map((p) => p.label) ?? [];
    return {
      labels,
      datasets: [
        {
          label: this.i18n.t('dashboard.revenue'),
          data: fin?.revenueSeries.map((p) => p.amount ?? 0) ?? [],
          borderColor: PALETTE.green,
          backgroundColor: 'rgba(22, 163, 74, 0.12)',
          tension: 0.35,
        },
        {
          label: this.i18n.t('dashboard.expenses'),
          data: fin?.expenseSeries.map((p) => p.amount ?? 0) ?? [],
          borderColor: PALETTE.red,
          backgroundColor: 'rgba(239, 68, 68, 0.12)',
          tension: 0.35,
        },
        {
          label: this.i18n.t('dashboard.netProfit'),
          data: fin?.netProfitSeries.map((p) => p.amount ?? 0) ?? [],
          borderColor: PALETTE.purple,
          backgroundColor: 'rgba(124, 58, 237, 0.12)',
          tension: 0.35,
          borderDash: [6, 4],
        },
      ],
    };
  });

  revenueByPlanChartData = computed(() => {
    const groups = this.analytics()?.finance.revenueByPlan ?? [];
    return {
      labels: groups.map((g) => g.key),
      datasets: [{ data: groups.map((g) => g.value), backgroundColor: CHART_COLORS }],
    };
  });

  expensesByCategoryChartData = computed(() => {
    const groups = this.analytics()?.finance.expensesByCategory ?? [];
    return {
      labels: groups.map((g) => this.i18n.t(`expensesPage.category.${g.key}`)),
      datasets: [{ data: groups.map((g) => g.value), backgroundColor: CHART_COLORS }],
    };
  });

  private static readonly LEAD_STATUS_LABELS: Record<string, string> = {
    NEW: 'New',
    CONTACTED: 'Contacted',
    TRIAL_SCHEDULED: 'Trial scheduled',
    TRIAL_COMPLETED: 'Trial completed',
    CONVERTED: 'Converted',
    LOST: 'Lost',
  };

  leadsByStatusChartData = computed(() => {
    const groups = this.analytics()?.leads.byStatus ?? [];
    return {
      labels: groups.map((g) => this.leadStatusLabel(g.key)),
      datasets: [
        {
          label: this.i18n.t('dashboard.leads'),
          data: groups.map((g) => g.value),
          backgroundColor: PALETTE.blue,
          borderRadius: 6,
        },
      ],
    };
  });

  lineChartOptions = computed(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { labels: { color: this.axisColor() } } },
    scales: {
      x: { ticks: { color: this.axisColor() }, grid: { color: this.gridColor() } },
      y: { ticks: { color: this.axisColor() }, grid: { color: this.gridColor() }, beginAtZero: true },
    },
  }));

  barChartOptions = computed(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { color: this.axisColor() }, grid: { display: false } },
      y: { ticks: { color: this.axisColor() }, grid: { color: this.gridColor() }, beginAtZero: true },
    },
  }));

  doughnutChartOptions = computed(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom' as const, labels: { color: this.axisColor() } } },
  }));

  leadStatusLabel(status: string): string {
    return Dashboard.LEAD_STATUS_LABELS[status] ?? status;
  }

  formatMoney(amount: number, currency: string): string {
    const symbol = currencySymbol(currency);
    return `${symbol}${amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  }

  bmiSeverity(status: string): 'danger' | 'warn' | 'success' | 'info' {
    if (status === 'UNDERWEIGHT') return 'warn';
    if (status === 'OBESE') return 'danger';
    return 'info';
  }
}
