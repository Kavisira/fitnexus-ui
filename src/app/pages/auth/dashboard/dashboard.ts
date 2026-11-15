import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { DatePickerModule } from 'primeng/datepicker';
import { ButtonModule } from 'primeng/button';
import { TextareaModule } from 'primeng/textarea';

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
import { BranchStore } from '../../../core/branches/branch-store.service';
import { PageHeaderService } from '../../../shared/page-header/page-header.service';
import { AuthApiService } from '../../../core/auth/auth-api.service';
import { TokenStorage } from '../../../core/auth/token-storage.service';
import { SubscriptionSummary } from '../../../core/billing/billing-api.service';
import { Router } from '@angular/router';

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
  imports: [
    CommonModule,
    CardModule,
    ChartModule,
    TagModule,
    DialogModule,
    SelectModule,
    FormsModule,
    DatePickerModule,
    ButtonModule,
    TextareaModule,
    TranslatePipe,
  ],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css'],
})
export class Dashboard implements OnInit {
  private dashboardApi = inject(DashboardApiService);
  private branchStore = inject(BranchStore);
  private i18n = inject(TranslationService);
  private theme = inject(ThemeService);
  private authApi = inject(AuthApiService);
  private tokenStorage = inject(TokenStorage);
  private router = inject(Router);

  // Plan name + expiry countdown widget — shown to every role (not
  // just Owner) per the explicit requirement ("if trial means if any
  // plan means need to show expiry date"); only Owner gets the
  // "Manage billing" link since billing itself is owner-only.
  subscription = signal<SubscriptionSummary | null>(null);
  isOwner = computed(() => this.tokenStorage.getRole() === 'OWNER');

