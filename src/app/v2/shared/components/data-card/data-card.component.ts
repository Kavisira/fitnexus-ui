import { Component } from '@angular/core';

@Component({
  selector: 'app-data-card',
  template: `
    <div class="flex flex-col flex-1 min-h-0 bg-white dark:bg-gray-800 rounded-2xl shadow-xs border border-gray-100 dark:border-gray-800 overflow-hidden">
      <ng-content></ng-content>
    </div>
  `,
  host: {
    class: 'flex flex-col flex-1 min-h-0 w-full',
  },
})
export class DataCardComponent {}
