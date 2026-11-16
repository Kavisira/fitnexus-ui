import { Component, inject } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { ThemeService } from '../../../../core/theme/theme.service';

@Component({
  selector: 'app-theme-toggle',
  imports: [NzButtonModule, NzIconModule],
  template: `
    <button
      nz-button
      nzType="text"
      nzShape="circle"
      class="text-gray-600 dark:!text-gray-100 hover:text-blue-600 dark:hover:!text-blue-400 !flex items-center justify-center p-2"
      [attr.aria-label]="mode() === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
      (click)="toggle()"
    >
      <span
        nz-icon
        [nzType]="mode() === 'dark' ? 'sun' : 'moon'"
        class="text-lg"
      ></span>
    </button>
  `,
})
export class ThemeToggleComponent {
  private themeService = inject(ThemeService);
  readonly mode = this.themeService.mode;

  toggle(): void {
    this.themeService.toggle();
  }
}
