import { Injectable, inject, signal } from '@angular/core';
import { LeaveApiService } from '../leave/leave-api.service';
import { PermissionsService } from '../roles/permissions.service';

/**
 * Drives the small count badge on the sidebar's To-Do item. Counts
 * pending items across every category the To-Do page covers — today
 * that's just pending leave requests, but this is the one place to
 * add a second `count += ...` call when a new category (e.g. Review
 * Submissions) joins the To-Do page, so the badge stays a true total
 * instead of each page having to know about the others.
 */
@Injectable({ providedIn: 'root' })
export class TodoBadgeService {
  private leaveApi = inject(LeaveApiService);
  private permissions = inject(PermissionsService);

  pendingCount = signal(0);

  refresh(): void {
    // Only worth asking if this login can even see leave requests —
    // avoids a guaranteed-403 request for roles with no LEAVES access.
    if (!this.permissions.canRead('LEAVES')) {
      this.pendingCount.set(0);
      return;
    }
    this.leaveApi.teamRequests({ status: 'PENDING' }).subscribe({
      next: (requests) => this.pendingCount.set(requests.length),
      error: () => this.pendingCount.set(0),
    });
  }
}
