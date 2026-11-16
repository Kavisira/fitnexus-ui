import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { GENDERS } from '../../../../../../core/constants/genders';
import { BLOOD_GROUPS } from '../../../../../../core/constants/blood-groups';

@Component({
  selector: 'app-step-measurements',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NzDatePickerModule,
    NzSelectModule,
    NzInputNumberModule,
    NzButtonModule,
    NzIconModule,
    NzTagModule,
  ],
  template: `
    <div [formGroup]="form()" class="space-y-4">
      <!-- Health Profile Header -->
      <div class="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">Health profile</div>

      <!-- Row 1: DOB & Gender -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div>
          <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Date of birth</label>
          <nz-date-picker formControlName="dateOfBirth" class="w-full !h-9 !rounded-xl"></nz-date-picker>
        </div>

        <div>
          <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Gender</label>
          <nz-select formControlName="gender" [nzShowSearch]="true" nzPlaceHolder="Select gender" class="w-full !h-9" [nzAllowClear]="true">
            @for (g of genderOptions; track g.value) {
              <nz-option [nzLabel]="g.label" [nzValue]="g.value"></nz-option>
            }
          </nz-select>
        </div>
      </div>

      <!-- Row 2: Blood Group & Height -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div>
          <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Blood group</label>
          <nz-select formControlName="bloodGroup" [nzShowSearch]="true" nzPlaceHolder="Select blood group" class="w-full !h-9" [nzAllowClear]="true">
            @for (bg of bloodGroupOptions; track bg.value) {
              <nz-option [nzLabel]="bg.label" [nzValue]="bg.value"></nz-option>
            }
          </nz-select>
        </div>

        <div>
          <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Height (cm)</label>
          <nz-input-number formControlName="heightCm" [nzMin]="30" [nzMax]="260" class="!w-full !h-9 !rounded-xl"></nz-input-number>
        </div>
      </div>

      <!-- Body Measurements Header -->
      <div class="pt-2 border-t border-gray-100 dark:border-gray-800">
        <div class="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
          Body measurements (optional check-in)
        </div>
      </div>

      <!-- Measurements Row 1: Weight, Goal Weight, Chest -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div>
          <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Current weight (kg)</label>
          <nz-input-number formControlName="weightKg" [nzMin]="1" [nzMax]="300" class="!w-full !h-9 !rounded-xl"></nz-input-number>
        </div>
        <div>
          <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Goal weight (kg)</label>
          <nz-input-number formControlName="goalWeightKg" [nzMin]="1" [nzMax]="300" class="!w-full !h-9 !rounded-xl"></nz-input-number>
        </div>
        <div>
          <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Chest (cm)</label>
          <nz-input-number formControlName="chestCm" [nzMin]="1" class="!w-full !h-9 !rounded-xl"></nz-input-number>
        </div>
      </div>

      <!-- Measurements Row 2: Waist, Hips, Shoulders -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div>
          <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Waist (cm)</label>
          <nz-input-number formControlName="waistCm" [nzMin]="1" class="!w-full !h-9 !rounded-xl"></nz-input-number>
        </div>
        <div>
          <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Hips (cm)</label>
          <nz-input-number formControlName="hipsCm" [nzMin]="1" class="!w-full !h-9 !rounded-xl"></nz-input-number>
        </div>
        <div>
          <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Shoulders (cm)</label>
          <nz-input-number formControlName="shouldersCm" [nzMin]="1" class="!w-full !h-9 !rounded-xl"></nz-input-number>
        </div>
      </div>

      <!-- Measurements Row 3: Arms, Thigh, Calf -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div>
          <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Arms (cm)</label>
          <nz-input-number formControlName="armsCm" [nzMin]="1" class="!w-full !h-9 !rounded-xl"></nz-input-number>
        </div>
        <div>
          <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Thigh (cm)</label>
          <nz-input-number formControlName="thighCm" [nzMin]="1" class="!w-full !h-9 !rounded-xl"></nz-input-number>
        </div>
        <div>
          <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Calf (cm)</label>
          <nz-input-number formControlName="calfCm" [nzMin]="1" class="!w-full !h-9 !rounded-xl"></nz-input-number>
        </div>
      </div>

      <!-- Check-in Photo -->
      <div class="space-y-1.5 pt-2 border-t border-gray-100 dark:border-gray-800">
        <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300">Initial check-in photo</label>
        @if (metricPhotoUrl()) {
          <div class="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 w-fit">
            <img [src]="metricPhotoUrl()" alt="Check-in preview" class="w-14 h-14 rounded-lg object-cover border border-blue-500" />
            <button nz-button nzType="text" nzDanger (click)="photoCleared.emit()" class="text-xs">
              <span nz-icon nzType="delete"></span> Remove
            </button>
          </div>
        } @else {
          <input
            type="file"
            accept="image/*"
            [disabled]="metricPhotoProcessing()"
            (change)="photoSelected.emit($event)"
            class="block w-full text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-gray-100 file:text-gray-700 dark:file:bg-gray-800 dark:file:text-gray-300 cursor-pointer"
          />
        }
      </div>

      <!-- BMI Preview -->
      @if (bmiPreview(); as bmi) {
        <div class="p-3 bg-blue-50/60 dark:bg-blue-950/20 rounded-xl border border-blue-100 dark:border-blue-900/40 flex items-center justify-between text-xs font-semibold">
          <span class="text-gray-700 dark:text-gray-300">Calculated BMI: {{ bmi.value }}</span>
          <nz-tag [nzColor]="bmi.color">{{ bmi.status }}</nz-tag>
        </div>
      }
    </div>
  `,
})
export class StepMeasurementsComponent {
  readonly form = input.required<FormGroup>();
  readonly metricPhotoUrl = input<string | null>(null);
  readonly metricPhotoProcessing = input(false);
  readonly bmiPreview = input<{ value: number; status: string; color: string } | null>(null);

  readonly photoSelected = output<Event>();
  readonly photoCleared = output<void>();

  readonly genderOptions = GENDERS;
  readonly bloodGroupOptions = BLOOD_GROUPS;
}
