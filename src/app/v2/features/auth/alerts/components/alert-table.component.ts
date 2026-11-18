import { Component, input, output } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';

import { Alert } from '../../../../../core/alerts/alerts-api.service';

@Component({
  selector: 'app-alert-table',
  imports: [NzButtonModule, NzIconModule, NzTableModule, NzTooltipModule],
  template: `
    <div class="flex flex-col flex-1 min-h-0 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs overflow-hidden max-w-full">
      <!-- Only the table body scrolls; header is sticky (see v2/shared/styles/data-table.css) -->
<div class="v2-data-table flex-1 min-h-0 overflow-auto w-full">
        <nz-table
          [nzData]="alerts()"
          [nzLoading]="loading()"
          [nzShowPagination]="false"
          [nzFrontPagination]="false"
          [nzNoResult]="empty"
          class="w-full text-left"
        >
          <thead>
            <tr class="text-xs uppercase font-semibold text-gray-500 dark:text-gray-400">
              <th class="py-3 px-4 min-w-56">Alert</th>
              <th class="py-3 px-3 w-48 hidden md:table-cell">Audience</th>
              <th class="py-3 px-3 w-56 hidden sm:table-cell">Window</th>
              <th nzAlign="center" class="py-3 px-3 w-28">Status</th>
              <th nzAlign="right" class="py-3 px-4 w-28">Actions</th>
            </tr>
          </thead>
          <tbody class="text-sm">
            @for (a of alerts(); track a.id) {
              <tr class="hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors">
                <td class="py-3 px-4">
                  <div class="font-semibold text-gray-900 dark:text-white truncate">{{ a.title }}</div>
                  <div class="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">{{ a.message }}</div>
                </td>
                <td class="py-3 px-3 hidden md:table-cell">
                  <span class="inline-flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
                    <span nz-icon [nzType]="audienceIcon(a)"></span>{{ audienceLabel(a) }}
                  </span>
                </td>
                <td class="py-3 px-3 hidden sm:table-cell text-xs text-gray-600 dark:text-gray-300 whitespace-nowrap">{{ windowLabel(a) }}</td>
                <td nzAlign="center" class="py-3 px-3">
                  <span
                    class="px-2.5 py-0.5 rounded-full text-xs font-semibold inline-block"
                    [class]="a.isActive
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'"
                  >
                    {{ a.isActive ? 'Active' : 'Inactive' }}
                  </span>
                </td>
                <td nzAlign="right" class="py-3 px-4 whitespace-nowrap">
                  <button nz-button nzType="text" nzShape="circle" nz-tooltip nzTooltipTitle="Edit" (click)="editAlert.emit(a)">
                    <span nz-icon nzType="edit"></span>
                  </button>
                  <button nz-button nzType="text" nzShape="circle" nzDanger nz-tooltip nzTooltipTitle="Delete" (click)="deleteAlert.emit(a)">
                    <span nz-icon nzType="delete"></span>
                  </button>
                </td>
              </tr>
            }
          </tbody>
        </nz-table>
        <ng-template #empty>
          <div class="flex flex-col items-center gap-2 py-10 text-gray-400">
            <span nz-icon nzType="notification" class="text-3xl"></span>
            <span class="text-sm">No login alerts configured yet.</span>
          </div>
        </ng-template>
      </div>
    </div>
  `,
  // min-h-80 keeps the table usable on short screens (the page scrolls instead).
  host: { class: 'flex flex-col flex-1 min-h-80 w-full' },
})
export class AlertTableComponent {
  readonly alerts = input.required<Alert[]>();
  readonly loading = input<boolean>(false);

  readonly editAlert = output<Alert>();
  readonly deleteAlert = output<Alert>();

  windowLabel(a: Alert): string {
    const start = new Date(a.startDate).toLocaleDateString();
    return `${start} → ${a.endDate ? new Date(a.endDate).toLocaleDateString() : 'No end date'}`;
  }

  audienceLabel(a: Alert): string {
    if (a.audienceType === 'BRANCH') return a.audienceBranch?.location ?? 'One branch';
    if (a.audienceType === 'USER') return a.audienceUser?.name ?? 'One user';
    return 'Everyone';
  }

  audienceIcon(a: Alert): string {
    if (a.audienceType === 'BRANCH') return 'branches';
    if (a.audienceType === 'USER') return 'user';
    return 'team';
  }
}
