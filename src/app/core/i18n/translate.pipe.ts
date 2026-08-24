import { Pipe, PipeTransform, inject } from '@angular/core';
import { TranslationService } from './translation.service';

/**
 * Impure by design: this app is zoneless, and an impure pipe is
 * re-evaluated on every change-detection pass. Since switching the
 * language calls a signal write (which schedules a CD pass in a
 * zoneless app), every {{ 'x.y' | translate }} in the template picks
 * up the new text immediately without needing a page reload.
 */
@Pipe({ name: 'translate', standalone: true, pure: false })
export class TranslatePipe implements PipeTransform {
  private i18n = inject(TranslationService);

  transform(key: string): string {
    return this.i18n.t(key);
  }
}
