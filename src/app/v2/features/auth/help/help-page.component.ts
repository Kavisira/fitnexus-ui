import { Component, ElementRef, computed, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSelectModule } from 'ng-zorro-antd/select';

import { HelpSection } from './help.models';
import { HELP_SECTIONS } from './content';
import { HelpArticleComponent } from './components/help-article.component';
import { SearchInputComponent } from '../../../shared/components/search-input/search-input.component';

@Component({
  selector: 'app-v2-help-page',
  imports: [FormsModule, NzIconModule, NzSelectModule, HelpArticleComponent, SearchInputComponent],
  template: `
    <div class="flex flex-col lg:flex-row gap-4 flex-1 min-h-0 min-w-0">
      <!-- Topic navigation (desktop) / topic picker (mobile) -->
      <aside class="lg:w-80 shrink-0 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs p-4 flex flex-col min-h-0 lg:max-h-full">
        <h1 class="text-lg font-bold text-gray-900 dark:text-white m-0">Help &amp; Guide</h1>
        <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5 mb-3">How each screen in FitNexus works.</p>

        <app-search-input class="mb-3" placeholder="Search topics..." [(value)]="searchTerm"></app-search-input>

        <!-- Mobile: compact searchable select -->
        <nz-select
          class="w-full lg:!hidden"
          [nzShowSearch]="true"
          [ngModel]="active().id"
          (ngModelChange)="selectById($event)"
        >
          @for (s of filteredSections(); track s.id) {
            <nz-option [nzLabel]="s.title" [nzValue]="s.id"></nz-option>
          }
        </nz-select>

        <!-- Desktop: full topic list -->
        <ul class="hidden lg:block flex-1 overflow-y-auto space-y-1 m-0 p-0 list-none -mx-1 px-1">
          @for (s of filteredSections(); track s.id) {
            <li>
              <button
                type="button"
                class="w-full text-left flex items-start gap-3 px-3 py-2.5 rounded-xl transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                [class.bg-blue-50]="active().id === s.id"
                [class.dark:bg-blue-900/30]="active().id === s.id"
                (click)="select(s)"
              >
                <span
                  class="flex items-center justify-center w-8 h-8 rounded-lg shrink-0 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
                  [class.!bg-blue-600]="active().id === s.id"
                  [class.!text-white]="active().id === s.id"
                >
                  <span nz-icon [nzType]="s.icon"></span>
                </span>
                <span class="min-w-0">
                  <span class="block text-sm font-semibold text-gray-900 dark:text-white truncate">{{ s.title }}</span>
                  <span class="block text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{{ s.summary }}</span>
                </span>
              </button>
            </li>
          } @empty {
            <li class="text-xs text-gray-500 dark:text-gray-400 px-3 py-4">No topics match "{{ searchTerm() }}".</li>
          }
        </ul>
      </aside>

      <!-- Reading pane -->
      <main #pane class="flex-1 min-w-0 min-h-0 overflow-y-auto bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs p-5 sm:p-6">
        <app-help-article [section]="active()"></app-help-article>
      </main>
    </div>
  `,
  host: { class: 'flex flex-col flex-1 min-h-0 min-w-0 w-full max-w-full' },
})
export class V2HelpPageComponent {
  private readonly pane = viewChild<ElementRef<HTMLElement>>('pane');

  readonly sections = HELP_SECTIONS;
  readonly searchTerm = signal('');
  readonly activeId = signal<string>(this.sections[0].id);

  readonly filteredSections = computed<HelpSection[]>(() => {
    const term = this.searchTerm().trim().toLowerCase();
    if (!term) return this.sections;
    return this.sections.filter(
      (s) =>
        s.title.toLowerCase().includes(term) ||
        s.summary.toLowerCase().includes(term) ||
        s.overview.some((p) => p.toLowerCase().includes(term)),
    );
  });

  readonly active = computed<HelpSection>(
    () => this.sections.find((s) => s.id === this.activeId()) ?? this.sections[0],
  );

  select(section: HelpSection): void {
    this.activeId.set(section.id);
    // Jump back to the top — the pane may still be scrolled from a long topic.
    this.pane()?.nativeElement.scrollTo({ top: 0, behavior: 'smooth' });
  }

  selectById(id: string): void {
    const found = this.sections.find((s) => s.id === id);
    if (found) this.select(found);
  }
}
