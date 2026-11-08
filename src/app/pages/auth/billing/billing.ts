import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { CardModule } from 'primeng/card';
import { ProgressBarModule } from 'primeng/progressbar';
import { DialogModule } from 'primeng/dialog';

import { PageHeaderService } from '../../../shared/page-header/page-header.service';
import { SubscriptionStatusService } from '../../../core/auth/subscription-status.service';
import { ToastService } from '../../../core/toast/toast.service';
import {
  BillingApiService,
  BillingCycle,
  SubscriptionEvent,
  SubscriptionSummary,
  SubscriptionTier,
} from '../../../core/billing/billing-api.service';
import { environment } from '../../../../environments/environment';

interface TierOption {
  tier: SubscriptionTier;
  label: string;
  tagline: string;
  icon: string;
  monthlyPriceInr: number | null;
  maxBranches: number;
  maxMembers: number;
  staffLoginsUnlimited: boolean;
  biometricAttendance: boolean;
  popular?: boolean;
}

// Mirrors billing.constants.ts on the backend exactly — this is display
// data only (what the upgrade cards show); the backend is the only
// place that actually enforces prices/limits, so a mismatch here is
// cosmetic, never a security issue.
const TIER_OPTIONS: TierOption[] = [
  { tier: 'BASIC', label: 'Basic', tagline: 'A single branch just getting started', icon: 'pi-home', monthlyPriceInr: 500, maxBranches: 1, maxMembers: 200, staffLoginsUnlimited: false, biometricAttendance: false },
  { tier: 'STARTER', label: 'Starter', tagline: 'Add staff logins for your front desk & trainers', icon: 'pi-sparkles', monthlyPriceInr: 600, maxBranches: 1, maxMembers: 200, staffLoginsUnlimited: true, biometricAttendance: false },
  { tier: 'PLUS', label: 'Plus', tagline: 'A second branch with biometric attendance', icon: 'pi-building', monthlyPriceInr: 800, maxBranches: 2, maxMembers: 500, staffLoginsUnlimited: true, biometricAttendance: true },
  { tier: 'PLUS_PLUS', label: 'Plus+', tagline: 'More room to grow your member base', icon: 'pi-building', monthlyPriceInr: 1000, maxBranches: 2, maxMembers: 1000, staffLoginsUnlimited: true, biometricAttendance: true },
  { tier: 'PRO', label: 'Pro', tagline: 'Our most popular plan for growing gyms', icon: 'pi-star', monthlyPriceInr: 1500, maxBranches: 3, maxMembers: 2000, staffLoginsUnlimited: true, biometricAttendance: true, popular: true },
  { tier: 'GROWTH', label: 'Growth', tagline: 'Multiple branches, thousands of members', icon: 'pi-chart-line', monthlyPriceInr: 3000, maxBranches: 5, maxMembers: 3500, staffLoginsUnlimited: true, biometricAttendance: true },
  { tier: 'GROWTH_PLUS', label: 'Growth+', tagline: 'For established multi-branch chains', icon: 'pi-chart-line', monthlyPriceInr: 5500, maxBranches: 7, maxMembers: 5000, staffLoginsUnlimited: true, biometricAttendance: true },
  { tier: 'SCALE', label: 'Scale', tagline: 'Our largest self-serve plan', icon: 'pi-crown', monthlyPriceInr: 9000, maxBranches: 10, maxMembers: 10000, staffLoginsUnlimited: true, biometricAttendance: true },
  { tier: 'ENTERPRISE', label: 'Enterprise', tagline: 'Custom limits, tailored to your chain', icon: 'pi-globe', monthlyPriceInr: null, maxBranches: Infinity, maxMembers: Infinity, staffLoginsUnlimited: true, biometricAttendance: true },
];

const SELF_SERVE_ORDER: SubscriptionTier[] = TIER_OPTIONS.filter((t) => t.tier !== 'ENTERPRISE').map((t) => t.tier);

const STATUS_LABELS: Record<string, string> = {
  TRIALING: 'Free trial',
  ACTIVE: 'Active',
  PAST_DUE: 'Payment overdue',
  CANCELLED: 'Cancelled',
  EXPIRED: 'Expired',
};

/** Owner-only screen for the organization's own FitNexus subscription
 * (NOT the separate member-payment flow). Shows the current
 * plan/trial and its expiry, and lets the owner upgrade to a higher
 * tier via Cashfree's hosted checkout — strictly upgrade-only, no
 * downgrade path, matching the backend (BillingService.checkout). */
