import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';

export type NotificationType = 'LEAD_OVERDUE' | 'LEAD_ASSIGNED' | 'BIRTHDAY_EMPLOYEE' | 'BIRTHDAY_MEMBER' | 'MEMBERSHIP_EXPIRY';
export type NotificationSeverity = 'INFO' | 'WARNING' | 'URGENT';

export interface AppNotification {
  id: string;
  organizationId: string;
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  message: string;
  entityType: string | null;
  entityId: string | null;
  groupKey: string | null;
  read: boolean;
  closedAt: string | null;
  createdAt: string;
}

export interface NotificationSetup {
  id: string;
  organizationId: string;
  enabled: boolean;
  autoCleanDays: number | null;
  soundEnabled: boolean;
}

export interface NotificationConfig {
  id: string;
  organizationId: string;
  type: NotificationType;
  enabled: boolean;
  severity: NotificationSeverity;
  inAppEnabled: boolean;
  emailEnabled: boolean;
  whatsappEnabled: boolean;
  rule: { offsets?: { value: number; unit: 'MINUTES' | 'HOURS' | 'DAYS' }[] } | null;
}

/** Thin wrapper over the NestJS `/api/notifications` endpoints — mirrors
 * the other *ApiService classes in this app. */
@Injectable({ providedIn: 'root' })
export class NotificationApiService {
  private http = inject(HttpClient);
  private base = `${API_BASE_URL}/notifications`;

  list(limit?: number): Observable<AppNotification[]> {
    const url = limit ? `${this.base}?limit=${limit}` : this.base;
    return this.http.get<AppNotification[]>(url);
  }

  unreadGroupCount(): Observable<number> {
    return this.http.get<number>(`${this.base}/unread-group-count`);
  }

  markRead(id: string): Observable<AppNotification> {
    return this.http.patch<AppNotification>(`${this.base}/${id}/read`, {});
  }

  markAllRead(): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${this.base}/read-all`, {});
  }

  close(id: string): Observable<AppNotification> {
    return this.http.patch<AppNotification>(`${this.base}/${id}/close`, {});
  }

  remove(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.base}/${id}`);
  }

  getSetup(): Observable<NotificationSetup> {
    return this.http.get<NotificationSetup>(`${this.base}/setup`);
  }

  updateSetup(payload: Partial<Pick<NotificationSetup, 'enabled' | 'autoCleanDays' | 'soundEnabled'>>): Observable<NotificationSetup> {
    return this.http.patch<NotificationSetup>(`${this.base}/setup`, payload);
  }

  listConfigs(): Observable<NotificationConfig[]> {
    return this.http.get<NotificationConfig[]>(`${this.base}/config`);
  }

  updateConfig(
    type: NotificationType,
    payload: Partial<Pick<NotificationConfig, 'enabled' | 'severity' | 'inAppEnabled' | 'emailEnabled' | 'whatsappEnabled' | 'rule'>>,
  ): Observable<NotificationConfig> {
    return this.http.patch<NotificationConfig>(`${this.base}/config/${type}`, payload);
  }
}
