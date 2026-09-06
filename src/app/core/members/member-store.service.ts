import { Injectable, inject, signal } from '@angular/core';

import { Member, MemberApiService, MemberFilters } from './member-api.service';

/** Holds the Members page's paginated data — moved out of the
 * component and into an injectable service so the same loading state
 * and fetch logic could be reused by another page later, without
 * duplicating it.
 *
 * IMPORTANT — this is NOT the same caching pattern as BranchStore/
 * EmployeeStore. Those hold a small, rarely-changing list fetched once
 * and reused everywhere. Members can run into the thousands per
 * organization and changes constantly (signups, edits, check-ins), so
 * caching "all members" would reintroduce the exact unbounded-fetch
 * problem the Members pagination work was built to fix. This store
 * still fetches one page at a time, on every filter/page change,
 * exactly like the component did before — it's a relocation of state
 * and fetch logic, not a switch to fetch-once caching. The one
 * exception is `allMembers`, a capped (500) full-roster fetch used
 * only for the couple-partner picker dropdown, which already worked
 * this way before the move and is refreshed after every save rather
 * than cached long-term. */
@Injectable({ providedIn: 'root' })
export class MemberStore {
  private api = inject(MemberApiService);

  members = signal<Member[]>([]);
  total = signal(0);
  loading = signal(false);

  // See the class doc comment — capped full-roster fetch for the
  // couple-partner picker only, not a general-purpose cache.
  allMembers = signal<Member[]>([]);

  /** Fetches one page of members matching `filters` and updates
   * `members`/`total`. Called on every page/filter/search change —
   * this is a real network request each time, unlike
   * BranchStore/EmployeeStore's ensureLoaded(). `onError` lets the
   * caller show its own toast. */
  load(filters: MemberFilters, onError?: () => void): void {
    this.loading.set(true);
    this.api.list(filters).subscribe({
      next: (result) => {
        this.loading.set(false);
        this.members.set(result.data);
        this.total.set(result.total);
      },
      error: () => {
        this.loading.set(false);
        onError?.();
      },
    });
  }

  /** Fetches the capped (500) full org roster for the couple-partner
   * picker — see the `allMembers` doc comment above. Deliberately
   * silent on error (falls back to an empty picker list) since this is
   * a secondary, non-blocking dropdown feed, not the main list. */
  loadAll(): void {
    this.api.list({ page: 1, pageSize: 500 }).subscribe({
      next: (result) => this.allMembers.set(result.data),
      error: () => {
        // Non-fatal — partner picker just shows no options.
      },
    });
  }
}
