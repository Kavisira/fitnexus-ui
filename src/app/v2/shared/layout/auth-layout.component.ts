import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { V2HeaderComponent } from './header/header.component';
import { V2SidebarComponent } from './sidebar/sidebar.component';
import { LoginAlertsModalComponent } from '../components/login-alerts/login-alerts-modal.component';
import { NotificationStore } from '../../../core/notifications/notification-store.service';
import { TourService } from '../../../core/tour/tour.service';

@Component({
  selector: 'app-v2-auth-layout',
  imports: [RouterOutlet, V2HeaderComponent, V2SidebarComponent, LoginAlertsModalComponent],
  template: `
    <div class="flex h-screen max-h-screen w-full max-w-full overflow-hidden bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <!-- Login announcements: all pending alerts in one list modal -->
      <app-login-alerts-modal></app-login-alerts-modal>

      <!-- Collapsible Navigation Sidebar -->
      <app-v2-sidebar></app-v2-sidebar>

      <!-- Main Application Surface -->
      <div class="flex flex-col flex-1 min-w-0 max-w-full h-full overflow-hidden">
        <app-v2-header></app-v2-header>

        <!-- Routed Page Content Container (strictly vertical scroll only) -->
        <main class="flex-1 min-h-0 min-w-0 max-w-full overflow-y-auto overflow-x-hidden p-4 sm:p-6 flex flex-col">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `,
  host: {
    class: 'block w-full h-full max-w-full max-h-screen overflow-hidden',
  },
})
export class V2AuthLayoutComponent implements OnInit, OnDestroy {
  private notificationStore = inject(NotificationStore);
  private tour = inject(TourService);

  ngOnInit(): void {
    this.notificationStore.start();
    this.tour.maybeStart();
  }

  ngOnDestroy(): void {
    this.notificationStore.stop();
  }
}
