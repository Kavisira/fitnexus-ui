import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';

import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { TokenStorage } from '../../../core/auth/token-storage.service';
import { AuthApiService } from '../../../core/auth/auth-api.service';
import { PermissionsService } from '../../../core/roles/permissions.service';
import { SubscriptionStatusService } from '../../../core/auth/subscription-status.service';

/**
 * The hard-lockout page. Deliberately rendered OUTSIDE Layout (see
 * app.routes.ts) — no sidebar, no top nav, nothing else reachable from
 * here — so it can't be worked around by anything Layout would
 * otherwise render around it. subscriptionGuard (auth.guard.ts) sends
 * every navigation here the instant an org's trial/paid period has
 * run out, except /billing itself (Owner-only, per ownerGuard) and
 * this route.
 *
 * Deliberately a blank "upgrade to continue" wall, not a data-flavored
 * teaser — no member counts, no branch names, nothing that makes
 * staying unpaid feel comfortable enough to put off renewing.
 *
 * Owner vs. staff: billing actions are Owner-only everywhere else in
 * this app (see BillingController/ownerGuard), so a staff login that
 * lands here has no path to actually fix this themselves — they see a
 * plain "ask the owner" message and no "Go to Billing" button at all,
 * rather than a button that would just 403/redirect them straight back
 * here anyway.
 */
@Component({
  selector: 'app-subscription-locked',
  standalone: true,
  imports: [TranslatePipe, ButtonModule],
  template: `
    <div class="lock-screen">
      <div class="lock-card">
        <h1>{{ 'common.subscriptionLockedTitle' | translate }}</h1>
        <p>{{ (isOwner ? 'common.subscriptionLockedOwnerMessage' : 'common.subscriptionLockedStaffMessage') | translate }}</p>

        @if (isOwner) {
          <p-button [label]="'common.subscriptionLockedGoToBilling' | translate" (onClick)="goToBilling()" />
        }

        <button type="button" class="logout-link" (click)="logout()">
          {{ 'common.subscriptionLockedLogout' | translate }}
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      .lock-screen {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1.5rem;
        background: var(--p-content-background, #f8fafc);
      }
      .lock-card {
        max-width: 28rem;
        width: 100%;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;
        padding: 2.5rem 2rem;
        border-radius: 0.75rem;
        background: var(--p-surface-card, #fff);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      }
      h1 {
        margin: 0;
        font-size: 1.375rem;
      }
      p {
        margin: 0;
        color: var(--p-text-muted-color, #6b7280);
      }
      .logout-link {
        margin-top: 0.5rem;
        background: none;
        border: none;
        color: var(--p-text-muted-color, #6b7280);
        text-decoration: underline;
        cursor: pointer;
        font-size: 0.875rem;
      }
    `,
  ],
})
export class SubscriptionLocked {
  private router = inject(Router);
  private tokenStorage = inject(TokenStorage);
  private authApi = inject(AuthApiService);
  private permissions = inject(PermissionsService);
  private subscriptionStatus = inject(SubscriptionStatusService);

  readonly isOwner = this.tokenStorage.isOwner();

  goToBilling(): void {
    this.router.navigateByUrl('/billing');
  }

  logout(): void {
    this.authApi.logout().subscribe({ next: () => {}, error: () => {} });
    this.tokenStorage.clear();
    this.permissions.clear();
    this.subscriptionStatus.clear();
    this.router.navigateByUrl('/login');
  }
}