  subscriptionDaysRemaining = computed(() => {
    const s = this.subscription();
    const date = s?.currentPeriodEnd ?? s?.trialEndsAt;
    if (!date) return null;
    return Math.ceil((new Date(date).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  });

  goToBilling(): void {
    this.router.navigate(['/billing']);
  }

  loading = signal(true);
  errorMessage = signal<string | null>(null);
  summary = signal<DashboardSummary | null>(null);

  isAnalytics = computed(() => this.summary()?.view === 'ANALYTICS');
  analytics = computed(() => (this.summary()?.view === 'ANALYTICS' ? (this.summary() as AnalyticsSummary) : null));
  ops = computed(() => (this.summary()?.view === 'OPS' ? (this.summary() as OpsSummary) : null));

  // ---- No tabs — the dashboard is one continuous scrolling page for
  // every role now (Owner/Manager: Today strip, KPI row, charts grid,
  // branch comparison; Trainer/Front Desk: Overview stats, BMI
  // Attention, Follow-ups). Tabbing used to hide related numbers from
  // each other, which made the page feel more confusing, not less.

  // Single-branch orgs never show the branch dropdown (see
  // showBranchFilter) — this fills that gap with a plain label so it's
  // still clear which branch the numbers below belong to, instead of
  // just silently showing nothing where the dropdown would've been.
  singleBranchLabel = computed(() => {
    const branches = this.branches();
    return this.isAnalytics() && branches.length === 1 ? branches[0].location : null;
  });

  private axisColor = computed(() => (this.theme.mode() === 'dark' ? '#9ca3af' : '#6b7280'));
  private gridColor = computed(() => (this.theme.mode() === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'));

  // ---- Branch filter — only shown once there's more than one branch
  // to choose from (a staff login is already pinned to their own
  // branch server-side regardless, so this only ever matters for an
  // Owner/Branch Manager looking across the whole org). ----
  // Shared cache — see BranchStore; full list including INACTIVE, same as before.
  branches = this.branchStore.branches;
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

  // ---- Stat-card expand — the cards themselves are now small/compact
  // (see dashboard.css), so a reader who wants the number at a glance
  // can still blow it up to a full-screen modal rather than squinting.
  expandedStat = signal<{ labelKey: string; value: string; icon: string; severity: 'good' | 'bad' | 'warn' | 'blue' | 'default' } | null>(null);

  openExpandStat(labelKey: string, value: string, icon: string, severity: 'good' | 'bad' | 'warn' | 'blue' | 'default' = 'default'): void {
    this.expandedStat.set({ labelKey, value, icon, severity });
  }

  closeExpandStat(): void {
    this.expandedStat.set(null);
  }

  expandedTable = signal<any[] | null>(null);

  openExpandTable(rows: any[]): void {
    this.expandedTable.set(rows);
  }

  closeExpandTable(): void {
    this.expandedTable.set(null);
  }

  expandedOpsList = signal<{ titleKey: string; kind: 'bmi' | 'followUps'; rows: any[] } | null>(null);

  openExpandOpsList(titleKey: string, kind: 'bmi' | 'followUps', rows: any[]): void {
    this.expandedOpsList.set({ titleKey, kind, rows });
  }

  closeExpandOpsList(): void {
    this.expandedOpsList.set(null);
  }

  // Angular forbids a pipe inside an event-binding expression, so the
  // (click) handlers that build an expand-dialog value can't use
  // `| number: '1.0-0'` directly like the card's own display span
  // does — this does the same whole-number rounding in plain TS.
  formatRounded(value: number): string {
    return Math.round(value).toLocaleString();
  }

  private pageHeader = inject(PageHeaderService);
  private destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    this.pageHeader.setTitleKey('dashboard.title');
    this.destroyRef.onDestroy(() => this.pageHeader.clear());
    this.branchStore.ensureLoaded();
    this.load();
    this.authApi.me().subscribe({
      next: (me) => this.subscription.set(me.subscription),
      error: () => {},
    });
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

  // Timeframe filters for primary trend charts
  financeTimeframe = signal<'30D' | '90D' | '1Y'>('30D');
  signupTimeframe = signal<'30D' | '90D' | '1Y'>('30D');

  setFinanceTimeframe(tf: '30D' | '90D' | '1Y'): void {
    this.financeTimeframe.set(tf);
  }

  setSignupTimeframe(tf: '30D' | '90D' | '1Y'): void {
    this.signupTimeframe.set(tf);
  }

  primaryCurrency = computed(() => this.branches()[0]?.currency ?? 'INR');

  profitMarginPct = computed(() => {
    const fin = this.analytics()?.finance;
    if (!fin || !fin.revenueThisMonth || fin.revenueThisMonth <= 0) return 0;
    return Math.round((fin.netProfitThisMonth / fin.revenueThisMonth) * 100);
  });

  hasPlanRevenue = computed(() => {
    const plans = this.analytics()?.finance.revenueByPlan ?? [];
    return plans.some((p) => (p.value ?? 0) > 0);
  });

  hasLeadsData = computed(() => {
    const leads = this.analytics()?.leads.byStatus ?? [];
    return leads.some((l) => (l.value ?? 0) > 0);
  });

  // ---- Chart data/options — all computed off the loaded summary +
  // current theme, so they redraw automatically on either change. ----

  signupChartData = computed(() => {
    const points = this.analytics()?.members.signupSeries ?? [];
    let labels = points.map((p) => p.label);
    let counts = points.map((p) => p.count ?? 0);

    const tf = this.signupTimeframe();
    if (tf === '30D' && labels.length > 2) {
      labels = labels.slice(-2);
      counts = counts.slice(-2);
    } else if (tf === '90D' && labels.length > 3) {
      labels = labels.slice(-3);
      counts = counts.slice(-3);
    }

    return {
      labels,
      datasets: [
        {
          label: this.i18n.t('dashboard.newSignups'),
          data: counts,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.35,
          fill: true,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
      ],
    };
  });

  financeChartData = computed(() => {
    const fin = this.analytics()?.finance;
    if (!fin) return { labels: [], datasets: [] };
    let labels = fin.revenueSeries.map((p) => p.label);
    let rev = fin.revenueSeries.map((p) => p.amount ?? 0);
    let exp = fin.expenseSeries.map((p) => p.amount ?? 0);
    let net = fin.netProfitSeries.map((p) => p.amount ?? 0);

    const tf = this.financeTimeframe();
    if (tf === '30D' && labels.length > 2) {
      labels = labels.slice(-2);
      rev = rev.slice(-2);
      exp = exp.slice(-2);
      net = net.slice(-2);
    } else if (tf === '90D' && labels.length > 3) {
      labels = labels.slice(-3);
      rev = rev.slice(-3);
      exp = exp.slice(-3);
      net = net.slice(-3);
    }

    return {
      labels,
      datasets: [
        {
          label: this.i18n.t('dashboard.revenue'),
          data: rev,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.08)',
          tension: 0.35,
          fill: true,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
        {
          label: this.i18n.t('dashboard.expenses'),
          data: exp,
          borderColor: '#ef4444',
          backgroundColor: 'transparent',
          tension: 0.35,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
        {
          label: this.i18n.t('dashboard.netProfit'),
          data: net,
          borderColor: '#8b5cf6',
          backgroundColor: 'transparent',
          borderDash: [5, 4],
          tension: 0.35,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
      ],
    };
  });

  revenueByPlanChartData = computed(() => {
    const groups = this.analytics()?.finance.revenueByPlan ?? [];
    return {
      labels: groups.map((g) => g.key),
      datasets: [
        {
          data: groups.map((g) => g.value),
          backgroundColor: CHART_COLORS,
          borderWidth: 0,
        },
      ],
    };
  });

  expensesByCategoryChartData = computed(() => {
    const groups = this.analytics()?.finance.expensesByCategory ?? [];
    return {
      labels: groups.map((g) => this.i18n.t(`expensesPage.category.${g.key}`)),
      datasets: [{ data: groups.map((g) => g.value), backgroundColor: CHART_COLORS, borderWidth: 0 }],
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
          backgroundColor: '#3b82f6',
          borderRadius: 6,
        },
      ],
    };
  });

  lineChartOptions = computed(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        align: 'end' as const,
        labels: {
          color: this.axisColor(),
          usePointStyle: true,
          pointStyle: 'circle',
          boxWidth: 6,
          boxHeight: 6,
          padding: 12,
          font: { size: 11, family: 'Inter, system-ui, sans-serif' },
        },
      },
    },
    scales: {
      x: {
        ticks: { color: this.axisColor(), font: { size: 11 } },
        grid: { color: this.gridColor() },
      },
      y: {
        ticks: { color: this.axisColor(), font: { size: 11 } },
        grid: { color: this.gridColor() },
        beginAtZero: true,
      },
    },
  }));

  barChartOptions = computed(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { color: this.axisColor(), font: { size: 11 } }, grid: { display: false } },
      y: { ticks: { color: this.axisColor(), font: { size: 11 } }, grid: { color: this.gridColor() }, beginAtZero: true },
    },
  }));

  doughnutChartOptions = computed(() => ({
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: this.axisColor(),
          usePointStyle: true,
          pointStyle: 'circle',
          boxWidth: 6,
          boxHeight: 6,
          padding: 12,
          font: { size: 11, family: 'Inter, system-ui, sans-serif' },
        },
      },
    },
  }));

  leadStatusLabel(status: string): string {
    return Dashboard.LEAD_STATUS_LABELS[status] ?? status;
  }

  formatMoney(amount: number, currency: string = 'INR'): string {
    const symbol = currency === 'INR' ? '₹' : currencySymbol(currency);
    return `${symbol}${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  }

  bmiSeverity(status: string): 'danger' | 'warn' | 'success' | 'info' {
    if (status === 'UNDERWEIGHT') return 'warn';
    if (status === 'OBESE') return 'danger';
    return 'info';
  }
}
