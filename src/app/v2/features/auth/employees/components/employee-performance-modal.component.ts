import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSpinModule } from 'ng-zorro-antd/spin';

import { Employee } from '../../../../../core/employees/employee-api.service';
import { Appraisal, CreateAppraisalPayload, CreateReviewPayload, Review } from '../../../../../core/performance/performance-api.service';

@Component({
  selector: 'app-employee-performance-modal',
  imports: [
    CommonModule, FormsModule, NzModalModule, NzButtonModule, NzIconModule,
    NzTabsModule, NzInputModule, NzDatePickerModule, NzInputNumberModule, NzSelectModule, NzSpinModule,
  ],
  template: `
    @if (employee(); as emp) {
      <nz-modal
        [nzVisible]="true"
        [nzTitle]="'Performance: ' + emp.name"
        [nzFooter]="null"
        [nzWidth]="720"
        (nzOnCancel)="close.emit()"
      >
        <div *nzModalContent class="space-y-4 max-h-[75vh] overflow-y-auto p-1">
          <nz-tabs>
            <!-- REVIEWS TAB -->
            <nz-tab nzTitle="Performance Reviews">
              <div class="space-y-3 pt-2">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-bold text-gray-500 uppercase tracking-wider">Review History ({{ reviews().length }})</span>
                  <button nz-button nzType="primary" nzSize="small" (click)="showNewReview.set(!showNewReview())" class="!rounded-lg text-xs font-semibold !bg-blue-600">
                    <span nz-icon [nzType]="showNewReview() ? 'close' : 'plus'"></span>
                    <span>{{ showNewReview() ? 'Cancel' : 'Log Review' }}</span>
                  </button>
                </div>

                @if (showNewReview()) {
                  <div class="p-3.5 bg-gray-50 dark:bg-gray-800/60 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-3">
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Review Date</label>
                        <nz-date-picker [(ngModel)]="newReviewDate" class="w-full !h-8 !rounded-lg"></nz-date-picker>
                      </div>
                      <div>
                        <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Rating</label>
                        <nz-select [(ngModel)]="newReviewRating" [nzShowSearch]="true" nzPlaceHolder="Select rating" class="w-full !h-8">
                          <nz-option [nzLabel]="'★ 1 Star'" [nzValue]="1"></nz-option>
                          <nz-option [nzLabel]="'★★ 2 Stars'" [nzValue]="2"></nz-option>
                          <nz-option [nzLabel]="'★★★ 3 Stars'" [nzValue]="3"></nz-option>
                          <nz-option [nzLabel]="'★★★★ 4 Stars'" [nzValue]="4"></nz-option>
                          <nz-option [nzLabel]="'★★★★★ 5 Stars'" [nzValue]="5"></nz-option>
                        </nz-select>
                      </div>
                    </div>
                    <div>
                      <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Feedback / Notes</label>
                      <textarea nz-input [(ngModel)]="newReviewNotes" rows="3" placeholder="Performance feedback..." class="!rounded-lg"></textarea>
                    </div>
                    <div class="flex justify-end">
                      <button nz-button nzType="primary" (click)="saveReview()" [nzLoading]="savingReview()" [disabled]="!newReviewNotes.trim()" class="!rounded-lg text-xs font-semibold !bg-emerald-600">
                        Save Review
                      </button>
                    </div>
                  </div>
                }

                @if (loading()) {
                  <div class="py-8 text-center"><nz-spin></nz-spin></div>
                } @else if (reviews().length === 0) {
                  <div class="py-8 text-center text-xs text-gray-400">No performance reviews recorded yet.</div>
                } @else {
                  <div class="space-y-2.5">
                    @for (r of reviews(); track r.id) {
                      <div class="p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 text-xs space-y-1.5">
                        <div class="flex items-center justify-between">
                          <span class="font-bold text-gray-900 dark:text-white">{{ r.reviewDate | date:'mediumDate' }}</span>
                          <span class="text-amber-500 font-bold text-sm">{{ renderStars(r.rating) }}</span>
                        </div>
                        <p class="text-gray-700 dark:text-gray-300 mb-0 whitespace-pre-wrap">{{ r.notes }}</p>
                      </div>
                    }
                  </div>
                }
              </div>
            </nz-tab>

            <!-- APPRAISALS TAB -->
            <nz-tab nzTitle="Salary Appraisals">
              <div class="space-y-3 pt-2">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-bold text-gray-500 uppercase tracking-wider">Appraisal History ({{ appraisals().length }})</span>
                  <button nz-button nzType="primary" nzSize="small" (click)="showNewAppraisal.set(!showNewAppraisal())" class="!rounded-lg text-xs font-semibold !bg-blue-600">
                    <span nz-icon [nzType]="showNewAppraisal() ? 'close' : 'plus'"></span>
                    <span>{{ showNewAppraisal() ? 'Cancel' : 'New Appraisal' }}</span>
                  </button>
                </div>

                @if (showNewAppraisal()) {
                  <div class="p-3.5 bg-gray-50 dark:bg-gray-800/60 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-3">
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Effective Date</label>
                        <nz-date-picker [(ngModel)]="newAppraisalDate" class="w-full !h-8 !rounded-lg"></nz-date-picker>
                      </div>
                      <div>
                        <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">New Monthly Basic Pay (₹)</label>
                        <nz-input-number [(ngModel)]="newAppraisalPay" [nzMin]="0" [nzStep]="500" class="!w-full !h-8 !rounded-lg"></nz-input-number>
                      </div>
                    </div>
                    <div>
                      <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Appraisal Note / Reason</label>
                      <input nz-input [(ngModel)]="newAppraisalNote" placeholder="Annual increment, promotion..." class="!h-8 !rounded-lg" />
                    </div>
                    <div class="flex justify-end">
                      <button nz-button nzType="primary" (click)="saveAppraisal()" [nzLoading]="savingAppraisal()" [disabled]="!newAppraisalPay" class="!rounded-lg text-xs font-semibold !bg-emerald-600">
                        Commit Appraisal
                      </button>
                    </div>
                  </div>
                }

                @if (loading()) {
                  <div class="py-8 text-center"><nz-spin></nz-spin></div>
                } @else if (appraisals().length === 0) {
                  <div class="py-8 text-center text-xs text-gray-400">No salary appraisals recorded yet.</div>
                } @else {
                  <div class="space-y-2.5">
                    @for (a of appraisals(); track a.id) {
                      <div class="p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 text-xs flex items-center justify-between">
                        <div>
                          <div class="font-bold text-gray-900 dark:text-white">Effective: {{ a.effectiveDate | date:'mediumDate' }}</div>
                          @if (a.note) { <div class="text-gray-500">{{ a.note }}</div> }
                        </div>
                        <div class="font-bold text-emerald-600 text-sm">₹{{ a.newBasicPay }} / mo</div>
                      </div>
                    }
                  </div>
                }
              </div>
            </nz-tab>
          </nz-tabs>
        </div>
      </nz-modal>
    }
  `,
})
export class EmployeePerformanceModalComponent {
  readonly employee = input<Employee | null>(null);
  readonly reviews = input<Review[]>([]);
  readonly appraisals = input<Appraisal[]>([]);
  readonly loading = input<boolean>(false);
  readonly savingReview = input<boolean>(false);
  readonly savingAppraisal = input<boolean>(false);

