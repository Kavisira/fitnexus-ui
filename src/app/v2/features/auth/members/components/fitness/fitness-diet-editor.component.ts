import { Component, inject, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';

import { MemberFitnessStore } from './member-fitness.store';

const LABEL = 'block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1';

@Component({
  selector: 'app-fitness-diet-editor',
  imports: [FormsModule, NzButtonModule, NzIconModule, NzInputModule, NzTooltipModule],
  template: `
    <div class="space-y-4">
      <div>
        <label [class]="label" for="diet-title">Title *</label>
        <input nz-input id="diet-title" class="!h-9 !rounded-xl" placeholder="e.g. Fat-loss plan"
          [ngModel]="store.dietTitle()" (ngModelChange)="store.dietTitle.set($event)" [disabled]="!canWrite()" />
      </div>
      <div>
        <label [class]="label" for="diet-notes">Notes (optional)</label>
        <textarea nz-input id="diet-notes" rows="2" class="!rounded-xl"
          [ngModel]="store.dietNotes()" (ngModelChange)="store.dietNotes.set($event)" [disabled]="!canWrite()"></textarea>
      </div>

      <div>
        <div [class]="label">Meals</div>
        <div class="space-y-2">
          @for (item of store.dietItems(); track $index; let i = $index) {
            <div class="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto] gap-2 items-center">
              <input nz-input class="!h-9 !rounded-xl" placeholder="Meal (e.g. Breakfast)"
                [ngModel]="item.mealLabel" (ngModelChange)="store.updateDietItem(i, 'mealLabel', $event)" [disabled]="!canWrite()" />
              <input nz-input class="!h-9 !rounded-xl" placeholder="What to eat"
                [ngModel]="item.description" (ngModelChange)="store.updateDietItem(i, 'description', $event)" [disabled]="!canWrite()" />
              @if (canWrite()) {
                <button nz-button nzType="text" nzShape="circle" nzDanger nz-tooltip nzTooltipTitle="Remove meal" (click)="store.removeDietItem(i)">
                  <span nz-icon nzType="delete"></span>
                </button>
              }
            </div>
          }
        </div>
        @if (canWrite()) {
          <button nz-button nzType="dashed" (click)="store.addDietItem()" class="!mt-3 !rounded-xl !inline-flex !items-center gap-1.5 text-xs font-semibold">
            <span nz-icon nzType="plus"></span><span>Add meal</span>
          </button>
        }
      </div>
    </div>
  `,
})
export class FitnessDietEditorComponent {
  readonly store = inject(MemberFitnessStore);
  readonly canWrite = input<boolean>(false);
  readonly label = LABEL;
}