@Component({
  selector: 'app-billing',
  standalone: true,
  imports: [CommonModule, ButtonModule, TagModule, CardModule, ProgressBarModule, DialogModule],
  templateUrl: './billing.html',
  styleUrls: ['./billing.css'],
})
export class Billing implements OnInit {
  private billingApi = inject(BillingApiService);
  private toast = inject(ToastService);
  private destroyRef = inject(DestroyRef);
  private pageHeader = inject(PageHeaderService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private subscriptionStatus = inject(SubscriptionStatusService);

  // The test-only Reset button must never render in a production
  // build, regardless of cashfreeMode (that's the payment gateway's
  // own sandbox/production setting, not a deployment-environment
  // flag — the two can drift independently, e.g. a prod deploy that
  // hasn't flipped cashfreeMode yet). environment.production is the
  // one authoritative "is this a production build" signal, set by
  // Angular's fileReplacements at build time, so it's checked
  // directly rather than inferred from cashfreeMode. Still
  // double-checked server-side in BillingService.resetToTrial (hard
  // 403s once CASHFREE_ENV=PROD there), which is the real gate — this
  // is purely about not showing a button real customers should never
  // see.
  readonly isTestEnvironment = !environment.production && environment.cashfreeMode === 'sandbox';
  resetting = signal(false);
  // Days-remaining input next to the reset button — defaults to a
  // fresh 30-day trial (matching the backend's own default when
  // `days` is omitted); 1-3 for watching the dashboard countdown tick
  // down, 0 or negative to jump straight to "already expired".
  testTrialDays = signal(30);
  syncing = signal(false);

  loading = signal(true);
  status = signal<SubscriptionSummary | null>(null);
  billingCycle = signal<BillingCycle>('MONTHLY');
  checkingOutTier = signal<SubscriptionTier | null>(null);

  tiers = TIER_OPTIONS;
  statusLabels = STATUS_LABELS;
  history = signal<SubscriptionEvent[]>([]);
  historyLoading = signal(true);
  historyVisible = signal(false);
  private historyLoaded = false;

  // Exposed for the template (Infinity isn't accessible from an Angular
  // template expression otherwise).
  readonly Infinity = Infinity;

  ngOnInit(): void {
    this.pageHeader.setTitleKey('common.billing');
    this.destroyRef.onDestroy(() => this.pageHeader.clear());

    // Landed here straight off Cashfree's hosted checkout
    // (/billing?checkout=return — see BillingController.return) —
    // reconcile with Cashfree's own source of truth immediately
    // instead of waiting on a webhook that may never reach this
    // environment (see BillingService.syncFromCashfree).
    if (this.route.snapshot.queryParamMap.get('checkout') === 'return') {
      this.syncing.set(true);
      this.billingApi.sync().subscribe({
        next: (s) => {
          this.syncing.set(false);
          this.status.set(s);
          this.loading.set(false);
          this.subscriptionStatus.invalidate();
          this.toast.success('Your plan has been updated.');
          // Drop the query param so a refresh doesn't re-trigger this.
          this.router.navigate([], { relativeTo: this.route, queryParams: {} });
        },
        error: () => {
          this.syncing.set(false);
          this.load();
        },
      });
      return;
    }

    this.load();
  }

  // TEST-ONLY — see BillingApiService.resetToTrial / the backend's
  // BillingService.resetToTrial for why this is safe to leave wired
  // up (it no-ops with a 403 once CASHFREE_ENV=PROD).
  onTestTrialDaysInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.testTrialDays.set(Number(value) || 0);
  }

  // "Reset to free trial" — always a fresh 30-day trial, regardless
  // of whatever's currently typed in the days input (also resets that
  // input back to 30 so it stays a sensible starting point for the
  // other button).
  resetToFreshTrial(): void {
    this.testTrialDays.set(30);
    this.resetting.set(true);
    this.billingApi.resetToTrial().subscribe({
      next: (s) => {
        this.resetting.set(false);
        this.status.set(s);
        this.subscriptionStatus.invalidate();
        this.toast.success('Reset back to a fresh free trial.');
      },
      error: (err) => {
        this.resetting.set(false);
        this.toast.error(err?.error?.message ?? 'Could not reset.');
      },
    });
  }

  // "Set" — uses whatever's typed in the days input, for dialing the
  // trial down to a small or already-expired number for testing.
  resetToTrial(): void {
    const days = this.testTrialDays();
    this.resetting.set(true);
    this.billingApi.resetToTrial(days).subscribe({
      next: (s) => {
        this.resetting.set(false);
        this.status.set(s);
        this.subscriptionStatus.invalidate();
        this.toast.success(
          days <= 0 ? 'Trial backdated — now showing as already expired.' : `Trial set to ${days} day${days === 1 ? '' : 's'} remaining.`,
        );
      },
      error: (err) => {
        this.resetting.set(false);
        this.toast.error(err?.error?.message ?? 'Could not reset.');
      },
    });
  }

  load(): void {
    this.loading.set(true);
    this.billingApi.status().subscribe({
      next: (s) => {
        this.loading.set(false);
        this.status.set(s);
        this.subscriptionStatus.invalidate();
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('Could not load subscription status.');
      },
    });
  }

  // Loaded lazily — only fetched the first time the owner opens the
  // history modal, not on every page load.
  loadHistory(): void {
    this.historyLoading.set(true);
    this.billingApi.history().subscribe({
      next: (rows) => {
        this.historyLoading.set(false);
        this.historyLoaded = true;
        this.history.set(rows);
      },
      error: () => this.historyLoading.set(false),
    });
  }

