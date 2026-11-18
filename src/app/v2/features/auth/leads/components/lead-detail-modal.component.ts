import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTimelineModule } from 'ng-zorro-antd/timeline';

import { Lead, LeadPayload, LeadStatus } from '../../../../../core/leads/lead-api.service';
import { LEAD_SOURCES } from '../../../../../core/constants/lead-sources';
import {
  ACTIVE_STATUS_OPTIONS,
  CONCLUDE_OUTCOME_OPTIONS,
  LeadDetailFormValue,
  statusColor,
  statusLabel,
  validateLeadDetailForm,
} from '../services/lead.utils';

const LABEL = 'block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1';

/**
 * Detail dialog — doubles as the edit form (tab 1) and the follow-up
 * activity timeline (tab 2), exactly like the old leads.ts/.html: a
 * persisted lead always has both, so they live in one dialog rather
 * than being split into separate components.
 *
 * "Conclude" takes over status entirely when checked: it picks the
 * outcome (Converted/Lost) and requires a non-empty comment — both
 * client-side (validateLeadDetailForm) and server-side
 * (LeadsService.update), a hard block in both places. Unchecking a
 * previously-concluded lead reopens it back to Contacted.
 */
@Component({
  selector: 'app-lead-detail-modal',
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule, NzAlertModule, NzButtonModule,
    NzDatePickerModule, NzIconModule, NzInputModule, NzModalModule, NzSelectModule,
    NzTabsModule, NzTagModule, NzTimelineModule,
  ],
  template: `
    @if (lead(); as leadVal) {
      <nz-modal
        [nzVisible]="true"
        [nzTitle]="''"
        [nzFooter]="null"
        [nzWidth]="780"
        [nzClassName]="'lead-detail-modal'"
        [nzBodyStyle]="{ 'max-height': 'calc(100vh - 48px)', 'overflow-y': 'auto', padding: '0' }"
        (nzOnCancel)="close.emit()"
      >
        <div *nzModalContent>
          <!-- Header -->
          <div class="flex items-center gap-3 px-6 pt-5 pb-3 border-b border-gray-100 dark:border-gray-800">
            <span class="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/30 shrink-0 leading-none">
              <span nz-icon nzType="idcard" class="!text-base !leading-none text-blue-600 dark:text-blue-300"></span>
            </span>
            <div class="flex flex-col justify-center min-w-0">
              <h2 class="text-base font-bold m-0 leading-tight text-gray-900 dark:text-white truncate">{{ leadVal.name }}</h2>
              <p class="text-xs m-0 leading-tight text-gray-500 dark:text-gray-400">Lead details &amp; follow-up history</p>
            </div>
          </div>

          <nz-tabs [nzTabBarStyle]="{ margin: '0', padding: '0 24px' }" [nzSelectedIndex]="initialTab()">
            <!-- ============ Tab 1 — Lead details ============ -->
            <nz-tab nzTitle="Lead Details">
              <form [formGroup]="form" (ngSubmit)="submit()" novalidate class="px-6 pt-4 pb-5 space-y-4">
                <section class="rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/30 p-4">
                  <h3 class="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">
                    <span nz-icon nzType="idcard" class="text-blue-600"></span>
                    Contact
                  </h3>
                  <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label [class]="labelClass" for="d-name">Name *</label>
                      <input nz-input id="d-name" formControlName="name" class="!h-9 !rounded-lg" />
                    </div>
                    <div>
                      <label [class]="labelClass" for="d-phone">Phone *</label>
                      <input nz-input id="d-phone" type="tel" formControlName="phone" class="!h-9 !rounded-lg" />
                    </div>
                    <div>
                      <label [class]="labelClass" for="d-email">Email</label>
                      <input nz-input id="d-email" type="email" formControlName="email" class="!h-9 !rounded-lg" />
                    </div>
                  </div>
                </section>

                <section class="rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/30 p-4">
                  <h3 class="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">
                    <span nz-icon nzType="team" class="text-blue-600"></span>
                    Assignment
                  </h3>
                  <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label [class]="labelClass" for="d-branch">Branch *</label>
                      <nz-select
                        id="d-branch" formControlName="branchId" [nzShowSearch]="canReadBranches()"
                        [nzDisabled]="!canReadBranches()" class="w-full"
                      >
                        @for (b of branchOptions(); track b.value) {
                          <nz-option [nzLabel]="b.label" [nzValue]="b.value"></nz-option>
                        }
                      </nz-select>
                    </div>
                    <div>
                      <label [class]="labelClass" for="d-source">Source</label>
                      <nz-select id="d-source" formControlName="source" class="w-full">
                        @for (s of sourceOptions; track s.value) {
                          <nz-option [nzLabel]="s.label" [nzValue]="s.value"></nz-option>
                        }
                      </nz-select>
                    </div>
                    <div>
                      <label [class]="labelClass" for="d-assignedTo">Assigned To</label>
                      <nz-select
                        id="d-assignedTo" formControlName="assignedToEmployeeId" [nzShowSearch]="canReadEmployees()"
                        [nzAllowClear]="canReadEmployees()" [nzDisabled]="!canReadEmployees()"
                        nzPlaceHolder="Unassigned" class="w-full"
                      >
                        @for (e of employeeOptions(); track e.value) {
                          <nz-option [nzLabel]="e.label" [nzValue]="e.value"></nz-option>
                        }
                      </nz-select>
                    </div>
                  </div>
                </section>

                <section class="rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/30 p-4">
                  <h3 class="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">
                    <span nz-icon nzType="star" class="text-blue-600"></span>
                    Interest &amp; Status
                  </h3>
                  <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label [class]="labelClass" for="d-interestedPlan">Interested Plan</label>
                      <input nz-input id="d-interestedPlan" formControlName="interestedPlan" class="!h-9 !rounded-lg" />
                    </div>
                    <div>
                      @if (!form.controls.concludeChecked.value) {
                        <label [class]="labelClass" for="d-status">Status</label>
                        <nz-select id="d-status" formControlName="status" class="w-full">
                          @for (s of activeStatusOptions; track s.value) {
                            <nz-option [nzLabel]="s.label" [nzValue]="s.value"></nz-option>
                          }
                        </nz-select>
                      } @else {
                        <label [class]="labelClass">Status</label>
                        <nz-tag [nzColor]="outcomeColor()">{{ outcomeLabel() }}</nz-tag>
                      }
                    </div>
                    <div>
                      <label [class]="labelClass" for="d-nextFollowUpAt">Next Follow-up</label>
                      <nz-date-picker
                        id="d-nextFollowUpAt" formControlName="nextFollowUpAt" [nzShowTime]="{ nzFormat: 'h:mm a' }"
                        nzFormat="MMM d, y h:mm a" class="w-full !h-9 !rounded-lg"
                      ></nz-date-picker>
                    </div>
                  </div>

                  <!-- Conclude — checking it asks for the outcome and a
                       required comment; unchecking a previously-concluded
                       lead reopens it back to Contacted. -->
                  <div class="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                    <label class="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">
                      <input type="checkbox" formControlName="concludeChecked" class="rounded" />
                      Conclude this lead
                    </label>

                    @if (form.controls.concludeChecked.value) {
                      <div class="mt-3 flex items-center gap-4">
                        @for (opt of concludeOutcomeOptions; track opt.value) {
                          <label class="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                            <input type="radio" formControlName="concludeOutcome" [value]="opt.value" />
                            {{ opt.label }}
                          </label>
                        }
                      </div>

                      <div class="mt-3">
                        <label [class]="labelClass" for="d-concludeComment">
                          {{ form.controls.concludeOutcome.value === 'LOST' ? 'Reason for loss' : 'Conversion comment' }} *
                        </label>
                        <textarea
                          nz-input id="d-concludeComment" formControlName="concludeComment" rows="2"
                          placeholder="Required — explain the outcome"
                          class="!rounded-lg"
                        ></textarea>
                      </div>
                    }
                  </div>
                </section>

                @if (errorMessage(); as err) {
                  <nz-alert nzType="error" [nzMessage]="err" nzShowIcon class="!py-2"></nz-alert>
                }

                <div class="flex justify-end gap-2 pt-1">
                  <button nz-button type="button" nzType="default" (click)="close.emit()" class="!rounded-lg !h-9 !px-4">Close</button>
                  @if (canWrite()) {
                    <button nz-button type="submit" nzType="primary" [nzLoading]="saving()" class="!rounded-lg !h-9 !px-4 !bg-blue-700 hover:!bg-blue-800">
                      Save Changes
                    </button>
                  }
                </div>
              </form>
            </nz-tab>

            <!-- ============ Tab 2 — Follow-up history ============ -->
            <nz-tab [nzTitle]="'Follow-up History' + (leadVal.activities?.length ? ' (' + leadVal.activities!.length + ')' : '')">
              <div class="px-6 pt-4 pb-5 space-y-4">
                @if (canWrite()) {
                  <section class="rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/30 p-4">
                    <h3 class="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">
                      <span nz-icon nzType="file-text" class="text-blue-600"></span>
                      Log a Follow-up Note
                    </h3>
                    <div class="space-y-3">
                      <div>
                        <label [class]="labelClass" for="d-note">Note *</label>
                        <textarea
                          nz-input id="d-note" rows="3" placeholder="What happened on this follow-up?"
                          class="!rounded-lg !resize-none"
                          [ngModel]="noteText()" (ngModelChange)="noteText.set($event)"
                        ></textarea>
                      </div>
                      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                        <div class="sm:col-span-2">
                          <label [class]="labelClass">Next Follow-up (optional)</label>
                          <nz-date-picker
                            class="w-full !h-9 !rounded-lg" [nzShowTime]="{ nzFormat: 'h:mm a' }" nzFormat="MMM d, y h:mm a"
                            nzPlaceHolder="Set a reminder date"
                            [ngModel]="noteFollowUpAt()" (ngModelChange)="noteFollowUpAt.set($event)"
                          ></nz-date-picker>
                        </div>
                        <button
                          nz-button nzType="primary" [disabled]="!noteText().trim()" [nzLoading]="savingNote()"
                          (click)="submitNote()"
                          class="!rounded-lg !h-9 !px-4 !w-full !inline-flex !items-center !justify-center gap-1.5 !bg-blue-700 hover:!bg-blue-800"
                        >
                          <span nz-icon nzType="plus"></span>
                          <span>Add Note</span>
                        </button>
                      </div>
                    </div>
                  </section>
                }

                <section class="rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/30 p-4">
                  <h3 class="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-4">
                    <span nz-icon nzType="clock-circle" class="text-blue-600"></span>
                    Timeline
                  </h3>

                  @if (leadVal.activities && leadVal.activities.length) {
                    <div class="max-h-[320px] overflow-y-auto pr-1">
                      <nz-timeline>
                        @for (activity of leadVal.activities; track activity.id) {
                          <nz-timeline-item nzColor="blue">
                            <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-700 p-3 -mt-1">
                              <p class="text-sm text-gray-700 dark:text-gray-300 m-0 leading-snug">{{ activity.note }}</p>
                              @if (activity.nextFollowUpAt) {
                                <p class="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-300 font-medium mt-1.5 mb-0">
                                  <span nz-icon nzType="calendar" class="shrink-0"></span>
                                  Follow-up set: {{ activity.nextFollowUpAt | date: 'MMM d, y · h:mm a' }}
                                </p>
                              }
                              <p class="text-[11px] text-gray-400 mt-1.5 mb-0">{{ activity.createdAt | date: 'MMM d, y · h:mm a' }}</p>
                            </div>
                          </nz-timeline-item>
                        }
                      </nz-timeline>
                    </div>
                  } @else {
                    <div class="flex flex-col items-center justify-center gap-2 py-10 text-gray-400">
                      <span nz-icon nzType="file-text" class="text-2xl"></span>
                      <p class="text-xs m-0">No follow-up notes logged yet.</p>
                    </div>
                  }
                </section>
              </div>
            </nz-tab>
          </nz-tabs>
        </div>
      </nz-modal>
    }
  `,
})
export class LeadDetailModalComponent implements OnInit {
  private fb = inject(FormBuilder);

