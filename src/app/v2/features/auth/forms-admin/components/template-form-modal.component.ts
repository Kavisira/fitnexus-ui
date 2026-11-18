import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';

import { FormFieldInput } from '../../../../../core/forms/form-api.service';
import {
  CHOICE_TYPES,
  FIELD_TYPE_OPTIONS,
  MAX_FIELDS,
  MAX_OPTIONS_PER_FIELD,
  TemplateFieldDraft,
  newFieldDraft,
  splitOptions,
  validateTemplateDraft,
} from '../services/forms-admin.utils';

const LABEL = 'block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1';

/**
 * Create-template dialog — builds a reusable, org-wide survey/feedback
 * form template: a name, optional description, and a list of fields
 * (label, type, required flag, and a comma-separated option list for
 * choice types). Mirrors the old forms-admin.ts/.html exactly — see
 * CreateFormTemplateDto on the backend for the field-count/option-count
 * limits enforced here too (soft-cap) and there (hard block).
 */
@Component({
  selector: 'app-template-form-modal',
  imports: [
    CommonModule, FormsModule, NzAlertModule, NzButtonModule, NzCheckboxModule,
    NzIconModule, NzInputModule, NzModalModule, NzSelectModule, NzTooltipModule,
  ],
  template: `
    <nz-modal
      [nzVisible]="true"
      [nzTitle]="''"
      [nzFooter]="null"
      [nzWidth]="720"
      [nzClassName]="'template-form-modal'"
      [nzBodyStyle]="{ 'max-height': 'calc(100vh - 48px)', 'overflow-y': 'auto', padding: '0' }"
      (nzOnCancel)="cancel.emit()"
    >
      <div *nzModalContent>
        <!-- Header -->
        <div class="flex items-center gap-3 px-6 pt-5 pb-3 border-b border-gray-100 dark:border-gray-800">
          <span class="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/30 shrink-0 leading-none">
            <span nz-icon nzType="solution" class="!text-base !leading-none text-blue-600 dark:text-blue-300"></span>
          </span>
          <div class="flex flex-col justify-center">
            <h2 class="text-base font-bold m-0 leading-tight text-gray-900 dark:text-white">New Form</h2>
            <p class="text-xs m-0 leading-tight text-gray-500 dark:text-gray-400">Build a reusable feedback/survey template</p>
          </div>
        </div>

        <div class="px-6 py-4 space-y-4">
          <section class="rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/30 p-4">
            <h3 class="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">
              <span nz-icon nzType="idcard" class="text-blue-600"></span>
              Details
            </h3>
            <div class="grid grid-cols-1 gap-3">
              <div>
                <label [class]="labelClass" for="f-name">Form name *</label>
                <input nz-input id="f-name" [ngModel]="name()" (ngModelChange)="name.set($event)" class="!h-9 !rounded-lg" />
              </div>
              <div>
                <label [class]="labelClass" for="f-description">Description (optional)</label>
                <textarea
                  nz-input id="f-description" rows="2" class="!rounded-lg !resize-none"
                  [ngModel]="description()" (ngModelChange)="description.set($event)"
                ></textarea>
              </div>
            </div>
          </section>

          <section class="rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/30 p-4">
            <div class="flex items-center justify-between mb-3">
              <h3 class="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                <span nz-icon nzType="table" class="text-blue-600"></span>
                Fields ({{ fields().length }}/{{ maxFields }})
              </h3>
            </div>

            <div class="space-y-2">
              @for (field of fields(); track $index) {
                <div class="rounded-lg border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 p-3">
                  <div class="grid grid-cols-1 sm:grid-cols-12 gap-2 items-start">
                    <div class="sm:col-span-5">
                      <input
                        nz-input placeholder="Question / label" class="!h-9 !rounded-lg"
                        [ngModel]="field.label" (ngModelChange)="updateField($index, { label: $event })"
                      />
                    </div>
                    <div class="sm:col-span-3">
                      <nz-select
                        class="w-full" [ngModel]="field.type"
                        (ngModelChange)="updateField($index, { type: $event })"
                      >
                        @for (opt of fieldTypeOptions; track opt.value) {
                          <nz-option [nzLabel]="opt.label" [nzValue]="opt.value"></nz-option>
                        }
                      </nz-select>
                    </div>
                    <div class="sm:col-span-2 flex items-center h-9">
                      <label nz-checkbox [ngModel]="field.required" (ngModelChange)="updateField($index, { required: $event })">
                        <span class="text-xs">Required</span>
                      </label>
                    </div>
                    <div class="sm:col-span-2 flex items-center justify-end h-9">
                      <button nz-button nzType="text" nzShape="circle" nzDanger nz-tooltip nzTooltipTitle="Remove field" (click)="removeField($index)">
                        <span nz-icon nzType="delete"></span>
                      </button>
                    </div>

                    @if (isChoiceType(field.type)) {
                      <div class="sm:col-span-12">
                        <input
                          nz-input placeholder="Options, comma separated (max {{ maxOptions }})" class="!h-9 !rounded-lg"
                          [ngModel]="field.optionsText" (ngModelChange)="updateField($index, { optionsText: $event })"
                      />
                    </div>
                    }
                  </div>
                </div>
              } @empty {
                <div class="flex flex-col items-center justify-center gap-2 py-8 text-gray-400">
                  <span nz-icon nzType="table" class="text-2xl"></span>
                  <p class="text-xs m-0">No fields yet — add at least one.</p>
                </div>
              }
            </div>

            <button
              nz-button nzType="default" size="small" [disabled]="fields().length >= maxFields"
              class="!rounded-lg !mt-3 !inline-flex !items-center gap-1.5"
              (click)="addField()"
            >
              <span nz-icon nzType="plus"></span>
              <span>Add field</span>
            </button>
          </section>

          @if (errorMessage(); as err) {
            <nz-alert nzType="error" [nzMessage]="err" nzShowIcon class="!py-2"></nz-alert>
          }
        </div>

        <div class="flex justify-end gap-2 px-6 py-3 border-t border-gray-100 dark:border-gray-800">
          <button nz-button type="button" nzType="default" (click)="cancel.emit()" class="!rounded-lg !h-9 !px-4">Cancel</button>
          <button nz-button type="button" nzType="primary" [nzLoading]="saving()" (click)="submit()" class="!rounded-lg !h-9 !px-4 !bg-blue-700 hover:!bg-blue-800">
            Create
          </button>
        </div>
      </div>
    </nz-modal>
  `,
})
export class TemplateFormModalComponent {
  readonly saving = input<boolean>(false);
  readonly serverError = input<string | null>(null);

