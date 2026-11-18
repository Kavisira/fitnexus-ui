import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzTagModule } from 'ng-zorro-antd/tag';

import { FormResultsSummary, FormSubmission, FormTemplate } from '../../../../../core/forms/form-api.service';
import { answerText, fieldLabel, optionCountEntries } from '../services/forms-admin.utils';

/**
 * Results dialog for one template — aggregate summary (tab 1: average
 * per rating/number field, option-frequency counts for choice fields,
 * total submission count) plus the individual respondent list,
 * expandable to each person's full answers (tab 2). Mirrors the old
 * forms-admin.html's single results dialog, split into tabs per the
 * house pattern. A submission here is always tied to the one Member its
 * link was generated for — no cross-link to Leads.
 */
@Component({
  selector: 'app-results-modal',
  imports: [CommonModule, NzButtonModule, NzIconModule, NzModalModule, NzSkeletonModule, NzTabsModule, NzTagModule],
  template: `
    @if (template(); as t) {
      <nz-modal
        [nzVisible]="true"
        [nzTitle]="''"
        [nzFooter]="null"
        [nzWidth]="720"
        [nzClassName]="'results-modal'"
        [nzBodyStyle]="{ 'max-height': 'calc(100vh - 48px)', 'overflow-y': 'auto', padding: '0' }"
        (nzOnCancel)="close.emit()"
      >
        <div *nzModalContent>
          <!-- Header -->
          <div class="flex items-center gap-3 px-6 pt-5 pb-3 border-b border-gray-100 dark:border-gray-800">
            <span class="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/30 shrink-0 leading-none">
              <span nz-icon nzType="bar-chart" class="!text-base !leading-none text-blue-600 dark:text-blue-300"></span>
            </span>
            <div class="flex flex-col justify-center min-w-0">
              <h2 class="text-base font-bold m-0 leading-tight text-gray-900 dark:text-white truncate">{{ t.name }}</h2>
              <p class="text-xs m-0 leading-tight text-gray-500 dark:text-gray-400">Results &amp; respondents</p>
            </div>
          </div>

          <nz-tabs [nzTabBarStyle]="{ margin: '0', padding: '0 24px' }">
            <!-- ============ Tab 1 — Summary ============ -->
            <nz-tab nzTitle="Summary">
              <div class="px-6 pt-4 pb-5 space-y-4">
                @if (loading()) {
                  <nz-skeleton [nzActive]="true" [nzParagraph]="{ rows: 4 }"></nz-skeleton>
                } @else if (results(); as r) {
                  <section class="rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/30 p-4">
                    <h3 class="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                      <span nz-icon nzType="team" class="text-blue-600"></span>
                      Total Submissions
                    </h3>
                    <p class="text-2xl font-bold text-gray-900 dark:text-white m-0">{{ r.totalSubmissions }}</p>
                  </section>

                  @for (f of r.fields; track f.fieldId) {
                    <section class="rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/30 p-4">
                      <h3 class="text-sm font-semibold text-gray-900 dark:text-white mb-1">{{ f.label }}</h3>
                      <p class="text-xs text-gray-500 dark:text-gray-400 m-0">
                        @if (f.average !== undefined) {
                          Average {{ f.average }} ({{ f.count }} answered)
                        } @else {
                          {{ f.count }} answered
                        }
                      </p>
                      @if (f.optionCounts) {
                        <div class="flex flex-wrap gap-1.5 mt-2">
                          @for (entry of optionCountEntriesOf(f); track entry.option) {
                            <nz-tag class="!text-xs !m-0">{{ entry.option }}: {{ entry.count }}</nz-tag>
                          }
                        </div>
                      }
                    </section>
                  }
                }
              </div>
            </nz-tab>

            <!-- ============ Tab 2 — Respondents ============ -->
            <nz-tab [nzTitle]="'Respondents' + (submissions().length ? ' (' + submissions().length + ')' : '')">
              <div class="px-6 pt-4 pb-5 space-y-2">
                @if (!submissions().length) {
                  <div class="flex flex-col items-center justify-center gap-2 py-10 text-gray-400">
                    <span nz-icon nzType="team" class="text-2xl"></span>
                    <p class="text-xs m-0">No one has submitted this form yet.</p>
                  </div>
                } @else {
                  @for ( s of submissions(); track s.id) {
                    <div class="rounded-lg border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
                      <div
                        class="flex items-center justify-between gap-2 px-3 py-2.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/60"
                        (click)="toggle(s.id)"
                      >
                        <span class="text-sm font-semibold text-gray-900 dark:text-white truncate">{{ s.formShareLink.member.name }}</span>
                        <div class="flex items-center gap-2 shrink-0">
                          <span class="text-xs text-gray-500 dark:text-gray-400">{{ s.submittedAt | date: 'MMM d, y · h:mm a' }}</span>
                          <span nz-icon [nzType]="expandedId() === s.id ? 'up' : 'down'"></span>
                        </div>
                      </div>
                      @if (expandedId() === s.id) {
                        <div class="px-3 pb-3 pt-1 space-y-1.5 border-t border-gray-100 dark:border-gray-800">
                          @for (a of s.answers; track a.id) {
                            <div class="flex items-start justify-between gap-3 text-xs">
                              <span class="text-gray-500 dark:text-gray-400 shrink-0">{{ fieldLabelOf(a.formFieldId) }}</span>
                              <span class="text-gray-900 dark:text-white text-right">{{ answerTextOf(a) }}</span>
                            </div>
                          }
                        </div>
                      }
                    </div>
                  }
                }
              </div>
            </nz-tab>
          </nz-tabs>
        </div>
      </nz-modal>
    }
  `,
})
export class ResultsModalComponent {
  readonly template = input<FormTemplate | null>(null);
  readonly loading = input<boolean>(false);
  readonly results = input<FormResultsSummary | null>(null);
  readonly submissions = input<FormSubmission[]>([]);

  readonly close = output<void>();

  readonly expandedId = signal<string | null>(null);

  toggle(id: string): void {
    this.expandedId.set(this.expandedId() === id ? null : id);
  }

  optionCountEntriesOf(field: FormResultsSummary['fields'][number]) {
    return optionCountEntries(field);
  }

  fieldLabelOf(fieldId: string): string {
    return fieldLabel(this.template()?.fields ?? [], fieldId);
  }

  answerTextOf(answer: FormSubmission['answers'][number]): string {
    const field = this.template()?.fields.find((f) => f.id === answer.formFieldId);
    return answerText(answer, field);
  }
}
