import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';

import {
  FormApiService,
  FormFieldInput,
  FormResultsSummary,
  FormShareLink,
  FormSubmission,
  FormTemplate,
} from '../../../../core/forms/form-api.service';
import { MemberStore } from '../../../../core/members/member-store.service';
import { ToastService } from '../../../../core/toast/toast.service';
import { PermissionsService } from '../../../../core/roles/permissions.service';
import { SearchInputComponent } from '../../../shared/components/search-input/search-input.component';
import { GenerateLinkModalComponent } from './components/generate-link-modal.component';
import { ResultsModalComponent } from './components/results-modal.component';
import { TemplateCardGridComponent } from './components/template-card-grid.component';
import { TemplateFormModalComponent } from './components/template-form-modal.component';

/**
 * Forms-admin — the reusable survey/feedback form template builder
 * (NOT intake forms/waivers for prospects). Templates are org-wide and
 * reusable; a share link is always a fresh, single-use token tied to
 * one existing Member (never a Lead — see FormApiService.generateLink
 * / FormsService.generateShareLink, a hard backend block if memberId
 * doesn't resolve). Mirrors the old forms-admin.ts/.html's information
 * architecture: one card grid, a create-template dialog, a
 * generate-link+QR dialog, and a results dialog (summary + respondents)
 * per template — just restyled into the v2 card-grid pattern.
 */
@Component({
  selector: 'app-v2-forms-admin-page',
  imports: [
    NzButtonModule, NzIconModule, SearchInputComponent,
    TemplateCardGridComponent, TemplateFormModalComponent, GenerateLinkModalComponent, ResultsModalComponent,
  ],
  template: `
    <div class="flex flex-col flex-1 min-w-0 space-y-4">
      <div class="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs">
        <div class="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          <div class="sm:col-span-7 min-w-0">
            <app-search-input placeholder="Search forms..." [(value)]="search"></app-search-input>
          </div>
          <div class="sm:col-span-5 flex items-center justify-start sm:justify-end gap-2 flex-wrap min-w-0">
            @if (canWrite()) {
              <button
                nz-button nzType="primary" (click)="openCreate()"
                class="!h-9 !rounded-xl !px-4 !inline-flex !items-center gap-1.5 text-xs font-semibold !bg-blue-700 hover:!bg-blue-800 shadow-xs shrink-0"
              >
                <span nz-icon nzType="plus"></span><span>New form</span>
              </button>
            }
          </div>
        </div>
      </div>

      <app-template-card-grid
        [templates]="filteredTemplates()"
        [loading]="loading()"
        [canWrite]="canWrite()"
        (openResults)="openResults($event)"
        (openGenerateLink)="openGenerateLink($event)"
      ></app-template-card-grid>

      <div class="text-xs text-gray-500 px-1">
        Showing <strong class="text-gray-900 dark:text-white">{{ filteredTemplates().length }}</strong> of {{ templates().length }} forms
      </div>

      @if (createModalVisible()) {
        <app-template-form-modal
          [saving]="saving()"
          [serverError]="serverError()"
          (cancel)="createModalVisible.set(false)"
          (save)="onCreate($event)"
        ></app-template-form-modal>
      }

      @if (linkTemplate(); as t) {
        <app-generate-link-modal
          [template]="t"
          [memberOptions]="memberOptions()"
          [generating]="generatingLink()"
          [link]="generatedLink()"
          (close)="closeGenerateLink()"
          (generateLink)="onGenerateLink($event)"
        ></app-generate-link-modal>
      }

      @if (resultsTemplate(); as t) {
        <app-results-modal
          [template]="t"
          [loading]="resultsLoading()"
          [results]="results()"
          [submissions]="submissions()"
          (close)="closeResults()"
        ></app-results-modal>
      }
    </div>
  `,
  host: { class: 'flex flex-col flex-1 min-h-0 min-w-0 w-full max-w-full' },
})
export class V2FormsAdminPageComponent implements OnInit {
  private api = inject(FormApiService);
  private toast = inject(ToastService);
  private permissions = inject(PermissionsService);
  memberStore = inject(MemberStore);

  readonly canWrite = computed(() => this.permissions.canWrite('FORMS'));

  readonly templates = signal<FormTemplate[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly serverError = signal<string | null>(null);

  readonly search = signal('');

  readonly filteredTemplates = computed(() => {
    const term = this.search().trim().toLowerCase();
    const templates = this.templates();
    if (!term) {
      return templates;
    }
    return templates.filter((t) => [t.name, t.description].filter(Boolean).some((v) => v!.toLowerCase().includes(term)));
  });

  // --- Create template ---
  readonly createModalVisible = signal(false);

  // --- Generate / send link ---
  readonly linkTemplate = signal<FormTemplate | null>(null);
  readonly generatingLink = signal(false);
  readonly generatedLink = signal<FormShareLink | null>(null);

  readonly memberOptions = computed(() => this.memberStore.allMembers().map((m) => ({ label: `${m.name} (${m.phone})`, value: m.id })));

  // --- Results ---
  readonly resultsTemplate = signal<FormTemplate | null>(null);
  readonly resultsLoading = signal(false);
  readonly results = signal<FormResultsSummary | null>(null);
  readonly submissions = signal<FormSubmission[]>([]);

  ngOnInit(): void {
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

  openCreate(): void {
    this.serverError.set(null);
    this.createModalVisible.set(true);
  }

  onCreate(payload: { name: string; description?: string; fields: FormFieldInput[] }): void {
    this.saving.set(true);
    this.serverError.set(null);
    this.api.createTemplate(payload).subscribe({
      next: () => {
        this.saving.set(false);
        this.createModalVisible.set(false);
        this.toast.success('Form template created.');
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        const message = err?.error?.message ?? 'Could not save the form.';
        const msg = Array.isArray(message) ? message.join(' ') : message;
        this.serverError.set(msg);
        this.toast.error(msg);
      },
    });
  }

  openGenerateLink(template: FormTemplate): void {
    this.linkTemplate.set(template);
    this.generatedLink.set(null);
    if (!this.memberStore.allMembers().length) {
      this.memberStore.loadAll();
    }
  }

  closeGenerateLink(): void {
    this.linkTemplate.set(null);
    this.generatedLink.set(null);
  }

  onGenerateLink(event: { memberId: string; sendWhatsapp: boolean }): void {
    const template = this.linkTemplate();
    if (!template) {
      return;
    }
    this.generatingLink.set(true);
    this.api.generateLink(template.id, event.memberId, event.sendWhatsapp).subscribe({
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

  openResults(template: FormTemplate): void {
    this.resultsTemplate.set(template);
    this.results.set(null);
    this.submissions.set([]);
    this.resultsLoading.set(true);
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

  closeResults(): void {
    this.resultsTemplate.set(null);
  }
}
