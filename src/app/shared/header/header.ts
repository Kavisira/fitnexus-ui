import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { PageHeaderService } from '../page-header/page-header.service';
import { ThemeToggle } from '../theme-toggle/theme-toggle';
import { NotificationBell } from '../notification-bell/notification-bell';
import { NotificationStore } from '../../core/notifications/notification-store.service';
import { SidebarStateService } from '../sidebar/sidebar-state.service';

/**
 * Slim content-area top bar: a single nav-toggle button on the left
 * (collapses/expands the sidebar on desktop, opens it as a drawer on
 * mobile — see SidebarStateService), the current page's title centered,
 * and help / notifications / theme toggle on the right. The brand and
 * the user's own identity (profile menu, logout) live in the sidebar
 * instead — see shared/sidebar — since this bar sits inside the
 * content column, not across the full app width.
 */
@Component({
  selector: 'app-header',
  standalone: true,
  imports: [ButtonModule, TooltipModule, ThemeToggle, NotificationBell, TranslatePipe],
  templateUrl: './header.html',
  styleUrls: ['./header.css'],
})
export class Header {
  private router = inject(Router);
  pageHeader = inject(PageHeaderService);
  notificationStore = inject(NotificationStore);
  sidebarState = inject(SidebarStateService);

  openHelp(): void {
    this.router.navigateByUrl('/help');
  }
}
