import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzEmptyModule } from 'ng-zorro-antd/empty';

import { Member, MemberApiService, MemberMetricEntry } from '../../../../../core/members/member-api.service';
import { BmiStatus } from '../../../../../core/constants/bmi';

@Component({
  selector: 'app-member-progress-modal',
  imports: [
    CommonModule,
    NzModalModule,
    NzButtonModule,
    NzTableModule,
    NzTagModule,
    NzAlertModule,
    NzSpinModule,
    NzEmptyModule,
  ],
  template: `
    @if (member(); as m) {
      <nz-modal
        [nzVisible]="true"
        nzTitle="Member Progress & Transformation"
        [nzFooter]="null"
        [nzWidth]="840"
        (nzOnCancel)="close.emit()"
      >
        <div *nzModalContent class="space-y-5 p-1 max-h-[75vh] overflow-y-auto">
          <!-- Member Quick Summary -->
          <div class="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800 text-xs">
            <div>
              <span class="text-gray-500">Member: </span>
              <span class="font-semibold text-gray-900 dark:text-white">{{ m.name }}</span>
            </div>
            <div class="flex items-center gap-4 text-gray-500">
              @if (m.heightCm) {
                <span>Height: <strong class="text-gray-900 dark:text-white">{{ m.heightCm }} cm</strong></span>
              }
              @if (m.goalWeightKg) {
                <span>Goal: <strong class="text-gray-900 dark:text-white">{{ m.goalWeightKg }} kg</strong></span>
              }
            </div>
          </div>

          <!-- Loading State -->
          @if (loading()) {
            <div class="py-12 flex justify-center"><nz-spin nzSimple></nz-spin></div>
          } @else {
            <!-- Transformation Photos Strip -->
            @if (entriesWithPhoto().length > 0) {
              <div>
                <h4 class="text-xs uppercase font-semibold tracking-wider text-gray-400 mb-2.5">Progress Photos</h4>
                <div class="flex gap-3 overflow-x-auto pb-2">
                  @for (entry of entriesWithPhoto(); track entry.id; let idx = $index) {
                    <div class="shrink-0 w-36 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 p-2 text-center">
                      <div class="w-full h-40 rounded-lg overflow-hidden bg-black/5 dark:bg-black/30 mb-2">
                        <img [src]="entry.photoUrl" [alt]="reviewLabel(idx)" class="w-full h-full object-cover" />
                      </div>
                      <div class="font-semibold text-xs text-gray-900 dark:text-white">{{ reviewLabel(idx) }} Review</div>
                      <div class="text-[11px] text-gray-500">{{ entry.recordedAt | date: 'mediumDate' }}</div>
                      <div class="text-xs font-semibold text-blue-600 dark:text-blue-400 mt-0.5">{{ entry.weightKg }} kg</div>
                    </div>
                  }
                </div>
                @if (entriesWithPhoto().length === 1) {
                  <nz-alert nzType="info" nzMessage="Add more check-in photos over time to compare physical progress side-by-side." nzShowIcon class="!rounded-xl mt-2"></nz-alert>
                }
              </div>
            }

            <!-- Check-in Metrics Table -->
            <div>
              <h4 class="text-xs uppercase font-semibold tracking-wider text-gray-400 mb-2.5">Measurement History</h4>
              @if (history().length === 0) {
                <nz-empty nzNotFoundImage="simple" nzNotFoundContent="No check-ins recorded yet"></nz-empty>
              } @else {
                <div class="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
                  <nz-table #histTable [nzData]="history()" [nzShowPagination]="false" [nzFrontPagination]="false" nzSize="small">
                    <thead>
                      <tr class="bg-gray-50/50 dark:bg-gray-800/40 text-[11px] uppercase">
                        <th>Review</th>
                        <th>Date</th>
                        <th>Weight</th>
                        <th>Chest</th>
                        <th>Waist</th>
                        <th>Hips</th>
                        <th>BMI</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (row of history(); track row.id; let idx = $index) {
                        <tr class="text-xs hover:bg-gray-50/60 dark:hover:bg-gray-800/40">
                          <td class="font-semibold">{{ reviewLabel(idx) }}</td>
                          <td class="text-gray-500">{{ row.recordedAt | date: 'mediumDate' }}</td>
                          <td class="font-medium">{{ row.weightKg }} kg</td>
                          <td class="text-gray-500">{{ row.chestCm ? row.chestCm + ' cm' : '-' }}</td>
                          <td class="text-gray-500">{{ row.waistCm ? row.waistCm + ' cm' : '-' }}</td>
                          <td class="text-gray-500">{{ row.hipsCm ? row.hipsCm + ' cm' : '-' }}</td>
                          <td class="font-semibold">{{ row.bmi }}</td>
                          <td>
                            <nz-tag [nzColor]="statusColor(row.bmiStatus)">{{ row.bmiStatus }}</nz-tag>
                          </td>
                        </tr>
                      }
                    </tbody>
                  </nz-table>
                </div>
              }
            </div>
          }
        </div>
      </nz-modal>
    }
  `,
})
export class MemberProgressModalComponent {
  private memberApi = inject(MemberApiService);

  readonly member = input<Member | null>(null);
  readonly close = output<void>();

  readonly loading = signal(false);
  readonly history = signal<MemberMetricEntry[]>([]);
  readonly entriesWithPhoto = computed(() => this.history().filter(e => !!e.photoUrl));

  constructor() {
    effect(() => {
      const m = this.member();
      if (m?.id) {
        this.fetchMetrics(m.id);
      } else {
        this.history.set([]);
      }
    });
  }

  private fetchMetrics(memberId: string): void {
    this.loading.set(true);
    this.memberApi.listMetricEntries(memberId).subscribe({
      next: (entries) => {
        this.loading.set(false);
        this.history.set(entries);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  reviewLabel(index: number): string {
    const n = index + 1;
    const mod100 = n % 100;
    if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
    switch (n % 10) {
      case 1: return `${n}st`;
      case 2: return `${n}nd`;
      case 3: return `${n}rd`;
      default: return `${n}th`;
    }
  }

  statusColor(status: BmiStatus): string {
    switch (status) {
      case 'UNDERWEIGHT': return 'orange';
      case 'NORMAL': return 'success';
      case 'OVERWEIGHT': return 'warning';
      case 'OBESE': return 'error';
      default: return 'default';
    }
  }
}
