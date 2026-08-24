import { Component, inject, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';

import { AVAILABLE_LANGUAGES, AppLanguage, TranslationService } from '../../core/i18n/translation.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

@Component({
  selector: 'app-settings-dialog',
  standalone: true,
  imports: [FormsModule, DialogModule, SelectModule, TranslatePipe],
  templateUrl: './settings-dialog.html',
  styleUrls: ['./settings-dialog.css'],
})
export class SettingsDialog {
  private i18n = inject(TranslationService);

  visible = model(false);

  readonly languages = AVAILABLE_LANGUAGES;

  get selectedLanguage(): AppLanguage {
    return this.i18n.lang();
  }

  set selectedLanguage(lang: AppLanguage) {
    this.i18n.setLang(lang);
  }
}
