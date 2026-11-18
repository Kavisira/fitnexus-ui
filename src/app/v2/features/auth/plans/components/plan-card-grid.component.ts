import { Component, input, output } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';

import { currencySymbol } from '../../../../../core/constants/currencies';
import { Plan } from '../../../../../core/plans/plan-api.service';
import { durationLabel, orDash, priceWithTax } from '../services/plan.utils';

@Component({
  selector: 'app-plan-card-grid',
  imports: [NzButtonModule, NzIconModule, NzSkeletonModule, NzTagModule, NzTooltipModule],
  template: `
    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
      @if (loading()) {
        @for (i of [1, 2, 3, 4, 5, 6]; track i) {
          <div class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
            <nz-skeleton [nzActive]="true" [nzParagraph]="{ rows: 2 }"></nz-skeleton>
          </div>
        }
      } @else {
        @for (plan of plans(); track plan.id) {
          <div
            class="group relative flex flex-col bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs p-4 transition-all hover:shadow-md hover:border-blue-200 dark:hover:border-blue-900"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="flex items-center gap-2.5 min-w-0">
                <span class="flex items-center justify-center w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 shrink-0">
                  <span nz-icon nzType="tags"></span>
                </span>
                <div class="min-w-0">
                  <div class="font-semibold text-gray-900 dark:text-white truncate leading-tight">{{ orDashValue(plan.name) }}</div>
                  <div class="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 truncate leading-tight">
                    <span nz-icon nzType="environment" class="shrink-0"></span>
                    <span class="truncate">{{ orDashValue(plan.branch?.location) }}</span>
                  </div>
                </div>
              </div>
              <nz-tag nzColor="blue" class="!text-xs !m-0 shrink-0">{{ durationLabelOf(plan.duration) }}</nz-tag>
            </div>

            <div class="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-end justify-between gap-2">
              <div>
                <span class="text-lg font-bold text-gray-900 dark:text-white leading-none">{{ currencySymbol(plan.branch?.currency) }}{{ plan.price }}</span>
                <div class="text-[10px] uppercase tracking-wide text-gray-400 mt-0.5">Price</div>
              </div>
              <div class="text-right">
                <span class="text-sm font-bold text-blue-600 dark:text-blue-300 leading-none">{{ currencySymbol(plan.branch?.currency) }}{{ priceWithTaxOf(plan) }}</span>
                <div class="text-[10px] uppercase tracking-wide text-gray-400 mt-0.5">With tax ({{ taxRateOf(plan) }}%)</div>
              </div>
            </div>

            @if (canWrite()) {
              <div class="mt-3 pt-2.5 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-1">
                <button nz-button nzType="text" nzShape="circle" nz-tooltip nzTooltipTitle="Edit" (click)="editPlan.emit(plan)">
                  <span nz-icon nzType="edit"></span>
                </button>
                <button nz-button nzType="text" nzShape="circle" nzDanger nz-tooltip nzTooltipTitle="Delete" (click)="deletePlan.emit(plan)">
                  <span nz-icon nzType="delete"></span>
                </button>
              </div>
            }
          </div>
        } @empty {
          <div class="col-span-full flex flex-col items-center justify-center gap-2 py-16 bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 text-gray-400">
            <span nz-icon nzType="tags" class="text-3xl"></span>
            <p class="text-sm m-0">No plans found.</p>
          </div>
        }
      }
    </div>
  `,
  host: { class: 'block w-full' },
})
export class PlanCardGridComponent {
  readonly plans = input.required<Plan[]>();
  readonly loading = input<boolean>(false);
  readonly canWrite = input<boolean>(true);

  readonly editPlan = output<Plan>();
  readonly deletePlan = output<Plan>();

  readonly currencySymbol = currencySymbol;

  orDashValue(value: string | number | null | undefined): string {
    return orDash(value);
  }

  durationLabelOf(duration: Plan['duration']): string {
    return durationLabel(duration);
  }

  priceWithTaxOf(plan: Plan): string {
    return priceWithTax(plan.price, plan.branch?.taxRatePercent);
  }

  taxRateOf(plan: Plan): string {
    return String(Number(plan.branch?.taxRatePercent ?? 0) || 0);
  }
}