  readonly lead = input<Lead | null>(null);
  readonly saving = input<boolean>(false);
  readonly savingNote = input<boolean>(false);
  readonly serverError = input<string | null>(null);
  readonly canWrite = input<boolean>(true);
  readonly branchOptions = input<{ label: string; value: string }[]>([]);
  readonly employeeOptions = input<{ label: string; value: string }[]>([]);
  readonly canReadBranches = input<boolean>(true);
  readonly canReadEmployees = input<boolean>(true);
  // 0 = Lead Details (default), 1 = Follow-up History — set by the
  // card grid's dedicated history icon so it opens straight to the tab.
  readonly initialTab = input<number>(0);

  readonly close = output<void>();
  readonly save = output<Partial<LeadPayload>>();
  readonly addNote = output<{ note: string; nextFollowUpAt: Date | null }>();

  readonly labelClass = LABEL;
  readonly sourceOptions = LEAD_SOURCES;
  readonly activeStatusOptions = ACTIVE_STATUS_OPTIONS;
  readonly concludeOutcomeOptions = CONCLUDE_OUTCOME_OPTIONS;
  readonly localError = signal<string | null>(null);

  readonly noteText = signal('');
  readonly noteFollowUpAt = signal<Date | null>(null);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    phone: ['', [Validators.required, Validators.minLength(5)]],
    email: ['', [Validators.email]],
    branchId: ['', [Validators.required]],
    source: [''],
    interestedPlan: [''],
    assignedToEmployeeId: [null as string | null],
    status: ['NEW' as LeadStatus],
    concludeChecked: [false],
    concludeOutcome: ['CONVERTED' as 'CONVERTED' | 'LOST'],
    concludeComment: [''],
    nextFollowUpAt: [null as Date | null],
  });

  errorMessage(): string | null {
    return this.localError() ?? this.serverError();
  }

  outcomeLabel(): string {
    return statusLabel(this.form.controls.concludeOutcome.value);
  }

  outcomeColor() {
    return statusColor(this.form.controls.concludeOutcome.value);
  }

  submitNote(): void {
    const note = this.noteText().trim();
    if (!note) {
      return;
    }
    this.addNote.emit({ note, nextFollowUpAt: this.noteFollowUpAt() });
  }

  /** Called by the page once addNote's request succeeds, so the form
   * clears only after the note is actually saved (matches the old
   * leads.ts addNote behavior). */
  resetNoteForm(): void {
    this.noteText.set('');
    this.noteFollowUpAt.set(null);
  }

  ngOnInit(): void {
    this.applyLead();
  }

  private applyLead(): void {
    const lead = this.lead();
    if (!lead) {
      return;
    }
    const concluded = lead.status === 'CONVERTED' || lead.status === 'LOST';
    this.form.reset({
      name: lead.name,
      phone: lead.phone,
      email: lead.email ?? '',
      branchId: lead.branchId,
      source: lead.source ?? '',
      interestedPlan: lead.interestedPlan ?? '',
      assignedToEmployeeId: lead.assignedToEmployeeId ?? null,
      // If not concluded, keep whatever active-pipeline status it's on;
      // if concluded, this just isn't used by the dropdown but stays a
      // sane fallback.
      status: concluded ? 'NEW' : lead.status,
      concludeChecked: concluded,
      concludeOutcome: lead.status === 'LOST' ? 'LOST' : 'CONVERTED',
      concludeComment: lead.status === 'LOST' ? (lead.lostReason ?? '') : (lead.concludeComment ?? ''),
      nextFollowUpAt: lead.nextFollowUpAt ? new Date(lead.nextFollowUpAt) : null,
    });
  }

  submit(): void {
    const lead = this.lead();
    if (!lead) {
      return;
    }
    const raw = this.form.getRawValue() as LeadDetailFormValue;
    const err = validateLeadDetailForm(raw);
    this.localError.set(err);
    if (err) {
      this.form.markAllAsTouched();
      return;
    }

    // "Conclude" takes over status entirely when checked: pick the
    // outcome (Converted/Lost) and send its comment. Unchecking a
    // previously-concluded lead reopens it back to Contacted and clears
    // both comment fields — everything else is a normal active-pipeline
    // edit via the status dropdown. Mirrors the old leads.ts saveDetail.
    let status: LeadStatus = raw.status;
    let lostReason: string | null | undefined;
    let concludeComment: string | null | undefined;

    if (raw.concludeChecked) {
      status = raw.concludeOutcome;
      const comment = raw.concludeComment.trim();
      if (status === 'LOST') {
        lostReason = comment;
        concludeComment = null;
      } else {
        concludeComment = comment;
        lostReason = null;
      }
    } else if (lead.status === 'CONVERTED' || lead.status === 'LOST') {
      status = 'CONTACTED';
      lostReason = null;
      concludeComment = null;
    }

    this.save.emit({
      name: raw.name.trim(),
      phone: raw.phone.trim(),
      email: raw.email || undefined,
      branchId: raw.branchId,
      source: raw.source || undefined,
      interestedPlan: raw.interestedPlan || undefined,
      assignedToEmployeeId: raw.assignedToEmployeeId || null,
      status,
      lostReason,
      concludeComment,
      nextFollowUpAt: raw.nextFollowUpAt ? raw.nextFollowUpAt.toISOString() : null,
    });
  }
}
