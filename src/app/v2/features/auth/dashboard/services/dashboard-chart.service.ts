import { Injectable, computed, inject } from '@angular/core';
import { ChartData, ChartOptions } from 'chart.js';
import { AnalyticsSummary } from '../../../../../core/dashboard/dashboard-api.service';
import { ThemeService } from '../../../../../core/theme/theme.service';

const CHART_PALETTE = ['#2563eb', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#14b8a6', '#ec4899', '#64748b'];

@Injectable({ providedIn: 'root' })
export class DashboardChartService {
  private theme = inject(ThemeService);

  readonly isDark = computed(() => this.theme.mode() === 'dark');
  readonly axisColor = computed(() => (this.isDark() ? '#e5e7eb' : '#6b7280'));
  readonly gridColor = computed(() => (this.isDark() ? 'rgba(255, 255, 255, 0.08)' : 'rgba(229, 231, 235, 0.6)'));

  readonly lineChartOptions = computed<ChartOptions<'line'>>(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        align: 'end',
        labels: { color: this.axisColor(), boxWidth: 8, font: { size: 11 } },
      },
    },
    scales: {
      x: { ticks: { color: this.axisColor(), font: { size: 11 } }, grid: { display: false } },
      y: { ticks: { color: this.axisColor(), font: { size: 11 } }, grid: { color: this.gridColor() } },
    },
  }));

  readonly barChartOptions = computed<ChartOptions<'bar'>>(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { color: this.axisColor(), font: { size: 11 } }, grid: { display: false } },
      y: { ticks: { color: this.axisColor(), font: { size: 11 } }, grid: { color: this.gridColor() }, beginAtZero: true },
    },
  }));

  readonly doughnutChartOptions = computed<ChartOptions<'doughnut'>>(() => ({
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
      legend: { position: 'bottom', labels: { color: this.axisColor(), boxWidth: 8, font: { size: 11 } } },
    },
  }));

  buildSignupData(analytics: AnalyticsSummary | null, tf: '30D' | '90D' | '1Y'): ChartData<'line'> {
    const points = analytics?.members.signupSeries ?? [];
    let labels = points.map((p) => p.label);
    let counts = points.map((p) => p.count ?? 0);
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
          label: 'New signups',
          data: counts,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.35,
          fill: true,
        },
      ],
    };
  }

  buildFinanceData(analytics: AnalyticsSummary | null, tf: '30D' | '90D' | '1Y'): ChartData<'line'> {
    const fin = analytics?.finance;
    if (!fin) return { labels: [], datasets: [] };
    let labels = fin.revenueSeries.map((p) => p.label);
    let rev = fin.revenueSeries.map((p) => p.amount ?? 0);
    let exp = fin.expenseSeries.map((p) => p.amount ?? 0);
    let net = fin.netProfitSeries.map((p) => p.amount ?? 0);
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
        { label: 'Revenue', data: rev, borderColor: '#10b981', tension: 0.35 },
        { label: 'Expenses', data: exp, borderColor: '#ef4444', tension: 0.35 },
        { label: 'Net profit', data: net, borderColor: '#8b5cf6', borderDash: [5, 4], tension: 0.35 },
      ],
    };
  }

  buildPlanData(analytics: AnalyticsSummary | null): ChartData<'doughnut'> {
    const groups = analytics?.finance.revenueByPlan ?? [];
    return {
      labels: groups.map((g) => g.key),
      datasets: [{ data: groups.map((g) => g.value), backgroundColor: CHART_PALETTE, borderWidth: 0 }],
    };
  }

  buildLeadsData(analytics: AnalyticsSummary | null): ChartData<'bar'> {
    const groups = analytics?.leads.byStatus ?? [];
    return {
      labels: groups.map((g) => g.key),
      datasets: [{ label: 'Leads', data: groups.map((g) => g.value), backgroundColor: '#8b5cf6', borderRadius: 4 }],
    };
  }
}

