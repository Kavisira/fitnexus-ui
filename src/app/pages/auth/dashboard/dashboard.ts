import { Component } from '@angular/core';
import { CardModule } from 'primeng/card';

import { TranslatePipe } from '../../../core/i18n/translate.pipe';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CardModule, TranslatePipe],
  template: `
    <div class="dashboard-page">
      <h1>{{ 'dashboard.title' | translate }}</h1>
      <p class="subtitle">{{ 'dashboard.subtitle' | translate }}</p>

      <div class="stat-grid">
        <p-card [header]="'dashboard.activeMembers' | translate">
          <div class="stat-value">—</div>
        </p-card>
        <p-card [header]="'dashboard.todaysCheckins' | translate">
          <div class="stat-value">—</div>
        </p-card>
        <p-card [header]="'dashboard.revenueThisMonth' | translate">
          <div class="stat-value">—</div>
        </p-card>
        <p-card [header]="'dashboard.upcomingRenewals' | translate">
          <div class="stat-value">—</div>
        </p-card>
      </div>
    </div>
  `,
  styles: [
    `
      .dashboard-page { display: flex; flex-direction: column; gap: 0.5rem; }
      h1 { margin: 0; font-size: 1.5rem; }
      .subtitle { margin: 0 0 1rem; color: var(--p-text-muted-color, #6b7280); }
      .stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; }
      .stat-value { font-size: 1.75rem; font-weight: 700; }
    `,
  ],
})
export class Dashboard {}
