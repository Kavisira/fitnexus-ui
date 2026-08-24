import { Component, ElementRef, HostListener, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';

import { NotificationStore, NotificationCategory } from '../../core/notifications/notification-store.service';
import { AppNotification, NotificationSeverity } from '../../core/notifications/notification-api.service';
import { TranslationService } from '../../core/i18n/translation.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { NotificationViewAll } from '../notification-view-all/notification-view-all';

const CATEGORY_ICON: Record<NotificationCategory, string> = {
  LEADS: 'pi pi-user-plus',
  BIRTHDAYS: 'pi pi-heart-fill',
  RENEWALS: 'pi pi-refresh',
};

const CATEGORY_LABEL_KEY: Record<NotificationCategory, string> = {
  LEADS: 'notifications.categoryLeads',
  BIRTHDAYS: 'notifications.categoryBirthdays',
  RENEWALS: 'notifications.categoryRenewals',
};

/**
 * Bell icon + unread badge + dropdown panel, dropped into the header.
 * Hand-rolled overlay (not PrimeNG's popover/overlaypanel) rather than
 * risk another API-naming mismatch like earlier in this project — a
 * plain absolute-positioned panel toggled by a signal is enough here.
 */
@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [CommonModule, ButtonModule, TooltipModule, TranslatePipe, NotificationViewAll],
  templateUrl: './notification-bell.html',
  styleUrls: ['./notification-bell.css'],
})
export class NotificationBell {
  private el = inject(ElementRef);
  private i18n = inject(TranslationService);

  store = inject(NotificationStore);

  open = signal(false);
  expanded = signal<Set<NotificationCategory>>(new Set());
  viewAllVisible = signal(false);

  // Brief shake/pulse animation whenever a new notification arrives —
  // watches the store's bellPulse counter rather than the notification
  // list itself, so a batch of several arrivals (e.g. the cron firing
  // for 5 birthdays at once) only pulses once per store update, not
  // once per item.
  shaking = signal(false);

  constructor() {
    effect(() => {
      this.store.bellPulse(); // track it
      if (!this.store.loaded()) {
        return; // don't animate on the very first load
      }
      this.shaking.set(true);
      setTimeout(() => this.shaking.set(false), 600);
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.open() && !this.el.nativeElement.contains(event.target)) {
      this.open.set(false);
    }
  }

  toggleOpen(): void {
    this.open.update((v) => !v);
  }

  toggleCategory(category: NotificationCategory): void {
    this.expanded.update((set) => {
      const next = new Set(set);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }

  isExpanded(category: NotificationCategory): boolean {
    return this.expanded().has(category);
  }

  categoryIcon(category: NotificationCategory): string {
    return CATEGORY_ICON[category];
  }

  categoryLabel(category: NotificationCategory): string {
    return this.i18n.t(CATEGORY_LABEL_KEY[category]);
  }

  severityClass(severity: NotificationSeverity): string {
    return `severity-${severity.toLowerCase()}`;
  }

  onNotificationClick(notification: AppNotification): void {
    if (!notification.read) {
      this.store.markRead(notification.id);
    }
  }

  deleteNotification(event: Event, notification: AppNotification): void {
    event.stopPropagation();
    this.store.remove(notification.id);
  }

  markAllRead(): void {
    this.store.markAllRead();
  }

  openViewAll(): void {
    this.open.set(false);
    this.viewAllVisible.set(true);
  }
}
