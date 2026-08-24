import { Component, inject } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { Sun } from '@primeicons/angular/sun';
import { Moon } from '@primeicons/angular/moon';

import { ThemeService } from '../../core/theme/theme.service';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [ButtonModule, Sun, Moon],
  templateUrl: './theme-toggle.html',
  styleUrls: ['./theme-toggle.css'],
})
export class ThemeToggle {
  private themeService = inject(ThemeService);

  readonly mode = this.themeService.mode;

  toggle(): void {
    this.themeService.toggle();
  }
}
