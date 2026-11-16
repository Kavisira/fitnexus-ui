import { Component, input } from '@angular/core';

@Component({
  selector: 'app-page-header',
  template: `
    <header class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-gray-800">
      <div class="flex items-center gap-3 flex-wrap">
        <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 m-0">
          {{ title() }}
        </h1>
        @if (subtitle()) {
          <span class="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            {{ subtitle() }}
          </span>
        }
      </div>

      <div class="flex items-center gap-2 flex-wrap">
        <ng-content select="[filters]"></ng-content>
        <ng-content select="[actions]"></ng-content>
      </div>
    </header>
  `,
  host: {
    class: 'block w-full mb-3 shrink-0',
  },
})
export class PageHeaderComponent {
  readonly title = input.required<string>();
  readonly subtitle = input<string>();
}
