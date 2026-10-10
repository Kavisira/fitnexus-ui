import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { CheckboxModule } from 'primeng/checkbox';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

import { ToastService } from '../../../core/toast/toast.service';
import { PermissionsService } from '../../../core/roles/permissions.service';
import { PageHeaderService } from '../../../shared/page-header/page-header.service';
import { MemberStore } from '../../../core/members/member-store.service';
import {
  FormApiService,
  FormField,
  FormFieldInput,
  FormFieldType,
  FormResultsSummary,
  FormShareLink,
  FormSubmission,
  FormTemplate,
} from '../../../core/forms/form-api.service';

/**
 * Admin screen for the dynamic public form builder (review/feedback
 * forms, or anything else a gym owner wants members to fill out).
 * Templates are org-wide and reusable; a share link is always freshly
 * generated per send (one-time token, tied to one member) — see the
 * doc comment on FormsService.generateShareLink on the backend for the
 * full design rationale.
 */
@Component({
  selector: 'app-forms-admin',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    TextareaModule,
    SelectModule,
    CheckboxModule,
    CardModule,
    TagModule,
    MessageModule,
    ProgressSpinnerModule,
  ],
  templateUrl: './forms-admin.html',
  styleUrls: ['./forms-admin.css'],
})
export class FormsAdmin implements OnInit {
  private api = inject(FormApiService);
  private toast = inject(ToastService);
  private permissions = inject(PermissionsService);
  private pageHeader = inject(PageHeaderService);
  private destroyRef = inject(DestroyRef);
  memberStore = inject(MemberStore);

  canWrite = computed(() => this.permissions.canWrite('FORMS'));

  loading = signal(false);
  templates = signal<FormTemplate[]>([]);

  fieldTypeOptions: { label: string; value: FormFieldType }[] = [
    { label: 'Short text', value: 'SHORT_TEXT' },
    { label: 'Long text', value: 'LONG_TEXT' },
    { label: 'Rating (1-5)', value: 'RATING' },
    { label: 'Single choice', value: 'SINGLE_CHOICE' },
    { label: 'Multiple choice', value: 'MULTI_CHOICE' },
    { label: 'Yes / No', value: 'YES_NO' },
    { label: 'Number', value: 'NUMBER' },
    { label: 'Date', value: 'DATE' },
  ];

  // --- Create template dialog ---
  createDialogVisible = signal(false);
  saving = signal(false);
  errorMessage = signal<string | null>(null);
  newName = signal('');
  newDescription = signal('');
  newFields = signal<(FormFieldInput & { optionsText?: string })[]>([]);

  choiceTypes = new Set<FormFieldType>(['SINGLE_CHOICE', 'MULTI_CHOICE']);

  openCreate(): void {
    this.errorMessage.set(null);
    this.newName.set('');
    this.newDescription.set('');
    this.newFields.set([{ label: '', type: 'SHORT_TEXT', required: false }]);
    this.createDialogVisible.set(true);
  }

  addField(): void {
    this.newFields.update((fields) => [...fields, { label: '', type: 'SHORT_TEXT', required: false }]);
  }

  removeField(index: number): void {
    this.newFields.update((fields) => fields.filter((_, i) => i !== index));
  }

  saveTemplate(): void {
    const name = this.newName().trim();
    const fields = this.newFields();
    if (!name) {
      this.errorMessage.set('Please enter a form name.');
      return;
    }
    const cleanFields = fields.filter((f) => f.label.trim());
    if (!cleanFields.length) {
      this.errorMessage.set('Add at least one field.');
      return;
    }

    const payload: FormFieldInput[] = cleanFields.map((f, order) => ({
      label: f.label.trim(),
      type: f.type,
      required: f.required ?? false,
      order,
      ...(this.choiceTypes.has(f.type)
        ? { options: (f.optionsText ?? '').split(',').map((o) => o.trim()).filter(Boolean) }
        : {}),
    }));

    this.saving.set(true);
    this.api.createTemplate({ name, description: this.newDescription().trim() || undefined, fields: payload }).subscribe({
      next: () => {
        this.saving.set(false);
        this.createDialogVisible.set(false);
        this.toast.success('Form template created.');
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        const message = err?.error?.message ?? 'Could not save the form.';
        this.errorMessage.set(Array.isArray(message) ? message.join(' ') : message);
      },
    });
  }

