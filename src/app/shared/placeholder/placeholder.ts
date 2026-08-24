import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { TranslatePipe } from '../../core/i18n/translate.pipe';

@Component({
  selector: 'app-placeholder',
  standalone: true,
  imports: [TranslatePipe],
  template: `
    <div class="placeholder-page">
      <h1>{{ labelKey | translate }}</h1>
      <p>{{ 'common.comingSoon' | translate }}</p>
    </div>
  `,
  styles: [
    `
      .placeholder-page { display: flex; flex-direction: column; gap: 0.5rem; }
      h1 { margin: 0; font-size: 1.5rem; }
      p { margin: 0; color: var(--p-text-muted-color, #6b7280); }
    `,
  ],
})
export class Placeholder {
  private route = inject(ActivatedRoute);

  readonly labelKey: string = this.route.snapshot.data['labelKey'] ?? 'common.comingSoon';
}
