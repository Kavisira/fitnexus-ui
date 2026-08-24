import { Injectable, OnDestroy, inject } from '@angular/core';
import { Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';

import { API_BASE_URL } from '../config/api.config';
import { TokenStorage } from '../auth/token-storage.service';
import { AppNotification } from './notification-api.service';

// The gateway lives on the same host as the REST API, just without the
// "/api" prefix (that's an HTTP-only routing prefix, not part of the
// WebSocket namespace path).
const SOCKET_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, '');

/** Owns the single Socket.IO connection to the notifications gateway.
 * Connects lazily (on first subscribe from NotificationStore, once the
 * user is logged in) rather than at app bootstrap. */
@Injectable({ providedIn: 'root' })
export class NotificationSocketService implements OnDestroy {
  private tokenStorage = inject(TokenStorage);
  private socket: Socket | null = null;

  private notification$ = new Subject<AppNotification>();

  connect(): void {
    if (this.socket?.connected) {
      return;
    }
    const token = this.tokenStorage.get();
    if (!token) {
      return;
    }

    this.socket = io(`${SOCKET_BASE_URL}/notifications`, {
      auth: { token },
      transports: ['websocket'],
    });

    this.socket.on('notification', (notification: AppNotification) => {
      this.notification$.next(notification);
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  onNotification() {
    return this.notification$.asObservable();
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
