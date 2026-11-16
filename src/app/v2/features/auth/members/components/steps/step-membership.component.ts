import { Component, OnInit, computed, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzInputModule } from 'ng-zorro-antd/input';
import { Branch } from '../../../../../../core/branches/branch-api.service';
import { Plan } from '../../../../../../core/plans/plan-api.service';
import { Offer } from '../../../../../../core/offers/offer-api.service';
import { Employee } from '../../../../../../core/employees/employee-api.service';
import { Member } from '../../../../../../core/members/member-api.service';

@Component({
  selector: 'app-step-membership',
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule, NzSelectModule,
    NzDatePickerModule, NzCheckboxModule, NzRadioModule, NzInputModule,
  ],
  template: `
    <div [formGroup]="form()" class="space-y-4">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div>
          <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Branch *</label>
          <nz-select formControlName="branchId" (ngModelChange)="onBranchChange($event)" [nzShowSearch]="true" nzPlaceHolder="Select branch" class="w-full !h-9">
            @for (b of branches(); track b.id) {
              <nz-option [nzLabel]="b.location" [nzValue]="b.id"></nz-option>
            }
          </nz-select>
        </div>
        <div>
          <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Membership plan *</label>
          <nz-select formControlName="planId" [nzShowSearch]="true" nzPlaceHolder="Select plan" class="w-full !h-9">
            @for (p of branchPlans(); track p.id) {
              <nz-option [nzLabel]="p.name + (p.price ? ' (' + p.price + ')' : '')" [nzValue]="p.id"></nz-option>
            }
          </nz-select>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div>
          <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Special offer</label>
          <nz-select formControlName="offerId" [nzShowSearch]="true" nzPlaceHolder="No offer applied" class="w-full !h-9" [nzAllowClear]="true">
            @for (o of activeOffers(); track o.id) {
              <nz-option [nzLabel]="o.name" [nzValue]="o.id"></nz-option>
            }
          </nz-select>
        </div>
        <div>
          <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
            Trainer {{ form().get('hasPersonalTrainer')?.value ? '*' : '' }}
          </label>
          <nz-select formControlName="assignedTrainerEmployeeId" [nzShowSearch]="true" nzPlaceHolder="No trainer assigned" class="w-full !h-9" [nzAllowClear]="true">
            @for (e of branchTrainers(); track e.id) {
              <nz-option [nzLabel]="e.name" [nzValue]="e.id"></nz-option>
            }
          </nz-select>
        </div>
      </div>

      <div class="p-3 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <label nz-checkbox formControlName="hasPersonalTrainer" (ngModelChange)="ptToggled.emit()">
          <span class="text-xs font-semibold text-gray-900 dark:text-white">Personal trainer assigned</span>
        </label>
        <span class="text-[11px] text-gray-500">Configure PT package in the next step</span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div>
          <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Start date *</label>
          <nz-date-picker formControlName="startDate" class="w-full !h-9 !rounded-xl"></nz-date-picker>
        </div>
        <div>
          <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">End date</label>
          <div class="h-9 px-3.5 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center text-xs text-gray-800 dark:text-gray-200 font-medium">
            {{ endDate() ? (endDate() | date: 'MMM d, y') : '—' }}
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-center">
        <label nz-checkbox formControlName="isTrial">
          <span class="text-xs font-semibold text-gray-900 dark:text-white">Trial membership</span>
        </label>
        @if (isEditing()) {
          <div>
            <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Member status</label>
            <nz-select formControlName="status" [nzShowSearch]="true" class="w-full !h-9">
              <nz-option nzLabel="Active" nzValue="ACTIVE"></nz-option>
              <nz-option nzLabel="Inactive" nzValue="INACTIVE"></nz-option>
            </nz-select>
          </div>
        }
      </div>

      @if (!isEditing() && isCoupleOffer()) {
        <div class="p-3.5 bg-blue-50/60 dark:bg-blue-950/20 rounded-2xl border border-blue-100 dark:border-blue-900/40 space-y-3">
          <div class="text-xs font-bold text-blue-900 dark:text-blue-300">Couple Partner Details</div>
          <nz-radio-group [ngModel]="partnerMode()" (ngModelChange)="partnerModeChange.emit($event)" [ngModelOptions]="{standalone: true}" class="flex gap-4">
            <label nz-radio nzValue="new">New partner</label>
            <label nz-radio nzValue="existing">Existing member</label>
          </nz-radio-group>
          @if (partnerMode() === 'new') {
            <div [formGroup]="partnerForm()" class="space-y-3 pt-2">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Partner name *</label>
                  <input nz-input formControlName="name" placeholder="Partner full name" class="!h-9 !rounded-xl" />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Partner phone *</label>
                  <input nz-input formControlName="phone" placeholder="Partner phone" class="!h-9 !rounded-xl" />
                </div>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Partner email</label>
                  <input nz-input formControlName="email" placeholder="Partner email" class="!h-9 !rounded-xl" />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Partner price</label>
                  <div class="h-9 px-3.5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center text-xs font-bold text-blue-600">
                    {{ partnerPrice() ?? '—' }}
                  </div>
                </div>
              </div>
            </div>
          } @else {
            <div class="space-y-2 pt-2">
              <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Select existing member *</label>
              <nz-select [ngModel]="partnerMemberId()" (ngModelChange)="partnerMemberIdChange.emit($event)" [nzShowSearch]="true" nzPlaceHolder="Choose partner member" class="w-full !h-9" [nzAllowClear]="true">
                @for (m of existingMemberOptions(); track m.value) {
                  <nz-option [nzLabel]="m.label" [nzValue]="m.value"></nz-option>
                }
              </nz-select>
              <div class="text-xs font-bold text-blue-600">Partner Fee: {{ partnerPrice() ?? '—' }}</div>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class StepMembershipComponent implements OnInit {
  readonly form = input.required<FormGroup>();
  readonly partnerForm = input.required<FormGroup>();
  readonly branches = input.required<Branch[]>();
  readonly plans = input.required<Plan[]>();
  readonly offers = input.required<Offer[]>();
  readonly employees = input.required<Employee[]>();
  readonly allMembers = input<Member[]>([]);
  readonly isEditing = input(false);
  readonly selectedBranchId = input<string>('');
  readonly partnerMode = input<'new' | 'existing'>('new');
  readonly partnerMemberId = input<string | null>(null);
  readonly endDate = input<Date | null>(null);
  readonly partnerPrice = input<string | null>(null);
  readonly isCoupleOffer = input(false);

  readonly partnerModeChange = output<'new' | 'existing'>();
  readonly partnerMemberIdChange = output<string | null>();
  readonly ptToggled = output<void>();

  readonly currentBranchId = signal<string>('');

  ngOnInit(): void {
    const existing = this.form().get('branchId')?.value || this.selectedBranchId();
    if (existing) {
      this.currentBranchId.set(existing);
    } else if (this.branches().length === 1) {
      const singleId = this.branches()[0].id;
      this.currentBranchId.set(singleId);
      this.form().patchValue({ branchId: singleId });
    }
  }

  onBranchChange(branchId: string): void {
    this.currentBranchId.set(branchId);
    this.form().get('branchId')?.setValue(branchId);
  }

  readonly branchPlans = computed(() => {
    const bId = this.currentBranchId() || this.form().get('branchId')?.value || this.selectedBranchId();
    const all = this.plans();
    if (!bId) return all;
    const filtered = all.filter(p => p.branchId === bId);
    return filtered.length > 0 ? filtered : all;
  });

  readonly branchTrainers = computed(() => {
    const bId = this.currentBranchId() || this.form().get('branchId')?.value || this.selectedBranchId();
    const all = this.employees();
    if (!bId) return all;
    const filtered = all.filter(e => e.branchId === bId);
    return filtered.length > 0 ? filtered : all;
  });

  readonly activeOffers = computed(() => this.offers().filter(o => o.isActive));

  readonly existingMemberOptions = computed(() => {
    return this.allMembers()
      .filter(m => !m.partnerMemberId)
      .map(m => ({ label: `${m.name} (${m.phone})`, value: m.id }));
  });
}
