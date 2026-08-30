import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { Header } from '../../../shared/header/header';
import { Sidenav } from '../../../shared/sidenav/sidenav';
import { NotificationStore } from '../../../core/notifications/notification-store.service';
import { LoginAlerts } from '../../../shared/login-alerts/login-alerts';

/**
 * Shell layout for authenticated (logged-in) areas of the app: header
 * (theme toggle, profile/logout) + collapsible sidenav (Dashboard,
 * Branches, Members, Employees, Leads, Attendance) + routed content.
 */
@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [RouterOutlet, Header, Sidenav, LoginAlerts],
  templateUrl: './layout.html',
  styleUrls: ['./layout.css'],
})
export class Layout implements OnInit, OnDestroy {
  private notificationStore = inject(NotificationStore);

  // Desktop: collapses the sidenav to an icon-only rail (still part of
  // the layout, pushes content over).
  sidebarCollapsed = signal(false);

  // Mobile (see the media query in sidenav.css): the sidenav is hidden
  // off-screen by default and slides in as an overlay above the content,
  // with a dimmed backdrop behind it, instead of taking up layout space.
  mobileNavOpen = signal(false);

  // Same hamburger button drives both — on a desktop-width screen only
  // the collapse toggle visually matters, on a mobile-width screen only
  // the overlay-open toggle does (the media query hides the other
  // behavior's effect).
  toggleSidebar(): void {
    this.sidebarCollapsed.update((v) => !v);
    this.mobileNavOpen.update((v) => !v);
  }

  closeMobileNav(): void {
    this.mobileNavOpen.set(false);
  }

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
