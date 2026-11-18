import { Component, input, output } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';

import { Branch } from '../../../../../core/branches/branch-api.service';
import { languageLabel, orDash } from '../services/branch.utils';

@Component({
  selector: 'app-branch-card-grid',
  imports: [NzButtonModule, NzIconModule, NzSkeletonModule, NzTagModule, NzTooltipModule],
  template: `
    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
      @if (loading()) {
        @for (i of [1, 2, 3, 4, 5, 6]; track i) {
          <div class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
            <nz-skeleton [nzActive]="true" [nzParagraph]="{ rows: 3 }"></nz-skeleton>
          </div>
        }
      } @else {
        @for (branch of branches(); track branch.id) {
          <div
            class="group relative flex flex-col bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs p-5 transition-all hover:shadow-md hover:border-blue-200 dark:hover:border-blue-900"
            [class.opacity-60]="branch.status !== 'ACTIVE'"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="flex items-center gap-3 min-w-0">
                <span
                  class="flex items-center justify-center w-10 h-10 rounded-full font-bold text-base shrink-0"
                  [class]="branch.isMainBranch
                    ? 'bg-blue-50 text-blue-700 ring-2 ring-blue-400 dark:bg-blue-900/30 dark:text-blue-300'
                    : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'"
                >
                  {{ initials(branch) }}
                </span>
                <div class="min-w-0">
                  <div class="font-semibold text-gray-900 dark:text-white truncate flex items-center gap-1.5">
                    <span nz-icon nzType="environment" class="text-gray-400 shrink-0"></span>
                    <span class="truncate">{{ orDashValue(branch.location) }}</span>
                    @if (branch.isMainBranch) {
                      <nz-tag nzColor="blue" class="!text-[10px] !leading-4 !px-1.5 shrink-0">Main</nz-tag>
                    }
                  </div>
                </div>
              </div>
              <span
                class="px-2.5 py-0.5 rounded-full text-xs font-semibold shrink-0"
                [class]="branch.status === 'ACTIVE'
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                  : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300'"
              >
                {{ branch.status === 'ACTIVE' ? 'Active' : 'Inactive' }}
              </span>
            </div>

            <div class="mt-3 flex flex-col gap-1 text-xs text-gray-500 dark:text-gray-400">
              <span class="flex items-center gap-1.5 truncate"><span nz-icon nzType="mail" class="shrink-0"></span>{{ orDashValue(branch.email) }}</span>
              <span class="flex items-center gap-1.5 truncate"><span nz-icon nzType="phone" class="shrink-0"></span>{{ orDashValue(branch.phone) }}</span>
            </div>

            <div class="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 grid grid-cols-3 gap-2">
              <div>
                <div class="text-sm font-bold text-gray-900 dark:text-white truncate">{{ languageOf(branch) }}</div>
                <div class="text-[10px] uppercase tracking-wide text-gray-400">Language</div>
              </div>
              <div>
                <div class="text-sm font-bold text-gray-900 dark:text-white truncate">{{ taxRateOf(branch) }}</div>
                <div class="text-[10px] uppercase tracking-wide text-gray-400">Tax Rate</div>
              </div>
              <div>
                <div class="text-sm font-bold text-gray-900 dark:text-white truncate">{{ orDashValue(branch.memberCount) }}</div>
                <div class="text-[10px] uppercase tracking-wide text-gray-400">Members</div>
              </div>
            </div>

            @if (canWrite()) {
              <div class="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-1">
                <button nz-button nzType="text" nzShape="circle" nz-tooltip nzTooltipTitle="Edit" (click)="editBranch.emit(branch)">
                  <span nz-icon nzType="edit"></span>
                </button>
                <button
                  nz-button nzType="text" nzShape="circle"
                  [nzDanger]="branch.status === 'ACTIVE'"
                  nz-tooltip
                  [nzTooltipTitle]="branch.status === 'ACTIVE' ? 'Deactivate' : 'Activate'"
                  (click)="toggleStatus.emit(branch)"
                >
                  <span nz-icon [nzType]="branch.status === 'ACTIVE' ? 'stop' : 'check-circle'"></span>
                </button>
              </div>
            }
          </div>
        } @empty {
          <div class="col-span-full flex flex-col items-center justify-center gap-2 py-16 bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 text-gray-400">
            <span nz-icon nzType="bank" class="text-3xl"></span>
            <p class="text-sm m-0">No branches found.</p>
          </div>
        }
      }
    </div>
  `,
  host: { class: 'block w-full' },
})
export class BranchCardGridComponent {
  readonly branches = input.required<Branch[]>();
  readonly loading = input<boolean>(false);
  readonly canWrite = input<boolean>(true);

  readonly editBranch = output<Branch>();
  readonly toggleStatus = output<Branch>();

  orDashValue(value: string | number | null | undefined): string {
    return orDash(value);
  }

  languageOf(branch: Branch): string {
    return languageLabel(branch.defaultLanguage);
  }

  taxRateOf(branch: Branch): string {
    return branch.taxRatePercent !== null && branch.taxRatePercent !== undefined
      ? `${branch.taxRatePercent}%`
      : '-';
  }

  initials(branch: Branch): string {
    return (branch.location || '?').trim().charAt(0).toUpperCase();
  }
}
