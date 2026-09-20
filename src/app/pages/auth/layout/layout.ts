import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { Header } from '../../../shared/header/header';
import { Sidebar } from '../../../shared/sidebar/sidebar';
import { NotificationStore } from '../../../core/notifications/notification-store.service';
import { LoginAlerts } from '../../../shared/login-alerts/login-alerts';

/**
 * Shell layout for authenticated (logged-in) areas of the app:
 * collapsible left sidebar (brand, grouped nav, profile/logout) + a
 * content column with a slim top bar (page title, help, notifications,
 * theme toggle) above the routed page content. Replaces the earlier
 * header + horizontal top-nav layout — see the nav redesign discussion
 * ("Option A: collapsible sidebar") this was built from.
 */
@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [RouterOutlet, Header, Sidebar, LoginAlerts],
  templateUrl: './layout.html',
  styleUrls: ['./layout.css'],
})
export class Layout implements OnInit, OnDestroy {
  private notificationStore = inject(NotificationStore);

  ngOnInit(): void {
    // Only ever reached once actually logged in (this layout sits
    // behind the auth guard) — safe to open the notifications
    // connection here rather than at app bootstrap.
    this.notificationStore.start();
  }

  ngOnDestroy(): void {
    this.notificationStore.stop();
  }
}
