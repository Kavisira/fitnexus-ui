import { Component, input, output } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';

import { Offer } from '../../../../../core/offers/offer-api.service';
import { offerSummary, offerTypeIcon, offerTypeLabel } from '../services/offer.utils';

@Component({
  selector: 'app-offer-card-grid',
  imports: [NzButtonModule, NzIconModule, NzSkeletonModule, NzTooltipModule],
  template: `
    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
      @if (loading()) {
        @for (i of [1, 2, 3, 4]; track i) {
          <div class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
            <nz-skeleton [nzActive]="true" [nzParagraph]="{ rows: 2 }"></nz-skeleton>
          </div>
        }
      } @else {
        @for (offer of offers(); track offer.id) {
          <div
            class="group relative flex flex-col bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs p-5 transition-all hover:shadow-md hover:border-blue-200 dark:hover:border-blue-900"
            [class.opacity-60]="!offer.isActive"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="flex items-center gap-3 min-w-0">
                <span class="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300 shrink-0">
                  <span nz-icon [nzType]="typeIcon(offer)" class="text-lg"></span>
                </span>
                <div class="min-w-0">
                  <div class="font-semibold text-gray-900 dark:text-white truncate">{{ offer.name }}</div>
                  <div class="text-xs text-gray-500 dark:text-gray-400 truncate">{{ typeLabel(offer) }}</div>
                </div>
              </div>
              <span
                class="px-2.5 py-0.5 rounded-full text-xs font-semibold shrink-0"
                [class]="offer.isActive
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'"
              >
                {{ offer.isActive ? 'Active' : 'Inactive' }}
              </span>
            </div>

            <div class="mt-4 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">{{ summary(offer) }}</div>

            @if (canWrite()) {
              <div class="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-1">
                <button nz-button nzType="text" nzShape="circle" nz-tooltip nzTooltipTitle="Edit" (click)="editOffer.emit(offer)">
                  <span nz-icon nzType="edit"></span>
                </button>
                <button nz-button nzType="text" nzShape="circle" nzDanger nz-tooltip nzTooltipTitle="Delete" (click)="deleteOffer.emit(offer)">
                  <span nz-icon nzType="delete"></span>
                </button>
              </div>
            }
          </div>
        } @empty {
          <div class="col-span-full flex flex-col items-center justify-center gap-2 py-16 bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 text-gray-400">
            <span nz-icon nzType="percentage" class="text-3xl"></span>
            <p class="text-sm m-0">No offers found.</p>
          </div>
        }
      }
    </div>
  `,
  host: { class: 'block w-full' },
})
export class OfferCardGridComponent {
  readonly offers = input.required<Offer[]>();
  readonly loading = input<boolean>(false);
  readonly canWrite = input<boolean>(true);

  readonly editOffer = output<Offer>();
  readonly deleteOffer = output<Offer>();

  summary(offer: Offer): string { return offerSummary(offer); }
  typeLabel(offer: Offer): string { return offerTypeLabel(offer.type); }
  typeIcon(offer: Offer): string { return offerTypeIcon(offer.type); }
}
