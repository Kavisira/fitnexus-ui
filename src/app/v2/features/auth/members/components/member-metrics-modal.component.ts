import { Component, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzAlertModule } from 'ng-zorro-antd/alert';

import { Member, MetricEntryPayload } from '../../../../../core/members/member-api.service';
import { computeBmi, bmiStatus } from '../../../../../core/constants/bmi';
import { compressImageToDataUrl } from '../services/member-form.utils';

@Component({
  selector: 'app-member-metrics-modal',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NzModalModule,
    NzButtonModule,
    NzIconModule,
    NzInputModule,
    NzDatePickerModule,
    NzAlertModule,
  ],
  template: `
    @if (member(); as m) {
      <nz-modal
        [nzVisible]="true"
        nzTitle="Log Check-in & Measurements"
        [nzFooter]="null"
        [nzWidth]="540"
        (nzOnCancel)="close.emit()"
      >
        <div *nzModalContent class="space-y-4 p-1">
          <!-- Member Info Subhead -->
          <div class="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800 text-xs">
            <span class="text-gray-500">Member: <strong class="text-gray-900 dark:text-white">{{ m.name }}</strong></span>
            <span class="text-gray-500">Height: <strong class="text-gray-900 dark:text-white">{{ m.heightCm }} cm</strong></span>
          </div>

          @if (errorMessage(); as err) {
            <nz-alert nzType="error" [nzMessage]="err" nzShowIcon class="!rounded-xl"></nz-alert>
          }

          <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-3" novalidate>
            <!-- Weight & Live BMI -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Weight (kg) *</label>
                <input
                  nz-input
                  type="number"
                  step="0.1"
                  formControlName="weightKg"
                  placeholder="e.g. 72.5"
                  class="w-full !rounded-xl bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                />
                @if (bmiPreview(); as bmi) {
                  <div class="text-[11px] font-semibold text-blue-600 dark:text-blue-400 mt-1">
                    {{ bmi }}
                  </div>
                }
              </div>

              <div>
                <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Recorded Date</label>
                <nz-date-picker formControlName="recordedAt" class="w-full !rounded-xl"></nz-date-picker>
              </div>
            </div>

            <!-- Tape Measurements Grid -->
            <div class="pt-2">
              <label class="block text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-400 mb-2">
                Circumference (cm, optional)
              </label>
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div>
                  <span class="text-[11px] text-gray-400 block mb-0.5">Chest</span>
                  <input nz-input type="number" formControlName="chestCm" placeholder="cm" class="!rounded-lg" />
                </div>
                <div>
                  <span class="text-[11px] text-gray-400 block mb-0.5">Waist</span>
                  <input nz-input type="number" formControlName="waistCm" placeholder="cm" class="!rounded-lg" />
                </div>
                <div>
                  <span class="text-[11px] text-gray-400 block mb-0.5">Hips</span>
                  <input nz-input type="number" formControlName="hipsCm" placeholder="cm" class="!rounded-lg" />
                </div>
                <div>
                  <span class="text-[11px] text-gray-400 block mb-0.5">Arms</span>
                  <input nz-input type="number" formControlName="armsCm" placeholder="cm" class="!rounded-lg" />
                </div>
                <div>
                  <span class="text-[11px] text-gray-400 block mb-0.5">Thighs</span>
                  <input nz-input type="number" formControlName="thighCm" placeholder="cm" class="!rounded-lg" />
                </div>
                <div>
                  <span class="text-[11px] text-gray-400 block mb-0.5">Shoulders</span>
                  <input nz-input type="number" formControlName="shouldersCm" placeholder="cm" class="!rounded-lg" />
                </div>
              </div>
            </div>

            <!-- Progress Photo Upload -->
            <div class="pt-2">
              <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Progress Photo (optional)</label>
              <div class="flex items-center gap-3">
                @if (photoDataUrl(); as url) {
                  <img [src]="url" alt="Progress preview" class="w-14 h-14 rounded-xl object-cover border border-gray-200 dark:border-gray-700" />
                  <button nz-button nzType="text" nzDanger (click)="photoDataUrl.set(null)" class="text-xs">Remove photo</button>
                } @else {
                  <label class="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-500 text-xs text-gray-600 dark:text-gray-300 transition-colors">
                    <span nz-icon nzType="camera"></span>
                    <span>Upload progress photo</span>
                    <input type="file" accept="image/*" (change)="onPhotoPicked($event)" class="hidden" />
                  </label>
                }
              </div>
            </div>

            <!-- Actions -->
            <div class="flex items-center justify-end gap-2 pt-4 border-t border-gray-100 dark:border-gray-800">
              <button nz-button nzType="default" (click)="close.emit()" class="!rounded-xl font-semibold">Cancel</button>
              <button nz-button nzType="primary" type="submit" [nzLoading]="saving()" [disabled]="form.invalid" class="!rounded-xl font-semibold !bg-blue-600 hover:!bg-blue-700">Save Check-in</button>
            </div>
          </form>
        </div>
      </nz-modal>
    }
  `,
})
export class MemberMetricsModalComponent {
  private fb = inject(FormBuilder);

  readonly member = input<Member | null>(null);
  readonly saving = input<boolean>(false);
  readonly errorMessage = input<string | null>(null);

  readonly close = output<void>();
  readonly save = output<{ payload: MetricEntryPayload; memberId?: string }>();

  readonly photoDataUrl = signal<string | null>(null);

  readonly form = this.fb.group({
    weightKg: [null as number | null, [Validators.required, Validators.min(20), Validators.max(300)]],
    chestCm: [null as number | null],
    waistCm: [null as number | null],
    hipsCm: [null as number | null],
    armsCm: [null as number | null],
    thighCm: [null as number | null],
    shouldersCm: [null as number | null],
    recordedAt: [new Date(), [Validators.required]],
  });

  readonly bmiPreview = computed(() => {
    const m = this.member();
    const w = this.form.value.weightKg;
    if (!m?.heightCm || !w) return null;
    const bmi = computeBmi(Number(w), Number(m.heightCm));
    return `Calculated BMI: ${bmi} (${bmiStatus(bmi)})`;
  });

  async onPhotoPicked(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const url = await compressImageToDataUrl(file);
      this.photoDataUrl.set(url);
    } catch {
      // Ignored
    }
  }

  submit(): void {
    const m = this.member();
    if (this.form.invalid || !m) return;
    const val = this.form.getRawValue();
    const payload: MetricEntryPayload = {
      weightKg: Number(val.weightKg),
      chestCm: val.chestCm ? Number(val.chestCm) : undefined,
      waistCm: val.waistCm ? Number(val.waistCm) : undefined,
      hipsCm: val.hipsCm ? Number(val.hipsCm) : undefined,
      armsCm: val.armsCm ? Number(val.armsCm) : undefined,
      thighCm: val.thighCm ? Number(val.thighCm) : undefined,
      shouldersCm: val.shouldersCm ? Number(val.shouldersCm) : undefined,
      recordedAt: val.recordedAt ? new Date(val.recordedAt).toISOString() : undefined,
      photoDataUrl: this.photoDataUrl() ?? undefined,
    };
    this.save.emit({ payload, memberId: m.id });
  }
}
