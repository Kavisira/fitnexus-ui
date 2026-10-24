import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { driver, DriveStep } from 'driver.js';

import { TokenStorage } from '../auth/token-storage.service';
import { PermissionsService } from '../roles/permissions.service';

const STORAGE_PREFIX = 'fitnexus-tour-seen:';

/** First-login guided walkthrough, built on driver.js (free/MIT,
 * zero-dependency — see the sidebar's `data-tour="nav-<SCREEN>"`
 * attributes this targets). Runs at most once per user: "seen" is
 * tracked in localStorage keyed by the user's own id, so it survives
 * refreshes/new tabs but is purely a per-browser convenience, not
 * synced across devices — same tradeoff as every other localStorage
 * use in this app (see the Artifact browser-storage rules this
 * mirrors for the Angular app itself). A user can always re-trigger
 * it manually via replay() (wire this up to a "Show tour again" link
 * in Settings/Help whenever that's added).
 *
 * Steps that need a screen the user can't actually read (per the
 * permission matrix) are skipped rather than shown pointing at
 * nothing — see buildSteps(). */
@Injectable({ providedIn: 'root' })
export class TourService {
  private router = inject(Router);
  private tokenStorage = inject(TokenStorage);
  private permissions = inject(PermissionsService);

  private storageKey(): string | null {
    const email = this.tokenStorage.getEmail();
    return email ? `${STORAGE_PREFIX}${email}` : null;
  }

  private hasSeen(): boolean {
    const key = this.storageKey();
    if (!key) return true; // no identifiable user — don't show, don't crash
    try {
      return localStorage.getItem(key) === '1';
    } catch {
      return true;
    }
  }

  private markSeen(): void {
    const key = this.storageKey();
    if (!key) return;
    try {
      localStorage.setItem(key, '1');
    } catch {
      // Private window / blocked storage — fine to just skip persisting.
    }
  }

  /** Call once from Layout's ngOnInit. No-ops if already seen, if this
   * is a staff (non-Owner) login (the tour is written for the Owner's
   * first-time setup flow), or if browser storage isn't available. */
  maybeStart(): void {
    if (!this.tokenStorage.isOwner()) {
      return;
    }
    this.start();
  }

  /** Manually re-run the tour regardless of "seen" state. */
  replay(): void {
    this.start();
  }

  private start(): void {
    // The whole thing — buildSteps() included, not just drive() — has
    // to wait a tick: buildSteps() itself does the `document.querySelector`
    // lookups that decide which steps even exist (see step() below), and
    // right when Layout.ngOnInit() fires, the sidenav hasn't painted its
    // nav items into the DOM yet. Building the steps immediately found
    // nothing for every selector-based step (Dashboard, Branches, ...)
    // and silently dropped them all, leaving only the selector-less
    // Welcome step — so the tour looked like it "only had one step".
    // Delaying buildSteps() itself (not just drive()) is what actually
    // fixes that.
    setTimeout(() => {
      const steps = this.buildSteps();
      if (!steps.length) return;

      const d = driver({
        showProgress: true,
        allowClose: true,
        overlayOpacity: 0.55,
        steps,
        onDestroyStarted: () => {
          this.markSeen();
          d.destroy();
        },
        onPopoverRender: undefined,
      });

      d.drive();
    }, 150);
  }

  private step(selectorOrNone: string | null, title: string, description: string, side: 'left' | 'right' | 'top' | 'bottom' = 'right'): DriveStep | null {
    if (selectorOrNone) {
      const el = document.querySelector(selectorOrNone);
      if (!el) return null; // screen hidden by permissions, or not rendered — skip, don't point at nothing
      return { element: selectorOrNone, popover: { title, description, side, align: 'start' } };
    }
    return { popover: { title, description } };
  }

  private buildSteps(): DriveStep[] {
    const canRead = (screen: string) => this.permissions.canRead(screen as never);

    const candidates: Array<[string | null, string, string]> = [
      [null, 'Welcome to FitNexus 👋', "Let's take a quick look around before you get started. You can skip this anytime."],
      ['[data-tour="nav-DASHBOARD"]', 'Dashboard', 'Your at-a-glance view of the gym — members, revenue, and activity.'],
      ['[data-tour="nav-BRANCHES"]', 'Branches', 'Start here — create your first branch. Most other screens (Members, Employees) need at least one branch to work with.'],
      ['[data-tour="nav-MEMBERS"]', 'Members', 'Add and manage your gym members, their plans, and check-ins here.'],
      ['[data-tour="nav-EMPLOYEES"]', 'Employees', "Add your staff here, and create their logins so they can use FitNexus themselves."],
      ['[data-tour="nav-PLANS"]', 'Plans & Offers', 'Define your membership plans and any offers before adding members.'],
      ['[data-tour="nav-ATTENDANCE"]', 'Attendance', 'Track staff attendance, punches, and biometric devices here.'],
      ['[data-tour="nav-NOTIFICATIONS"]', 'Notifications', 'Configure WhatsApp/notification alerts for your team here.'],
    ];

    const steps: DriveStep[] = [];
    for (const [selector, title, description] of candidates) {
      if (selector) {
        const screen = selector.match(/nav-([A-Z_]+)/)?.[1];
        if (screen && !canRead(screen)) continue;
      }
      const built = this.step(selector, title, description);
      if (built) steps.push(built);
    }
    return steps;
  }
}
