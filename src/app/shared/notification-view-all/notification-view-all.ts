import { Component, inject, model, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';

import { NotificationStore, NotificationCategory } from '../../core/notifications/notification-store.service';
import { AppNotification, NotificationSeverity } from '../../core/notifications/notification-api.service';
import { TranslationService } from '../../core/i18n/translation.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

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

/** The large "view all notifications" dialog — same grouped structure
 * as the bell dropdown, but with room to actually browse full history
 * plus bulk actions (mark all read, clear all read). Reads off the same
 * NotificationStore the dropdown does, so no separate fetch is needed —
 * the store already loads the complete active list on start(). */
@Component({
  selector: 'app-notification-view-all',
  standalone: true,
  imports: [CommonModule, DialogModule, ButtonModule, TooltipModule, TranslatePipe],
  templateUrl: './notification-view-all.html',
  styleUrls: ['./notification-view-all.css'],
})
export class NotificationViewAll {
  visible = model(false);

  private i18n = inject(TranslationService);
  store = inject(NotificationStore);

  // All expanded by default here (unlike the compact dropdown) — the
  // whole point of this screen is browsing, not a quick glance.
  collapsed = signal<Set<NotificationCategory>>(new Set());

  toggleCategory(category: NotificationCategory): void {
    this.collapsed.update((set) => {
      const next = new Set(set);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }

  isCollapsed(category: NotificationCategory): boolean {
    return this.collapsed().has(category);
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

  clearAllRead(): void {
    this.store.removeAllRead();
  }

  close(): void {
    this.visible.set(false);
  }
}
