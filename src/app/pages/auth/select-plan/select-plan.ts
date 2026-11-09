import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';

import { TokenStorage } from '../../../core/auth/token-storage.service';
import { AuthApiService } from '../../../core/auth/auth-api.service';
import { PermissionsService } from '../../../core/roles/permissions.service';
import { SubscriptionStatusService } from '../../../core/auth/subscription-status.service';
import { ToastService } from '../../../core/toast/toast.service';
import { BillingApiService, SubscriptionTier } from '../../../core/billing/billing-api.service';

interface PlanOption {
  tier: SubscriptionTier;
  label: string;
  tagline: string;
  monthlyPriceInr: number;
  maxBranches: number;
  maxMembers: number;
  maxEmployees: number;
  biometricAttendance: boolean;
  popular?: boolean;
}

// Mirrors billing.constants.ts on the backend (and billing.ts's own
// TIER_OPTIONS) — display data only, ENTERPRISE excluded since it's
// never self-serve/choosable here. The actual enforcement lives in
// BillingService.selectTrialPlan; a mismatch here is cosmetic.
const PLAN_OPTIONS: PlanOption[] = [
  { tier: 'STARTER', label: 'Starter', tagline: 'A single branch just getting started', monthlyPriceInr: 700, maxBranches: 1, maxMembers: 300, maxEmployees: 5, biometricAttendance: false },
  { tier: 'PLUS', label: 'Plus', tagline: 'A second branch and more staff on payroll', monthlyPriceInr: 1300, maxBranches: 2, maxMembers: 800, maxEmployees: 12, biometricAttendance: false },
  { tier: 'GROWTH', label: 'Growth', tagline: 'Biometric attendance and room to add branches', monthlyPriceInr: 2500, maxBranches: 3, maxMembers: 2000, maxEmployees: 25, biometricAttendance: true, popular: true },
  { tier: 'PRO', label: 'Pro', tagline: 'For an established, growing multi-branch chain', monthlyPriceInr: 4500, maxBranches: 5, maxMembers: 5000, maxEmployees: 60, biometricAttendance: true },
  { tier: 'SCALE', label: 'Scale', tagline: 'Our largest self-serve plan', monthlyPriceInr: 7000, maxBranches: 10, maxMembers: 10000, maxEmployees: 150, biometricAttendance: true },
];

/**
 * Mandatory post-registration gate. Rendered OUTSIDE Layout (same
 * pattern as SubscriptionLocked) — no sidebar/nav — and reached only
 * via planSelectionGuard (auth.guard.ts), which sends every nested
 * navigation here for as long as the org's subscriptionTier is still
 * null (AuthService.register deliberately leaves it unset; see that
 * file's comment). Every self-serve tier is free to pick here — this
 * is BillingService.selectTrialPlan, not checkout — so the only
 * blocker is a tier whose limits don't already cover the org's
 * current usage (always true for a brand-new org, since nothing has
 * been created yet).
 *
 * Owner vs. staff: identical to SubscriptionLocked's reasoning — if a
 * staff login somehow lands here before the owner has picked a plan,
 * they see a plain "ask the owner" message instead of a picker they
 * have no authority to act on (selectTrialPlan is effectively an
 * owner-only business decision, even though nothing stops the backend
 * route itself from accepting any authenticated user — enforced here
 * purely as a UX guardrail, matching how /billing already gates staff
 * out via ownerGuard).
 */
@Component({
  selector: 'app-select-plan',
  standalone: true,
  imports: [CommonModule, ButtonModule, TagModule],
  templateUrl: './select-plan.html',
  styleUrls: ['./select-plan.css'],
})
export class SelectPlan {
  private router = inject(Router);
  private tokenStorage = inject(TokenStorage);
  private authApi = inject(AuthApiService);
  private permissions = inject(PermissionsService);
  private subscriptionStatus = inject(SubscriptionStatusService);
  private billingApi = inject(BillingApiService);
  private toast = inject(ToastService);

  readonly isOwner = this.tokenStorage.isOwner();
  readonly plans = PLAN_OPTIONS;
  selecting = signal<SubscriptionTier | null>(null);

  choose(tier: SubscriptionTier): void {
    if (!this.isOwner || this.selecting()) {
      return;
    }
    this.selecting.set(tier);
    this.billingApi.selectTrialPlan(tier).subscribe({
      next: () => {
        this.selecting.set(null);
        // Make the very next navigation's planSelectionGuard check see
        // the freshly chosen tier instead of the still-null cached one.
        this.subscriptionStatus.invalidate();
        this.toast.success(`Your free trial is on ${tier}.`);
        this.router.navigateByUrl('/dashboard');
      },
      error: (err) => {
        this.selecting.set(null);
        this.toast.error(err?.error?.message ?? 'Could not start your trial on this plan.');
      },
    });
  }

  annualPriceInr(monthly: number): number {
    return monthly * 10;
  }

  logout(): void {
    this.authApi.logout().subscribe({ next: () => {}, error: () => {} });
    this.tokenStorage.clear();
    this.permissions.clear();
    this.subscriptionStatus.clear();
    this.router.navigateByUrl('/login');
  }
}