  openHistory(): void {
    this.historyVisible.set(true);
    if (!this.historyLoaded) {
      this.loadHistory();
    }
  }

  historyOutcomeSeverity(outcome: SubscriptionEvent['outcome']): 'success' | 'danger' | 'info' {
    if (outcome === 'SUCCESS') return 'success';
    if (outcome === 'FAILED') return 'danger';
    return 'info';
  }

  historyDate(iso: string): string {
    return new Date(iso).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  // An org on TRIALING or with no tier yet can move to anything;
  // otherwise only a strictly-higher tier is selectable — mirrors
  // SELF_SERVE_TIER_ORDER validation on the backend so the button
  // disables itself instead of letting the owner hit a 403.
  isUpgradeTarget(tier: SubscriptionTier): boolean {
    if (tier === 'ENTERPRISE') return false;
    const current = this.status()?.tier;
    if (!current) return true;
    return SELF_SERVE_ORDER.indexOf(tier) > SELF_SERVE_ORDER.indexOf(current);
  }

  annualPriceInr(monthly: number | null): number | null {
    return monthly === null ? null : monthly * 10;
  }

  // What a tier works out to per month when paid annually — the
  // "2 months free" saving expressed the way a buyer actually reads
  // it, rather than making them do the division themselves.
  annualMonthlyEquivalent(monthly: number | null): number | null {
    return monthly === null ? null : Math.round((monthly * 10) / 12);
  }

  isCurrentTier(tier: SubscriptionTier): boolean {
    return this.status()?.tier === tier;
  }

  statusLabel(): string {
    const s = this.status()?.status;
    return s ? (this.statusLabels[s] ?? s) : 'Unknown';
  }

  statusSeverity(): 'danger' | 'success' | 'warn' | 'info' {
    const s = this.status();
    if (s?.isExpired) return 'danger';
    if (s?.status === 'PAST_DUE') return 'warn';
    if (s?.status === 'TRIALING') return 'info';
    return 'success';
  }

  expiryLabel(): string {
    const s = this.status();
    const date = s?.currentPeriodEnd ?? s?.trialEndsAt;
    if (!date) return '—';
    return new Date(date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  daysRemaining(): number | null {
    const s = this.status();
    const date = s?.currentPeriodEnd ?? s?.trialEndsAt;
    if (!date) return null;
    const ms = new Date(date).getTime() - Date.now();
    return Math.ceil(ms / (24 * 60 * 60 * 1000));
  }

  // Visual-only progress bar for the trial/billing-period countdown —
  // clamps to [0, 100] and assumes a 30-day window (TRIAL_DAYS on the
  // backend) for trial, or just shows a generic "time remaining" feel
  // for a paid period since a paid cycle's full length isn't sent down
  // today (currentPeriodEnd only). Good enough for an at-a-glance
  // indicator, not meant to be exact for paid cycles.
  daysRemainingPercent(): number {
    const days = this.daysRemaining();
    if (days === null) return 0;
    const windowDays = this.status()?.tier ? 30 : 30;
    return Math.max(0, Math.min(100, (days / windowDays) * 100));
  }

  upgrade(tier: SubscriptionTier): void {
    if (tier === 'ENTERPRISE') {
      this.toast.success('Enterprise is arranged directly with us — please contact support to discuss your plan.');
      return;
    }
    this.checkingOutTier.set(tier);
    this.billingApi.checkout(tier, this.billingCycle()).subscribe({
      next: async (res) => {
        try {
          const { load } = await import('@cashfreepayments/cashfree-js');
          const cashfree = await load({ mode: environment.cashfreeMode });
          // Cashfree's own parameter name is `subsSessionId`, not
          // `subscriptionSessionId` — see cashfree-js.d.ts for why
          // getting this wrong looks like an infinite "loading" state
          // rather than an obvious error.
          const result = await cashfree.subscriptionsCheckout({
            subsSessionId: res.subscriptionSessionId,
            redirectTarget: '_self',
          });
          if (result?.error) {
            this.checkingOutTier.set(null);
            this.toast.error(result.error.message || 'Could not open the payment page. Please try again.');
            return;
          }
          // subscriptionsCheckout navigates the tab away on success, so
          // normally nothing after this line ever runs — this only
          // executes if it resolved without actually redirecting
          // (e.g. the user cancelled on Cashfree's page), so the
          // button shouldn't keep spinning forever in that case.
          this.checkingOutTier.set(null);
        } catch (err) {
          console.error('Cashfree checkout failed to open', err);
          this.checkingOutTier.set(null);
          this.toast.error('Could not open the payment page. Please try again.');
        }
      },
      error: (err) => {
        this.checkingOutTier.set(null);
        this.toast.error(err?.error?.message ?? 'Could not start checkout.');
      },
    });
  }
}
