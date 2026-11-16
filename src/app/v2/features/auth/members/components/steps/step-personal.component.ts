import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { MEMBER_SOURCES } from '../../../../../../core/constants/member-sources';

@Component({
  selector: 'app-step-personal',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NzInputModule,
    NzSelectModule,
    NzButtonModule,
    NzIconModule,
  ],
  template: `
    <div [formGroup]="form()" class="space-y-4">
      <!-- Profile photo -->
      <div class="space-y-1.5">
        <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300">Profile photo</label>
        @if (photoUrl()) {
          <div class="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 w-fit">
            <img [src]="photoUrl()" alt="Profile preview" class="w-16 h-16 rounded-full object-cover border border-blue-500" />
            <button nz-button nzType="text" nzDanger (click)="photoCleared.emit()" class="text-xs">
              <span nz-icon nzType="delete"></span> Remove
            </button>
          </div>
        } @else {
          <input
            type="file"
            accept="image/*"
            [disabled]="photoProcessing()"
            (change)="photoSelected.emit($event)"
            class="block w-full text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-600 dark:file:bg-blue-950 dark:file:text-blue-400 cursor-pointer"
          />
        }
        <p class="text-[11px] text-gray-500 dark:text-gray-400">
          Clear face photo so staff can recognize the member at the front desk and on check-in.
        </p>
      </div>

      <!-- Row 1: Name & Phone -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div>
          <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Full name *</label>
          <input
            nz-input
            type="text"
            formControlName="name"
            placeholder="e.g. John Doe"
            class="!h-9 !rounded-xl"
            [class.!border-red-500]="form().get('name')?.invalid && form().get('name')?.touched"
          />
          @if (form().get('name')?.invalid && form().get('name')?.touched) {
            <span class="text-[11px] text-red-500 mt-0.5 block">Full name is required (min 2 chars).</span>
          }
        </div>

        <div>
          <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Phone number *</label>
          <input
            nz-input
            type="tel"
            formControlName="phone"
            placeholder="e.g. +91 98765 43210"
            class="!h-9 !rounded-xl"
            [class.!border-red-500]="form().get('phone')?.invalid && form().get('phone')?.touched"
          />
          @if (form().get('phone')?.invalid && form().get('phone')?.touched) {
            <span class="text-[11px] text-red-500 mt-0.5 block">Phone number is required.</span>
          }
        </div>
      </div>

      <!-- Row 2: Email & Source -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div>
          <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Email address</label>
          <input
            nz-input
            type="email"
            formControlName="email"
            placeholder="john@example.com"
            class="!h-9 !rounded-xl"
          />
        </div>

        <div>
          <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Lead source</label>
          <nz-select formControlName="source" [nzShowSearch]="true" nzPlaceHolder="Select lead source" class="w-full !h-9" [nzAllowClear]="true">
            @for (opt of sourceOptions; track opt.value) {
              <nz-option [nzLabel]="opt.label" [nzValue]="opt.value"></nz-option>
            }
          </nz-select>
        </div>
      </div>
    </div>
  `,
})
export class StepPersonalComponent {
  readonly form = input.required<FormGroup>();
  readonly photoUrl = input<string | null>(null);
  readonly photoProcessing = input(false);

  readonly photoSelected = output<Event>();
  readonly photoCleared = output<void>();

  readonly sourceOptions = MEMBER_SOURCES;
}

