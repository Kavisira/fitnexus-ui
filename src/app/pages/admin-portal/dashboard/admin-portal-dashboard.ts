import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ChartModule } from 'primeng/chart';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { TableScrollShadowDirective } from '../../../shared/table-scroll-shadow/table-scroll-shadow.directive';

import {
  AdminPortalApiService,
  PlatformOverview,
  PlatformOrganizationDetail,
  PlatformCheckoutEventDetail,
} from '../../../core/admin-portal/admin-portal-api.service';
import { AdminPortalTokenStorage } from '../../../core/admin-portal/admin-portal-token-storage.service';
import { ThemeService } from '../../../core/theme/theme.service';
import { ThemeToggle } from '../../../shared/theme-toggle/theme-toggle';

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: '#22b07d',
  TRIALING: '#4f6ef2',
  PAST_DUE: '#f5a524',
  CANCELLED: '#8792ac',
  EXPIRED: '#f87171',
};
const TIER_COLORS: Record<string, string> = {
  STARTER: '#8fa0e8',
  PLUS: '#4f6ef2',
  GROWTH: '#22b07d',
  PRO: '#f5a524',
  SCALE: '#f87171',
  ENTERPRISE: '#c084fc',
  UNSET: '#5b6472',
};

// Tier display order for the plan-wise KPI row — deliberately not
// Object.keys(TIER_COLORS) order-dependent, so a future reshuffle of
// that map doesn't silently reorder the cards.
const TIER_ORDER = ['STARTER', 'PLUS', 'GROWTH', 'PRO', 'SCALE', 'ENTERPRISE'] as const;

const STATUS_FILTER_OPTIONS: { label: string; value: string }[] = [
  { label: 'All statuses', value: 'ALL' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Trialing', value: 'TRIALING' },
  { label: 'Past due', value: 'PAST_DUE' },
  { label: 'Cancelled', value: 'CANCELLED' },
  { label: 'Expired', value: 'EXPIRED' },
];

// Inclusive day-level range check shared by every table's date filter —
// `to` is treated as end-of-day so picking the same day for from/to
// still matches rows created any time that day.
function inDateRange(value: string | Date, from: Date | null, to: Date | null): boolean {
  const d = new Date(value).getTime();
  if (from && d < new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime()) return false;
  if (to && d > new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59, 999).getTime()) return false;
  return true;
}

@Component({
  selector: 'app-admin-portal-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    ButtonModule,
    TableModule,
    TagModule,
    ChartModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
    FormsModule,
    ThemeToggle,
    RouterLink,
    DialogModule,
    SelectModule,
    DatePickerModule,
    TableScrollShadowDirective,
  ],
  templateUrl: './admin-portal-dashboard.html',
  styleUrls: ['./admin-portal-dashboard.css'],
})
export class AdminPortalDashboard implements OnInit {
  private api = inject(AdminPortalApiService);
  private tokenStorage = inject(AdminPortalTokenStorage);
  private router = inject(Router);
  private theme = inject(ThemeService);

  loading = signal(true);
  errorMessage = signal<string | null>(null);
  overview = signal<PlatformOverview | null>(null);
  searchTerm = signal('');
  statusFilterOptions = STATUS_FILTER_OPTIONS;
  statusFilter = signal('ALL');
  dateFrom = signal<Date | null>(null);
  dateTo = signal<Date | null>(null);

  filteredOrganizations = computed(() => {
    const data = this.overview();
    if (!data) return [];
    const term = this.searchTerm().trim().toLowerCase();
    const status = this.statusFilter();
    const from = this.dateFrom();
    const to = this.dateTo();
    return data.recentOrganizations.filter((o) => {
      if (term && !(o.name.toLowerCase().includes(term) || o.email.toLowerCase().includes(term) || o.ownerName.toLowerCase().includes(term))) {
        return false;
      }
      if (status !== 'ALL' && o.subscriptionStatus !== status) return false;
      if (!inDateRange(o.createdAt, from, to)) return false;
      return true;
    });
  });

