import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';

import { FitnessDietEditorComponent } from './fitness-diet-editor.component';
import { FitnessWorkoutEditorComponent } from './fitness-workout-editor.component';
import { MemberFitnessStore } from './member-fitness.store';

/**
 * Per-member Diet & Workout editor (trainer side) + shareable public link.
 * The member's own token page lives at /public-fitness/:token.
 * Actions sit in the modal footer: Close + one primary Save for the active tab.
 */
@Component({
  selector: 'app-member-fitness-modal',
  imports: [
    NzButtonModule, NzIconModule, NzModalModule, NzSpinModule, NzTabsModule, NzTooltipModule,
    FitnessDietEditorComponent, FitnessWorkoutEditorComponent,
  ],
  providers: [MemberFitnessStore],
  template: `
    <nz-modal
      [nzVisible]="true"
      [nzTitle]="memberName() + ' — Diet & Workout'"
      [nzFooter]="footerTpl"
      [nzWidth]="1000"
      [nzMaskClosable]="false"
      [nzBodyStyle]="{ maxHeight: '70vh', overflowY: 'auto' }"
      (nzOnCancel)="closed.emit()"
    >
      <div *nzModalContent>
        @if (store.loading()) {
          <div class="flex justify-center py-16"><nz-spin nzSimple nzSize="large"></nz-spin></div>
        } @else {
          <!-- Public link -->
          <div class="flex items-center gap-2 flex-wrap mb-3">
            <button nz-button nzType="default" [nzLoading]="store.loadingLink()" (click)="store.getPublicLink()" class="!h-9 !rounded-xl !inline-flex !items-center gap-1.5 text-xs font-semibold">
              <span nz-icon nzType="link"></span><span>Get member public link</span>
            </button>
            @if (store.publicLink(); as link) {
              <span class="text-xs text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg px-2.5 py-1.5 truncate max-w-full sm:max-w-md">{{ link }}</span>
              <button nz-button nzType="text" nzShape="circle" nz-tooltip nzTooltipTitle="Copy link" (click)="store.copyLink()">
                <span nz-icon nzType="copy"></span>
              </button>
            }
          </div>

          <nz-tabs [nzSelectedIndex]="tab()" (nzSelectedIndexChange)="tab.set($event)">
            <nz-tab nzTitle="Diet">
              <app-fitness-diet-editor [canWrite]="canWrite()"></app-fitness-diet-editor>
            </nz-tab>
            <nz-tab nzTitle="Workout">
              <app-fitness-workout-editor [canWrite]="canWrite()" [memberGender]="memberGender()"></app-fitness-workout-editor>
            </nz-tab>
          </nz-tabs>
        }
      </div>

      <ng-template #footerTpl>
        <div class="flex items-center justify-end gap-2">
          <button nz-button nzType="default" (click)="closed.emit()" class="!rounded-xl">Close</button>
          @if (canWrite() && !store.loading()) {
            @if (tab() === 0) {
              <button nz-button nzType="primary" [nzLoading]="store.savingDiet()" (click)="store.saveDiet()" class="!rounded-xl !bg-blue-600 hover:!bg-blue-500">Save diet plan</button>
            } @else {
              <button nz-button nzType="primary" [nzLoading]="store.savingWorkout()" (click)="store.saveWorkout()" class="!rounded-xl !bg-blue-600 hover:!bg-blue-500">Save workout plan</button>
            }
          }
        </div>
      </ng-template>
    </nz-modal>
  `,
})
export class MemberFitnessModalComponent implements OnInit {
  readonly store = inject(MemberFitnessStore);

  readonly memberId = input.required<string>();
  readonly memberName = input<string>('');
  readonly memberGender = input<'MALE' | 'FEMALE' | 'OTHER' | null>(null);
  readonly canWrite = input<boolean>(false);

  readonly closed = output<void>();

  readonly tab = signal(0);

  ngOnInit(): void {
    this.store.load(this.memberId());
  }
}
