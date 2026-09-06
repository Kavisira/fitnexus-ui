import { Injectable, computed, inject, signal } from '@angular/core';

import { Branch, BranchApiService } from './branch-api.service';

/** Shared client-side cache of the org's branch list — same pattern as
 * NotificationStore (core/notifications/notification-store.service.ts):
 * one signal, fetched once and shared by every page that needs it,
 * instead of each page independently calling branchApi.list() in its
 * own ngOnInit (previously 8 separate call sites for data that's the
 * same across all of them and rarely changes). One instance app-wide
 * (providedIn: 'root').
 *
 * Reading: call ensureLoaded() from ngOnInit, then read branches()/
 * activeBranches() — safe to call ensureLoaded() from many components,
 * only the first one actually hits the API.
 *
 * Writing: this store does NOT wrap create/update/activate/deactivate —
 * pages keep calling BranchApiService directly for mutations (unchanged
 * behavior, error handling, toasts). After a mutation succeeds, the
 * page calls reload() so every page sharing this store picks up the
 * change, instead of only the page that made the edit. */
@Injectable({ providedIn: 'root' })
export class BranchStore {
  private api = inject(BranchApiService);

  private branchesSignal = signal<Branch[]>([]);
  loading = signal(false);
  private loadedOnce = false;

  branches = this.branchesSignal.asReadonly();

  // Most dropdowns (Plans, Leads, Members, Employees forms) only want
  // branches you can actually assign things to — INACTIVE ones stay
  // out. The Branches management page itself, and a few
  // whole-org views (Attendance, Expenses, Dashboard), read the raw
  // `branches()` list instead, since they need INACTIVE ones too.
  activeBranches = computed(() => this.branchesSignal().filter((b) => b.status === 'ACTIVE'));

  /** Call once per component, typically in ngOnInit — fetches the list
   * from the server only the first time it's ever called anywhere in
   * the app; every subsequent call (from any component) just reuses
   * the already-loaded signal. Call reload() instead if you need to
   * force a refetch (i.e. right after a mutation). */
  ensureLoaded(): void {
    if (this.loadedOnce) {
      return;
    }
    this.reload();
  }

  /** Forces a refetch from the server and updates the shared signal —
   * call this after any branch create/update/activate/deactivate
   * succeeds, so every page reading this store (not just the one that
   * made the change) sees the latest data. `onError` is optional so a
   * caller that wants its own error toast (e.g. the Branches
   * management page) can still show one; callers that don't care can
   * omit it. */
  reload(onError?: () => void): void {
    this.loading.set(true);
    this.api.list().subscribe({
      next: (branches) => {
        this.loading.set(false);
        this.loadedOnce = true;
        this.branchesSignal.set(branches);
      },
      error: () => {
        // Deliberately NOT marking loadedOnce here — a failed fetch
        // (network blip, brief backend hiccup) should let the next
        // ensureLoaded() call (e.g. the next page the user visits)
        // retry, rather than permanently giving up on ever loading
        // branches for the rest of the session.
        this.loading.set(false);
        onError?.();
      },
    });
  }
}
