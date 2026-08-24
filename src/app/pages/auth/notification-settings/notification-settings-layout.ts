import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { TranslatePipe } from '../../../core/i18n/translate.pipe';

/**
 * Shell for the Notifications section — Setup and Configuration are two
 * tabs on the same page, each backed by its own route (so either can be
 * linked/bookmarked directly), rather than local tab state on one route.
 */
@Component({
  selector: 'app-notification-settings-layout',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, TranslatePipe],
  templateUrl: './notification-settings-layout.html',
  styleUrls: ['./notification-settings-layout.css'],
})
export class NotificationSettingsLayout {}
