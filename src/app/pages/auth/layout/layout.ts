import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { Header } from '../../../shared/header/header';
import { Sidebar } from '../../../shared/sidebar/sidebar';
import { NotificationStore } from '../../../core/notifications/notification-store.service';
import { LoginAlerts } from '../../../shared/login-alerts/login-alerts';
import { TourService } from '../../../core/tour/tour.service';

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
  private tour = inject(TourService);

  ngOnInit(): void {
    // Only ever reached once actually logged in (this layout sits
    // behind the auth guard) — safe to open the notifications
    // connection here rather than at app bootstrap.
    this.notificationStore.start();
    // No-ops for a staff login or if this Owner has already seen it
    // (see TourService) — otherwise walks them through the sidenav
    // once, right after the permission matrix (and firstBranchGuard,
    // if this is a brand-new org) has already settled.
    this.tour.maybeStart();
  }

  ngOnDestroy(): void {
    this.notificationStore.stop();
  }
}