  readonly cancel = output<void>();
  readonly save = output<{ name: string; description?: string; fields: FormFieldInput[] }>();

  readonly labelClass = LABEL;
  readonly fieldTypeOptions = FIELD_TYPE_OPTIONS;
  readonly maxFields = MAX_FIELDS;
  readonly maxOptions = MAX_OPTIONS_PER_FIELD;

  readonly name = signal('');
  readonly description = signal('');
  readonly fields = signal<TemplateFieldDraft[]>([newFieldDraft()]);
  readonly localError = signal<string | null>(null);

  errorMessage(): string | null {
    return this.localError() ?? this.serverError();
  }

  isChoiceType(type: TemplateFieldDraft['type']): boolean {
    return CHOICE_TYPES.has(type);
  }

  addField(): void {
    if (this.fields().length >= this.maxFields) {
      return;
    }
    this.fields.update((fields) => [...fields, newFieldDraft()]);
  }

  removeField(index: number): void {
    this.fields.update((fields) => fields.filter((_, i) => i !== index));
  }

  updateField(index: number, patch: Partial<TemplateFieldDraft>): void {
    this.fields.update((fields) => fields.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  }

  submit(): void {
    const name = this.name();
    const fields = this.fields();
    const err = validateTemplateDraft(name, fields);
    this.localError.set(err);
    if (err) {
      return;
    }

    const clean = fields.filter((f) => f.label.trim());
    const payload: FormFieldInput[] = clean.map((f, order) => ({
      label: f.label.trim(),
      type: f.type,
      required: f.required,
      order,
      ...(this.isChoiceType(f.type) ? { options: splitOptions(f.optionsText) } : {}),
    }));

    this.save.emit({ name: name.trim(), description: this.description().trim() || undefined, fields: payload });
  }
}
