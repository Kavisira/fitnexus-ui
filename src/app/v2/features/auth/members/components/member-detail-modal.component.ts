import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';

import { MemberCard } from '../models/member-card.model';

@Component({
  selector: 'app-member-detail-modal',
  imports: [CommonModule, NzModalModule, NzButtonModule, NzIconModule, NzAvatarModule],
  template: `
    @if (card(); as c) {
      <nz-modal
        [nzVisible]="true"
        nzTitle="Member Profile"
        [nzFooter]="null"
        [nzWidth]="640"
        (nzOnCancel)="close.emit()"
      >
        <div *nzModalContent class="space-y-6 p-2">
          <!-- Member Hero -->
          <div class="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800">
            @if (c.member.photoUrl) {
              <img [src]="c.member.photoUrl" [alt]="c.member.name" class="w-16 h-16 rounded-full object-cover border-2 border-white dark:border-gray-700 shadow-md shrink-0" />
            } @else {
              <nz-avatar [nzText]="c.member.name.charAt(0)" [nzSize]="64" class="!bg-blue-600 !text-white !text-2xl font-bold shadow-md shrink-0"></nz-avatar>
            }
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2 flex-wrap">
                <h2 class="text-lg font-bold text-gray-900 dark:text-white m-0 truncate">{{ c.member.name }}</h2>
                <span
                  class="px-2 py-0.5 rounded-full text-xs font-semibold"
                  [class.bg-emerald-50]="c.member.status === 'ACTIVE'"
                  [class.text-emerald-700]="c.member.status === 'ACTIVE'"
                  [class.dark:bg-emerald-900/30]="c.member.status === 'ACTIVE'"
                  [class.dark:text-emerald-300]="c.member.status === 'ACTIVE'"
                  [class.bg-gray-100]="c.member.status === 'INACTIVE'"
                  [class.text-gray-600]="c.member.status === 'INACTIVE'"
                  [class.dark:bg-gray-700]="c.member.status === 'INACTIVE'"
                  [class.dark:text-gray-400]="c.member.status === 'INACTIVE'"
                >
                  {{ c.member.status }}
                </span>
                @if (c.member.hasPersonalTrainer) {
                  <span class="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                    Personal Training
                  </span>
                }
              </div>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-0 flex items-center gap-3 flex-wrap">
                <span>📞 {{ c.member.phone }}</span>
                @if (c.member.email) {
                  <span>✉️ {{ c.member.email }}</span>
                }
              </p>
            </div>
          </div>

          <!-- Membership & Plan Card -->
          <div class="p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 space-y-2.5">
            <h3 class="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-400 m-0">Membership Details</h3>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span class="text-gray-400 block">Plan:</span>
                <strong class="text-gray-900 dark:text-white">{{ c.planLabel }}</strong>
              </div>
              <div>
                <span class="text-gray-400 block">Branch:</span>
                <strong class="text-gray-900 dark:text-white">{{ c.branchLabel }}</strong>
              </div>
              <div>
                <span class="text-gray-400 block">Total Price:</span>
                <strong class="text-emerald-600 dark:text-emerald-400 font-bold">{{ c.priceLabel }}</strong>
              </div>
              <div>
                <span class="text-gray-400 block">Start Date:</span>
                <strong class="text-gray-900 dark:text-white">{{ c.member.startDate | date:'mediumDate' }}</strong>
              </div>
              <div>
                <span class="text-gray-400 block">End Date:</span>
                <strong class="text-gray-900 dark:text-white">{{ c.member.endDate | date:'mediumDate' }}</strong>
              </div>
              <div>
                <span class="text-gray-400 block">Trainer:</span>
                <strong class="text-gray-900 dark:text-white">{{ c.member.assignedTrainerEmployee?.name ?? 'None' }}</strong>
              </div>
            </div>
          </div>

          <!-- Personal Training Add-on -->
          @if (c.member.hasPersonalTrainer) {
            <div class="p-4 rounded-xl border border-amber-100 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-900/10 space-y-2 text-xs">
              <h3 class="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 m-0">Personal Training</h3>
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div><span class="text-gray-400 block">Duration:</span><strong>{{ c.member.ptDuration }}</strong></div>
                <div><span class="text-gray-400 block">Rate/mo:</span><strong>{{ c.member.ptRatePerMonth | currency:c.member.branch?.currency:'symbol':'1.0-0' }}</strong></div>
                <div><span class="text-gray-400 block">PT End:</span><strong>{{ c.member.ptEndDate | date:'mediumDate' }}</strong></div>
                <div><span class="text-gray-400 block">PT Total:</span><strong class="text-amber-700 dark:text-amber-400">{{ c.member.ptTotal | currency:c.member.branch?.currency:'symbol':'1.0-0' }}</strong></div>
              </div>
            </div>
          }

          <!-- Health & Measurements -->
          <div class="p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 space-y-2.5">
            <h3 class="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-400 m-0">Physical Profile & Metrics</h3>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div><span class="text-gray-400 block">Age:</span><strong>{{ c.ageLabel }} years</strong></div>
              <div><span class="text-gray-400 block">Gender:</span><strong>{{ c.member.gender ?? '—' }}</strong></div>
              <div><span class="text-gray-400 block">Blood Group:</span><strong>{{ c.bloodGroupLabel }}</strong></div>
              <div><span class="text-gray-400 block">Height:</span><strong>{{ c.member.heightCm ? c.member.heightCm + ' cm' : '—' }}</strong></div>
              @if (c.latest; as m) {
                <div><span class="text-gray-400 block">Latest Weight:</span><strong>{{ m.weightKg }} kg</strong></div>
                <div><span class="text-gray-400 block">BMI:</span><strong class="text-blue-600 dark:text-blue-400">{{ m.bmi }} ({{ m.bmiStatus }})</strong></div>
              }
              @if (c.member.goalWeightKg) {
                <div><span class="text-gray-400 block">Target Weight:</span><strong>{{ c.member.goalWeightKg }} kg</strong></div>
              }
            </div>
          </div>

          <!-- Close Action -->
          <div class="flex justify-end pt-2">
            <button nz-button nzType="default" (click)="close.emit()" class="!rounded-xl font-semibold">Close</button>
          </div>
        </div>
      </nz-modal>
    }
  `,
})
export class MemberDetailModalComponent {
  readonly card = input<MemberCard | null>(null);
  readonly close = output<void>();
}