  clearOrgFilters(): void {
    this.searchTerm.set('');
    this.statusFilter.set('ALL');
    this.dateFrom.set(null);
    this.dateTo.set(null);
  }

  // Plan-wise KPI row — one card per tier, org count + active-paying
  // count + MRR contribution, sourced straight off overview()'s byTier
  // / activePayingByTier / mrrByTier maps.
  tierCards = computed(() => {
    const data = this.overview();
    if (!data) return [];
    return TIER_ORDER.map((tier) => ({
      tier,
      color: TIER_COLORS[tier] ?? '#5b6472',
      orgCount: data.byTier[tier] ?? 0,
      activePaying: data.activePayingByTier[tier] ?? 0,
      trialing: data.trialingByTier[tier] ?? 0,
      mrrInr: data.mrrByTier[tier] ?? 0,
    }));
  });

  // Reactive to theme changes, same approach as the tenant dashboard
  // (see Dashboard.axisColor/gridColor) — Chart.js options are plain
  // objects re-read on every change detection, so recomputing these as
  // the mode flips is enough to re-tint axes/legends without rebuilding
  // the chart.
  private axisColor = computed(() => (this.theme.mode() === 'dark' ? '#aeb7cc' : '#6b7280'));
  private gridColor = computed(() => (this.theme.mode() === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- chart options shape is loose in PrimeNG's own typing, same as the tenant dashboard.
  lineChartOptions = computed<any>(() => ({
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { color: this.axisColor(), maxTicksLimit: 8 }, grid: { display: false } },
      y: { ticks: { color: this.axisColor() }, grid: { color: this.gridColor() }, beginAtZero: true },
    },
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  doughnutOptions = computed<any>(() => ({
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom' as const, labels: { color: this.axisColor(), padding: 12 } } },
    cutout: '65%',
  }));

  signupChartData = signal<any>(null);
  statusChartData = signal<any>(null);
  tierChartData = signal<any>(null);

  // ---- Detail-list drill-down dialog shared by every clickable KPI
  // card and breakdown row. One dialog, re-populated per click, rather
  // than a separate dialog per widget — keeps the markup small and the
  // loading/empty states handled in one place.
  detailVisible = signal(false);
  detailTitle = signal('');
  detailLoading = signal(false);
  detailKind = signal<'organizations' | 'checkout'>('organizations');
  detailOrganizations = signal<PlatformOrganizationDetail[]>([]);
  detailCheckoutEvents = signal<PlatformCheckoutEventDetail[]>([]);
  detailSearchTerm = signal('');
  detailStatusFilterOptions = STATUS_FILTER_OPTIONS;
  detailStatusFilter = signal('ALL');
  detailDateFrom = signal<Date | null>(null);
  detailDateTo = signal<Date | null>(null);

  filteredDetailOrganizations = computed(() => {
    const term = this.detailSearchTerm().trim().toLowerCase();
    const status = this.detailStatusFilter();
    const from = this.detailDateFrom();
    const to = this.detailDateTo();
    return this.detailOrganizations().filter((o) => {
      if (term && !(o.name.toLowerCase().includes(term) || o.email.toLowerCase().includes(term) || o.ownerName.toLowerCase().includes(term))) {
        return false;
      }
      if (status !== 'ALL' && o.subscriptionStatus !== status) return false;
      if (!inDateRange(o.createdAt, from, to)) return false;
      return true;
    });
  });

  filteredDetailCheckoutEvents = computed(() => {
    const term = this.detailSearchTerm().trim().toLowerCase();
    const from = this.detailDateFrom();
    const to = this.detailDateTo();
    return this.detailCheckoutEvents().filter((e) => {
      if (
        term &&
        !(
          (e.organizationName ?? '').toLowerCase().includes(term) ||
          (e.email ?? '').toLowerCase().includes(term) ||
          (e.ownerName ?? '').toLowerCase().includes(term)
        )
      ) {
        return false;
      }
      if (!inDateRange(e.createdAt, from, to)) return false;
      return true;
    });
  });

  clearDetailFilters(): void {
    this.detailSearchTerm.set('');
    this.detailStatusFilter.set('ALL');
    this.detailDateFrom.set(null);
    this.detailDateTo.set(null);
  }

  openOrgDetail(segment: string, title: string): void {
    this.detailTitle.set(title);
    this.detailKind.set('organizations');
    this.detailVisible.set(true);
    this.detailLoading.set(true);
    this.detailSearchTerm.set('');
    this.detailStatusFilter.set('ALL');
    this.detailDateFrom.set(null);
    this.detailDateTo.set(null);
    this.api.organizationsBySegment(segment).subscribe({
      next: (rows) => {
        this.detailOrganizations.set(rows);
        this.detailLoading.set(false);
      },
      error: () => {
        this.detailOrganizations.set([]);
        this.detailLoading.set(false);
      },
    });
  }

  openCheckoutDetail(outcome: 'started' | 'failed' | 'converted', title: string): void {
    this.detailTitle.set(title);
    this.detailKind.set('checkout');
    this.detailVisible.set(true);
    this.detailLoading.set(true);
    this.detailSearchTerm.set('');
    this.detailDateFrom.set(null);
    this.detailDateTo.set(null);
    this.api.checkoutEventsByOutcome(outcome).subscribe({
      next: (rows) => {
        this.detailCheckoutEvents.set(rows);
        this.detailLoading.set(false);
      },
      error: () => {
        this.detailCheckoutEvents.set([]);
        this.detailLoading.set(false);
      },
    });
  }

  // (onDataSelect) handlers for the two doughnut charts — clicking a
  // slice drills into the orgs behind that status/tier, same detail
  // dialog as the KPI cards.
  onStatusSliceSelect(event: any, data: PlatformOverview): void {
    const entries = Object.entries(data.bySubscriptionStatus).filter(([, v]) => v > 0);
    const key = entries[event?.element?.index]?.[0];
    if (!key) return;
    this.openOrgDetail(`substatus:${key}`, `Organizations — ${key}`);
  }

  onTierSliceSelect(event: any, data: PlatformOverview): void {
    const entries = Object.entries(data.byTier).filter(([, v]) => v > 0);
    const key = entries[event?.element?.index]?.[0];
    if (!key) return;
    this.openOrgDetail(`tier:${key}`, `Organizations — ${key === 'UNSET' ? 'No tier' : key} tier`);
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.api.overview().subscribe({
      next: (data) => {
        this.loading.set(false);
        this.overview.set(data);
        this.buildCharts(data);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(err?.error?.message ?? 'Failed to load platform overview.');
      },
    });
  }

  private buildCharts(data: PlatformOverview): void {
    this.signupChartData.set({
      labels: data.signupTrend.map((d) => d.date.slice(5)),
      datasets: [
        {
          label: 'Signups',
          data: data.signupTrend.map((d) => d.count),
          borderColor: '#4f6ef2',
          backgroundColor: 'rgba(79, 110, 242, 0.18)',
          fill: true,
          tension: 0.35,
          pointRadius: 0,
        },
      ],
    });

    const statusEntries = Object.entries(data.bySubscriptionStatus).filter(([, v]) => v > 0);
    this.statusChartData.set({
      labels: statusEntries.map(([k]) => k),
      datasets: [{ data: statusEntries.map(([, v]) => v), backgroundColor: statusEntries.map(([k]) => STATUS_COLORS[k] ?? '#5b6472') }],
    });

    const tierEntries = Object.entries(data.byTier).filter(([, v]) => v > 0);
    this.tierChartData.set({
      labels: tierEntries.map(([k]) => k),
      datasets: [{ data: tierEntries.map(([, v]) => v), backgroundColor: tierEntries.map(([k]) => TIER_COLORS[k] ?? '#5b6472') }],
    });
  }

  logout(): void {
    this.tokenStorage.clear();
    this.router.navigate(['/admin-portal/login']);
  }

  statusSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    switch (status) {
      case 'ACTIVE':
        return 'success';
      case 'TRIALING':
        return 'info';
      case 'PAST_DUE':
        return 'warn';
      case 'CANCELLED':
        return 'secondary';
      default:
        return 'danger';
    }
  }
}
