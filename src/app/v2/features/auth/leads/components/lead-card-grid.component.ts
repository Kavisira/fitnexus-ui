import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';

import { Lead } from '../../../../../core/leads/lead-api.service';
import { concludeInfo, initials, isOverdue, lastNote, orDash, statusColor, statusLabel } from '../services/lead.utils';

@Component({
  selector: 'app-lead-card-grid',
  imports: [CommonModule, NzButtonModule, NzIconModule, NzSkeletonModule, NzTagModule, NzTooltipModule],
  template: `
    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
      @if (loading()) {
        @for (i of [1, 2, 3, 4, 5, 6]; track i) {
          <div class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
            <nz-skeleton [nzActive]="true" [nzParagraph]="{ rows: 3 }"></nz-skeleton>
          </div>
        }
      } @else {
        @for (lead of leads(); track lead.id) {
          <div
            class="group relative flex flex-col bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs p-4 transition-all hover:shadow-md hover:border-blue-200 dark:hover:border-blue-900 cursor-pointer"
            (click)="openDetail.emit(lead)"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="flex items-center gap-2.5 min-w-0">
                <span class="flex items-center justify-center w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold text-sm shrink-0">
                  {{ initialsOf(lead) }}
                </span>
                <div class="min-w-0">
                  <div class="font-semibold text-gray-900 dark:text-white truncate leading-tight">{{ orDashValue(lead.name) }}</div>
                  <div class="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 truncate leading-tight">
                    <span nz-icon nzType="environment" class="shrink-0"></span>
                    <span class="truncate">{{ orDashValue(lead.branch?.location) }}</span>
                  </div>
                </div>
              </div>
              <nz-tag [nzColor]="statusColorOf(lead)" class="!text-xs !m-0 shrink-0">{{ statusLabelOf(lead) }}</nz-tag>
            </div>

            <div class="mt-3 flex flex-col gap-1 text-xs text-gray-500 dark:text-gray-400">
              <span class="flex items-center gap-1.5 truncate"><span nz-icon nzType="phone" class="shrink-0"></span>{{ orDashValue(lead.phone) }}</span>
              <span class="flex items-center gap-1.5 truncate"><span nz-icon nzType="mail" class="shrink-0"></span>{{ orDashValue(lead.email) }}</span>
            </div>

            <div class="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 grid grid-cols-2 gap-2">
              <div class="min-w-0">
                <div class="text-sm font-bold text-gray-900 dark:text-white truncate">{{ orDashValue(lead.source) }}</div>
                <div class="text-[10px] uppercase tracking-wide text-gray-400">Source</div>
              </div>
              <div class="min-w-0">
                <div class="text-sm font-bold text-gray-900 dark:text-white truncate">{{ orDashValue(lead.assignedToEmployee?.name) }}</div>
                <div class="text-[10px] uppercase tracking-wide text-gray-400">Assigned To</div>
              </div>
            </div>

            <div
              class="mt-2 flex items-center gap-1.5 text-xs"
              [class.text-red-600]="isOverdueOf(lead)"
              [class.dark:text-red-400]="isOverdueOf(lead)"
              [class.text-gray-500]="!isOverdueOf(lead)"
              [class.dark:text-gray-400]="!isOverdueOf(lead)"
            >
              <span nz-icon nzType="clock-circle" class="shrink-0"></span>
              <span class="font-semibold shrink-0">{{ isOverdueOf(lead) ? 'Overdue' : 'Next follow-up' }}:</span>
              <span class="truncate">{{ lead.nextFollowUpAt ? (lead.nextFollowUpAt | date: 'MMM d, y · h:mm a') : '-' }}</span>
            </div>

            @if (concludeInfoOf(lead); as comment) {
              <div
                class="mt-2 flex items-start gap-1.5 text-xs rounded-lg px-2 py-1.5"
                [class]="lead.status === 'LOST'
                  ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300'
                  : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300'"
              >
                <span nz-icon [nzType]="lead.status === 'LOST' ? 'close-circle' : 'check-circle'" class="shrink-0 mt-0.5"></span>
                <span class="line-clamp-2">{{ comment }}</span>
              </div>
            } @else if (lastNoteOf(lead); as note) {
              <div class="mt-2 flex items-start gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <span nz-icon nzType="file-text" class="shrink-0 mt-0.5"></span>
                <span class="line-clamp-2">{{ note }}</span>
              </div>
            }

            <div class="mt-3 pt-2.5 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-1">
              <button nz-button nzType="text" nzShape="circle" nz-tooltip nzTooltipTitle="Follow-up History" (click)="$event.stopPropagation(); openHistory.emit(lead)">
                <span nz-icon nzType="clock-circle"></span>
              </button>
              @if (canWrite()) {
                <button nz-button nzType="text" nzShape="circle" nz-tooltip nzTooltipTitle="View / Edit" (click)="$event.stopPropagation(); openDetail.emit(lead)">
                  <span nz-icon nzType="edit"></span>
                </button>
                <button nz-button nzType="text" nzShape="circle" nzDanger nz-tooltip nzTooltipTitle="Delete" (click)="$event.stopPropagation(); deleteLead.emit(lead)">
                  <span nz-icon nzType="delete"></span>
                </button>
              }
            </div>
          </div>
        } @empty {
          <div class="col-span-full flex flex-col items-center justify-center gap-2 py-16 bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 text-gray-400">
            <span nz-icon nzType="user-add" class="text-3xl"></span>
            <p class="text-sm m-0">No leads found.</p>
          </div>
        }
      }
    </div>
  `,
  host: { class: 'block w-full' },
})
export class LeadCardGridComponent {
  readonly leads = input.required<Lead[]>();
  readonly loading = input<boolean>(false);
  readonly canWrite = input<boolean>(true);

  readonly openDetail = output<Lead>();
  readonly openHistory = output<Lead>();
  readonly deleteLead = output<Lead>();

  orDashValue(value: string | number | null | undefined): string {
    return orDash(value);
  }

  initialsOf(lead: Lead): string {
    return initials(lead);
  }

  statusLabelOf(lead: Lead): string {
    return statusLabel(lead.status);
  }

  statusColorOf(lead: Lead) {
    return statusColor(lead.status);
  }

  isOverdueOf(lead: Lead): boolean {
    return isOverdue(lead);
  }

  concludeInfoOf(lead: Lead): string | null {
    return concludeInfo(lead);
  }

  lastNoteOf(lead: Lead): string | null {
    return lastNote(lead);
  }
}
