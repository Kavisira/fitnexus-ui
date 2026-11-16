import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzDropdownModule } from 'ng-zorro-antd/dropdown';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';

import { MemberCard } from '../models/member-card.model';
import { Member } from '../../../../../core/members/member-api.service';

@Component({
  selector: 'app-member-card-grid',
  imports: [
    CommonModule,
    NzButtonModule,
    NzIconModule,
    NzAvatarModule,
    NzDropdownModule,
    NzTooltipModule,
  ],
  template: `
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      @for (c of cards(); track c.member.id) {
        <div class="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 dark:border-gray-800 shadow-xs flex flex-col justify-between hover:border-blue-200 dark:hover:border-blue-900/50 transition-all">
          <div>
            <!-- Header: Avatar + Name + Actions -->
            <div class="flex items-start justify-between gap-2 mb-3">
              <div class="flex items-center gap-3 min-w-0">
                @if (c.member.photoUrl) {
                  <img [src]="c.member.photoUrl" [alt]="c.member.name" class="w-11 h-11 rounded-full object-cover shrink-0 border border-gray-200 dark:border-gray-700" />
                } @else {
                  <nz-avatar [nzText]="c.member.name.charAt(0)" nzSize="large" class="!bg-blue-600 !text-white font-bold shrink-0"></nz-avatar>
                }
                <div class="min-w-0">
                  <h3 class="text-sm font-bold text-gray-900 dark:text-white truncate m-0 flex items-center gap-1.5">
                    <span>{{ c.member.name }}</span>
                    @if (c.member.hasPersonalTrainer) {
                      <span class="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">PT</span>
                    }
                  </h3>
                  <p class="text-xs text-gray-400 dark:text-gray-400 truncate mt-0.5 mb-0">{{ c.member.phone }}</p>
                </div>
              </div>

              <button
                nz-button
                nzType="text"
                nzShape="circle"
                nz-dropdown
                [nzDropdownMenu]="menu"
                nzTrigger="click"
                nzPlacement="bottomRight"
                class="!text-gray-400 hover:!text-gray-600 dark:hover:!text-white shrink-0"
              >
                <span nz-icon nzType="ellipsis" class="text-base font-bold"></span>
              </button>

              <nz-dropdown-menu #menu="nzDropdownMenu">
                <ul nz-menu class="min-w-44 !p-1 !rounded-xl !shadow-lg border border-gray-100 dark:border-gray-800">
                  <li nz-menu-item (click)="viewDetails.emit(c)" class="!px-3.5 !py-2 !rounded-lg text-slate-700 dark:text-slate-200">
                    <span nz-icon nzType="info-circle" class="mr-3 text-base text-slate-500 dark:text-slate-400"></span>
                    <span class="text-[13.5px] font-normal">Details</span>
                  </li>
                  <li nz-menu-item (click)="viewProgress.emit(c.member)" class="!px-3.5 !py-2 !rounded-lg text-slate-700 dark:text-slate-200">
                    <span nz-icon nzType="eye" class="mr-3 text-base text-slate-500 dark:text-slate-400"></span>
                    <span class="text-[13.5px] font-normal">Progress</span>
                  </li>
                  <li nz-menu-item (click)="viewFitness.emit(c.member)" class="!px-3.5 !py-2 !rounded-lg text-slate-700 dark:text-slate-200">
                    <span nz-icon nzType="heart" class="mr-3 text-base text-slate-500 dark:text-slate-400"></span>
                    <span class="text-[13.5px] font-normal">Diet & workout</span>
                  </li>
                  @if (canWrite()) {
                    <li nz-menu-item (click)="logMetrics.emit(c.member)" class="!px-3.5 !py-2 !rounded-lg text-slate-700 dark:text-slate-200">
                      <span nz-icon nzType="plus-circle" class="mr-3 text-base text-slate-500 dark:text-slate-400"></span>
                      <span class="text-[13.5px] font-normal">Log check-in</span>
                    </li>
                  }
                  @if (!c.member.isTrial) {
                    <li nz-menu-item (click)="downloadInvoice.emit(c.member)" class="!px-3.5 !py-2 !rounded-lg text-slate-700 dark:text-slate-200">
                      <span nz-icon nzType="download" class="mr-3 text-base text-slate-500 dark:text-slate-400"></span>
                      <span class="text-[13.5px] font-normal">Invoice PDF</span>
                    </li>
                  }
                  @if (canWrite()) {
                    <li nz-menu-divider class="!my-1 border-gray-100 dark:border-gray-800"></li>
                    <li nz-menu-item (click)="editMember.emit(c.member)" class="!px-3.5 !py-2 !rounded-lg text-slate-700 dark:text-slate-200">
                      <span nz-icon nzType="edit" class="mr-3 text-base text-slate-500 dark:text-slate-400"></span>
                      <span class="text-[13.5px] font-normal">Edit</span>
                    </li>
                    <li nz-menu-item (click)="deleteMember.emit(c.member)" class="!px-3.5 !py-2 !rounded-lg text-slate-700 dark:text-slate-200 hover:!text-red-600">
                      <span nz-icon nzType="delete" class="mr-3 text-base text-slate-500 dark:text-slate-400"></span>
                      <span class="text-[13.5px] font-normal">Delete</span>
                    </li>
                  }
                </ul>
              </nz-dropdown-menu>
            </div>

            <!-- Plan & Branch Pills -->
            <div class="flex items-center justify-between gap-2 py-2 px-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800 text-xs mb-3">
              <span class="font-semibold text-gray-800 dark:text-gray-200 truncate">{{ c.planLabel }}</span>
              <span class="font-bold text-emerald-600 dark:text-emerald-400 shrink-0">{{ c.priceLabel }}</span>
            </div>

            <div class="space-y-1.5 text-xs text-gray-500 dark:text-gray-400">
              <div class="flex items-center justify-between">
                <span>Branch:</span>
                <strong class="text-gray-700 dark:text-gray-300">{{ c.branchLabel }}</strong>
              </div>
              <div class="flex items-center justify-between">
                <span>Trainer:</span>
                <strong class="text-gray-700 dark:text-gray-300">{{ c.member.assignedTrainerEmployee?.name ?? '—' }}</strong>
              </div>
              @if (c.latest; as m) {
                <div class="flex items-center justify-between">
                  <span>BMI:</span>
                  <span class="font-semibold text-blue-600 dark:text-blue-400">{{ m.bmi }} ({{ m.bmiStatus }})</span>
                </div>
              }
            </div>
          </div>

          <!-- Card Footer Status -->
          <div class="mt-4 pt-3 border-t border-gray-50 dark:border-gray-800/80 flex items-center justify-between text-xs">
            <span
              class="px-2 py-0.5 rounded-full font-semibold text-[11px]"
              [class.bg-emerald-50]="c.member.status === 'ACTIVE'"
              [class.text-emerald-700]="c.member.status === 'ACTIVE'"
              [class.dark:bg-emerald-900/30]="c.member.status === 'ACTIVE'"
              [class.dark:text-emerald-300]="c.member.status === 'ACTIVE'"
              [class.bg-gray-100]="c.member.status === 'INACTIVE'"
              [class.text-gray-600]="c.member.status === 'INACTIVE'"
              [class.dark:bg-gray-800]="c.member.status === 'INACTIVE'"
              [class.dark:text-gray-400]="c.member.status === 'INACTIVE'"
            >
              {{ c.member.status }}
            </span>
            <span class="text-gray-400 text-[11px]">{{ c.member.startDate | date:'mediumDate' }}</span>
          </div>
        </div>
      }
    </div>
  `,
  host: {
    class: 'block w-full',
  },
})
export class MemberCardGridComponent {
  readonly cards = input.required<MemberCard[]>();
  readonly canWrite = input<boolean>(true);

  readonly viewDetails = output<MemberCard>();
  readonly viewProgress = output<Member>();
  readonly viewFitness = output<Member>();
  readonly logMetrics = output<Member>();
  readonly downloadInvoice = output<Member>();
  readonly editMember = output<Member>();
  readonly deleteMember = output<Member>();
}
