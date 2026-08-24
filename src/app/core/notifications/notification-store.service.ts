import { Injectable, computed, inject, signal } from '@angular/core';

import { AppNotification, NotificationApiService, NotificationType } from './notification-api.service';
import { NotificationSocketService } from './notification-socket.service';
import { ToastService } from '../toast/toast.service';

export type NotificationCategory = 'LEADS' | 'BIRTHDAYS' | 'RENEWALS';

const CATEGORY_BY_TYPE: Record<NotificationType, NotificationCategory> = {
  LEAD_OVERDUE: 'LEADS',
  LEAD_ASSIGNED: 'LEADS',
  BIRTHDAY_EMPLOYEE: 'BIRTHDAYS',
  BIRTHDAY_MEMBER: 'BIRTHDAYS',
  MEMBERSHIP_EXPIRY: 'RENEWALS',
};

export interface NotificationGroup {
  category: NotificationCategory;
  items: AppNotification[];
  unreadCount: number;
}

/** Central client-side store for notifications — fetches the initial
 * list over REST, then keeps it current via the WebSocket push, and
 * exposes everything the bell/dropdown/settings screens need as
 * signals. One instance app-wide (providedIn: 'root'). */
@Injectable({ providedIn: 'root' })
export class NotificationStore {
  private api = inject(NotificationApiService);
  private socket = inject(NotificationSocketService);
  private toast = inject(ToastService);

  notifications = signal<AppNotification[]>([]);
  loaded = signal(false);

  // Bumped on every new arrival — the bell icon watches this to trigger
  // its shake/pulse animation without needing to know anything else.
  bellPulse = signal(0);

  groups = computed<NotificationGroup[]>(() => {
    const byCategory = new Map<NotificationCategory, AppNotification[]>();
    for (const n of this.notifications()) {
      const category = CATEGORY_BY_TYPE[n.type];
      const list = byCategory.get(category) ?? [];
      list.push(n);
      byCategory.set(category, list);
    }
    return Array.from(byCategory.entries()).map(([category, items]) => ({
      category,
      items: items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
      unreadCount: items.filter((n) => !n.read).length,
    }));
  });

  // Bell badge = number of groups with at least one unread notification
  // — NOT the total notification count (see product discussion).
  unreadGroupCount = computed(() => this.groups().filter((g) => g.unreadCount > 0).length);

  // Org-wide master switch — the header hides the bell entirely (not
  // just an empty dropdown) while this is false. Defaults true so the
  // bell doesn't flicker in/out before the setup call resolves.
  enabled = signal(true);

  private started = false;

  /** Call once, after login (or on app init if already logged in) —
   * loads the initial list/setup and opens the live socket connection. */
  start(): void {
    if (this.started) {
      return;
    }
    this.started = true;

    this.api.getSetup().subscribe({
      next: (setup) => this.enabled.set(setup.enabled),
      error: () => {},
    });

    this.api.list().subscribe({
      next: (list) => {
        this.notifications.set(list);
        this.loaded.set(true);
      },
      error: () => this.loaded.set(true),
    });

    this.socket.connect();
    this.socket.onNotification().subscribe((notification) => this.handleIncoming(notification));
  }

  /** Call on logout — drops the socket and clears local state so the
   * next login starts clean. */
  stop(): void {
    this.started = false;
    this.socket.disconnect();
    this.notifications.set([]);
    this.loaded.set(false);
  }

  private handleIncoming(notification: AppNotification): void {
    this.notifications.update((list) => [notification, ...list]);
    this.bellPulse.update((n) => n + 1);

    const toastFn =
      notification.severity === 'URGENT' ? this.toast.error : notification.severity === 'WARNING' ? this.toast.warn : this.toast.info;
    toastFn.call(this.toast, notification.message, notification.title);
  }

  markRead(id: string): void {
    // Optimistic — the dropdown should feel instant.
    this.notifications.update((list) => list.map((n) => (n.id === id ? { ...n, read: true } : n)));
    this.api.markRead(id).subscribe({ error: () => this.refresh() });
  }

  markAllRead(): void {
    this.notifications.update((list) => list.map((n) => ({ ...n, read: true })));
    this.api.markAllRead().subscribe({ error: () => this.refresh() });
  }

  /** Manual delete — backend enforces read-before-delete; call
   * markRead first if needed. */
  remove(id: string): void {
    this.notifications.update((list) => list.filter((n) => n.id !== id));
    this.api.remove(id).subscribe({ error: () => this.refresh() });
  }

  /** Bulk delete every already-read notification — used by the "view
   * all" screen's clear button. Unread ones are left alone (same
   * read-before-delete rule as a single manual delete). */
  removeAllRead(): void {
    const readIds = this.notifications().filter((n) => n.read).map((n) => n.id);
    if (!readIds.length) {
      return;
    }
    this.notifications.update((list) => list.filter((n) => !n.read));
    readIds.forEach((id) => this.api.remove(id).subscribe({ error: () => this.refresh() }));
  }

  private refresh(): void {
    this.api.list().subscribe((list) => this.notifications.set(list));
  }
}
