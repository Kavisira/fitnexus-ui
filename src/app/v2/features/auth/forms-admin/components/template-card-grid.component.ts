import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';

import { FormTemplate } from '../../../../../core/forms/form-api.service';
import { orDash } from '../services/forms-admin.utils';

@Component({
  selector: 'app-template-card-grid',
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
        @for (t of templates(); track t.id) {
          <div
            class="group relative flex flex-col bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs p-4 transition-all hover:shadow-md hover:border-blue-200 dark:hover:border-blue-900"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="flex items-center gap-2.5 min-w-0">
                <span class="flex items-center justify-center w-9 h-9 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 shrink-0">
                  <span nz-icon nzType="solution" class="!text-base"></span>
                </span>
                <div class="min-w-0">
                  <div class="font-semibold text-gray-900 dark:text-white truncate leading-tight">{{ t.name }}</div>
                  <div class="text-xs text-gray-500 dark:text-gray-400 truncate leading-tight">{{ orDashValue(t.description) }}</div>
                </div>
              </div>
            </div>

            <div class="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 grid grid-cols-2 gap-2">
              <div class="min-w-0">
                <div class="text-sm font-bold text-gray-900 dark:text-white truncate">{{ t.fields.length }}</div>
                <div class="text-[10px] uppercase tracking-wide text-gray-400">Field(s)</div>
              </div>
              <div class="min-w-0">
                <div class="text-sm font-bold text-gray-900 dark:text-white truncate">{{ t._count?.shareLinks ?? 0 }}</div>
                <div class="text-[10px] uppercase tracking-wide text-gray-400">Link(s) sent</div>
              </div>
            </div>

            <div class="mt-3 pt-2.5 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-1">
              <button nz-button nzType="text" nzShape="circle" nz-tooltip nzTooltipTitle="Results" (click)="openResults.emit(t)">
                <span nz-icon nzType="bar-chart"></span>
              </button>
              @if (canWrite()) {
                <button nz-button nzType="text" nzShape="circle" nz-tooltip nzTooltipTitle="Send to member" (click)="openGenerateLink.emit(t)">
                  <span nz-icon nzType="qrcode"></span>
                </button>
              }
            </div>
          </div>
        } @empty {
          <div class="col-span-full flex flex-col items-center justify-center gap-2 py-16 bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 text-gray-400">
            <span nz-icon nzType="solution" class="text-3xl"></span>
            <p class="text-sm m-0">No forms yet. Create one to start collecting member feedback.</p>
          </div>
        }
      }
    </div>
  `,
  host: { class: 'block w-full' },
})
export class TemplateCardGridComponent {
  readonly templates = input.required<FormTemplate[]>();
  readonly loading = input<boolean>(false);
  readonly canWrite = input<boolean>(true);

  readonly openResults = output<FormTemplate>();
  readonly openGenerateLink = output<FormTemplate>();

  orDashValue(value: string | number | null | undefined): string {
    return orDash(value);
  }
}
