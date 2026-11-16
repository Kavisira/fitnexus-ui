import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSpinModule } from 'ng-zorro-antd/spin';

import { AppChartComponent } from '../../../shared/components/app-chart/app-chart.component';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { DashboardKpiRowComponent, StatExpandEvent } from './components/dashboard-kpi-row.component';
import { ChartExpandEvent, DashboardTrendChartsComponent } from './components/dashboard-trend-charts.component';
import { DashboardSecondaryRowComponent } from './components/dashboard-secondary-row.component';
import { DashboardBranchTableComponent } from './components/dashboard-branch-table.component';
import { DashboardChartService } from './services/dashboard-chart.service';

import {
  AnalyticsSummary,
  BranchBreakdownRow,
  DashboardApiService,
  DashboardSummary,
} from '../../../../core/dashboard/dashboard-api.service';
import { BranchStore } from '../../../../core/branches/branch-store.service';
import { AuthApiService } from '../../../../core/auth/auth-api.service';
import { SubscriptionSummary } from '../../../../core/billing/billing-api.service';
import { TokenStorage } from '../../../../core/auth/token-storage.service';

@Component({
  selector: 'app-v2-dashboard',
  imports: [
    CommonModule,
    FormsModule,
    NzButtonModule,
    NzIconModule,
    NzSelectModule,
    NzModalModule,
    NzSpinModule,
    TranslatePipe,
    AppChartComponent,
    DashboardKpiRowComponent,
    DashboardTrendChartsComponent,
    DashboardSecondaryRowComponent,
    DashboardBranchTableComponent,
  ],
  templateUrl: './dashboard.component.html',
  host: {
    class: 'flex flex-col flex-1 min-h-0 min-w-0 w-full max-w-full',
  },
})
export class V2DashboardComponent implements OnInit {
  private api = inject(DashboardApiService);
  private branchStore = inject(BranchStore);
  private authApi = inject(AuthApiService);
  private tokenStorage = inject(TokenStorage);
  private router = inject(Router);
  readonly chartService = inject(DashboardChartService);

  readonly loading = signal(false);
  readonly summary = signal<DashboardSummary | null>(null);
  readonly subscription = signal<SubscriptionSummary | null>(null);
  readonly selectedBranchId = signal<string>('ALL');

  readonly expandedStat = signal<StatExpandEvent | null>(null);
  readonly expandedChart = signal<ChartExpandEvent | null>(null);
  readonly expandedTable = signal<BranchBreakdownRow[] | null>(null);

  readonly financeTimeframe = signal<'30D' | '90D' | '1Y'>('30D');
  readonly signupTimeframe = signal<'30D' | '90D' | '1Y'>('30D');

  readonly branches = this.branchStore.branches;
  readonly isOwner = computed(() => this.tokenStorage.getRole() === 'OWNER');
  readonly analytics = computed(() => (this.summary()?.view === 'ANALYTICS' ? (this.summary() as AnalyticsSummary) : null));

  readonly showBranchFilter = computed(() => this.branches().length > 1);
  readonly singleBranchLabel = computed(() => (this.branches().length === 1 ? this.branches()[0].location : null));
  readonly branchOptions = computed(() => [
    { label: 'All branches', value: 'ALL' },
    ...this.branches().map((b) => ({ label: b.location, value: b.id })),
  ]);

  readonly primaryCurrency = computed(() => this.branches()[0]?.currency ?? 'INR');

  readonly subscriptionDaysRemaining = computed(() => {
    const s = this.subscription();
    const date = s?.currentPeriodEnd ?? s?.trialEndsAt;
    if (!date) return null;
    return Math.ceil((new Date(date).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  });

  readonly profitMarginPct = computed(() => {
    const fin = this.analytics()?.finance;
    if (!fin || !fin.revenueThisMonth || fin.revenueThisMonth <= 0) return 0;
    return Math.round((fin.netProfitThisMonth / fin.revenueThisMonth) * 100);
  });

  readonly hasPlanRevenue = computed(() => {
    const plans = this.analytics()?.finance.revenueByPlan ?? [];
    return plans.some((p) => (p.value ?? 0) > 0);
  });

  readonly hasLeadsData = computed(() => {
    const leads = this.analytics()?.leads.byStatus ?? [];
    return leads.some((l) => (l.value ?? 0) > 0);
  });

  readonly signupChartData = computed(() =>
    this.chartService.buildSignupData(this.analytics(), this.signupTimeframe())
  );

  readonly financeChartData = computed(() =>
    this.chartService.buildFinanceData(this.analytics(), this.financeTimeframe())
  );

  readonly revenueByPlanChartData = computed(() =>
    this.chartService.buildPlanData(this.analytics())
  );

  readonly leadsByStatusChartData = computed(() =>
    this.chartService.buildLeadsData(this.analytics())
  );

  ngOnInit(): void {
    this.branchStore.ensureLoaded();
    this.loadData();
    this.authApi.me().subscribe({
      next: (me) => this.subscription.set(me.subscription),
      error: () => {},
    });
  }

  loadData(): void {
    this.loading.set(true);
    const branchId = this.selectedBranchId() === 'ALL' ? null : this.selectedBranchId();
    this.api.summary(branchId).subscribe({
      next: (res) => {
        this.summary.set(res);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onBranchChange(branchId: string): void {
    this.selectedBranchId.set(branchId);
    this.loadData();
  }

  goToBilling(): void {
    this.router.navigate(['/billing']);
  }
}
