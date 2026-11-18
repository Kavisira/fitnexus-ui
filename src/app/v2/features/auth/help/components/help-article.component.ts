import { Component, input } from '@angular/core';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzCollapseModule } from 'ng-zorro-antd/collapse';

import { HelpSection } from '../help.models';

@Component({
  selector: 'app-help-article',
  imports: [NzIconModule, NzCollapseModule],
  template: `
    @let s = section();
    <article class="space-y-5">
      <header class="flex items-start gap-3 pb-4 border-b border-gray-100 dark:border-gray-800">
        <span class="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300 shrink-0">
          <span nz-icon [nzType]="s.icon" class="text-lg"></span>
        </span>
        <div class="min-w-0 space-y-1.5">
          <h2 class="text-lg font-bold text-gray-900 dark:text-white m-0">{{ s.title }}</h2>
          <span class="inline-flex items-start gap-1.5 text-xs text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg px-2 py-1">
            <span nz-icon nzType="lock" class="mt-0.5 shrink-0"></span>
            <span>{{ s.whoCanSee }}</span>
          </span>
        </div>
      </header>

      <section class="space-y-2">
        <h3 class="text-sm font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 m-0">Overview</h3>
        @for (para of s.overview; track $index) {
          <p class="text-sm leading-relaxed text-gray-700 dark:text-gray-300 m-0">{{ para }}</p>
        }
      </section>

      @for (group of s.steps ?? []; track group.title) {
        <section class="space-y-2">
          <h3 class="text-sm font-bold text-gray-900 dark:text-white m-0">{{ group.title }}</h3>
          <ol class="space-y-2 m-0 p-0 list-none">
            @for (step of group.items; track $index; let i = $index) {
              <li class="flex gap-3 text-sm text-gray-700 dark:text-gray-300">
                <span class="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold shrink-0">{{ i + 1 }}</span>
                <span class="leading-relaxed pt-0.5">{{ step.text }}</span>
              </li>
            }
          </ol>
        </section>
      }

      @if (s.tips?.length) {
        <section class="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/20 p-4 space-y-2">
          <h3 class="flex items-center gap-2 text-sm font-bold text-amber-800 dark:text-amber-300 m-0">
            <span nz-icon nzType="bulb"></span> Tips
          </h3>
          <ul class="space-y-1.5 m-0 pl-5 list-disc">
            @for (tip of s.tips; track $index) {
              <li class="text-sm leading-relaxed text-amber-900 dark:text-amber-200">{{ tip }}</li>
            }
          </ul>
        </section>
      }

      @if (s.faqs?.length) {
        <section class="space-y-2">
          <h3 class="text-sm font-bold text-gray-900 dark:text-white m-0">Frequently asked</h3>
          <nz-collapse nzGhost class="!rounded-xl border border-gray-100 dark:border-gray-800">
            @for (faq of s.faqs; track faq.q) {
              <nz-collapse-panel [nzHeader]="faq.q" class="text-sm font-semibold">
                <p class="text-sm font-normal leading-relaxed text-gray-700 dark:text-gray-300 m-0">{{ faq.a }}</p>
              </nz-collapse-panel>
            }
          </nz-collapse>
        </section>
      }
    </article>
  `,
  host: { class: 'block' },
})
export class HelpArticleComponent {
  readonly section = input.required<HelpSection>();
}