  readonly close = output<void>();
  readonly createReview = output<CreateReviewPayload>();
  readonly createAppraisal = output<CreateAppraisalPayload>();

  readonly showNewReview = signal(false);
  newReviewDate = new Date();
  newReviewRating: number | null = null;
  newReviewNotes = '';

  readonly showNewAppraisal = signal(false);
  newAppraisalDate = new Date();
  newAppraisalPay: number | null = null;
  newAppraisalNote = '';

  renderStars(rating: number | null): string {
    if (!rating) return '';
    return '★'.repeat(rating) + '☆'.repeat(Math.max(0, 5 - rating));
  }

  saveReview(): void {
    const emp = this.employee();
    if (!emp || !this.newReviewNotes.trim()) return;
    this.createReview.emit({
      employeeId: emp.id, reviewDate: this.newReviewDate.toISOString().slice(0, 10),
      rating: this.newReviewRating ?? undefined, notes: this.newReviewNotes.trim(),
    });
    this.newReviewNotes = '';
    this.showNewReview.set(false);
  }

  saveAppraisal(): void {
    const emp = this.employee();
    if (!emp || !this.newAppraisalPay) return;
    this.createAppraisal.emit({
      employeeId: emp.id, effectiveDate: this.newAppraisalDate.toISOString().slice(0, 10),
      newBasicPay: String(this.newAppraisalPay), note: this.newAppraisalNote.trim() || undefined,
    });
    this.newAppraisalNote = '';
    this.showNewAppraisal.set(false);
  }
}

