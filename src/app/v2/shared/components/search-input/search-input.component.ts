import { Component, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';

/**
 * Standard 36px search box used in every v2 filter bar. Sizing/rounding are
 * applied to the NG-ZORRO affix wrapper (which owns the visible border), not
 * to the inner <input>, so it lines up with FilterDropdown and !h-9 buttons.
 */
@Component({
  selector: 'app-search-input',
  imports: [FormsModule, NzIconModule, NzInputModule],
  template: `
    <nz-input-wrapper
      class="w-full !h-9 !py-0 !px-3 !rounded-xl !bg-gray-50 dark:!bg-gray-800 !border-gray-200 dark:!border-gray-700"
    >
      <span nzInputPrefix nz-icon nzType="search" class="text-gray-400 text-sm"></span>
      <input
        nz-input
        type="text"
        [ngModel]="value()"
        (ngModelChange)="value.set($event)"
        [placeholder]="placeholder()"
        class="!bg-transparent text-xs"
      />
      @if (value()) {
        <span
          nzInputSuffix
          nz-icon
          nzType="close-circle"
          class="text-gray-400 hover:text-gray-600 cursor-pointer text-xs"
          (click)="value.set('')"
        ></span>
      }
    </nz-input-wrapper>
  `,
  host: { class: 'block w-full min-w-0' },
})
export class SearchInputComponent {
  readonly value = model<string>('');
  readonly placeholder = input<string>('Search...');
}