  // --- Generate link dialog ---
  linkDialogVisible = signal(false);
  linkTemplate = signal<FormTemplate | null>(null);
  linkMemberId = signal<string | null>(null);
  linkSendWhatsapp = signal(true);
  generatingLink = signal(false);
  generatedLink = signal<FormShareLink | null>(null);

  memberOptions = computed(() => this.memberStore.allMembers().map((m) => ({ label: `${m.name} (${m.phone})`, value: m.id })));

  openGenerateLink(template: FormTemplate): void {
    this.linkTemplate.set(template);
    this.linkMemberId.set(null);
    this.linkSendWhatsapp.set(true);
    this.generatedLink.set(null);
    if (!this.memberStore.allMembers().length) {
      this.memberStore.loadAll();
    }
    this.linkDialogVisible.set(true);
  }

  generateLink(): void {
    const template = this.linkTemplate();
    const memberId = this.linkMemberId();
    if (!template || !memberId) {
      return;
    }
    this.generatingLink.set(true);
    this.api.generateLink(template.id, memberId, this.linkSendWhatsapp()).subscribe({
      next: (link) => {
        this.generatingLink.set(false);
        this.generatedLink.set(link);
      },
      error: (err) => {
        this.generatingLink.set(false);
        const message = err?.error?.message ?? 'Could not generate the link.';
        this.toast.error(Array.isArray(message) ? message.join(' ') : message);
      },
    });
  }

  copyLink(url: string): void {
    navigator.clipboard?.writeText(url).then(
      () => this.toast.success('Link copied.'),
      () => undefined,
    );
  }

  // --- Results dialog ---
  resultsDialogVisible = signal(false);
  resultsLoading = signal(false);
  results = signal<FormResultsSummary | null>(null);
  resultsTemplateName = signal('');
  resultsTemplate = signal<FormTemplate | null>(null);
  submissions = signal<FormSubmission[]>([]);
  expandedSubmissionId = signal<string | null>(null);

  openResults(template: FormTemplate): void {
    this.resultsTemplateName.set(template.name);
    this.resultsTemplate.set(template);
    this.results.set(null);
    this.submissions.set([]);
    this.expandedSubmissionId.set(null);
    this.resultsLoading.set(true);
    this.resultsDialogVisible.set(true);
    this.api.getResults(template.id).subscribe({
      next: (summary) => {
        this.resultsLoading.set(false);
        this.results.set(summary);
      },
      error: () => {
        this.resultsLoading.set(false);
        this.toast.error('Could not load results.');
      },
    });
    this.api.listSubmissions(template.id).subscribe({
      next: (submissions) => this.submissions.set(submissions),
      error: () => this.toast.error('Could not load the list of respondents.'),
    });
  }

  toggleSubmission(id: string): void {
    this.expandedSubmissionId.set(this.expandedSubmissionId() === id ? null : id);
  }

  answerText(answer: FormSubmission['answers'][number], field?: FormField): string {
    if (field?.type === 'MULTI_CHOICE') {
      return answer.choiceValues?.length ? answer.choiceValues.join(', ') : '—';
    }
    if (answer.booleanValue !== null && answer.booleanValue !== undefined) {
      return answer.booleanValue ? 'Yes' : 'No';
    }
    if (answer.numberValue !== null && answer.numberValue !== undefined) {
      return String(answer.numberValue);
    }
    if (answer.choiceValues?.length) {
      return answer.choiceValues.join(', ');
    }
    return answer.textValue ?? '—';
  }

  optionCountEntries(field: FormResultsSummary['fields'][number]): { option: string; count: number }[] {
    const counts = field.optionCounts ?? {};
    return Object.entries(counts).map(([option, count]) => ({ option, count }));
  }

  fieldLabel(fields: FormField[], fieldId: string): string {
    return fields.find((f) => f.id === fieldId)?.label ?? fieldId;
  }

  fieldById(fieldId: string): FormField | undefined {
    return this.resultsTemplate()?.fields.find((f) => f.id === fieldId);
  }

  ngOnInit(): void {
    this.pageHeader.setTitleKey('common.forms');
    this.destroyRef.onDestroy(() => this.pageHeader.clear());
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.api.listTemplates().subscribe({
      next: (templates) => {
        this.loading.set(false);
        this.templates.set(templates);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('Could not load form templates.');
      },
    });
  }
}
