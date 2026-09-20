import { Component, OnInit, inject, model, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';

import { AVAILABLE_LANGUAGES, AppLanguage, TranslationService } from '../../core/i18n/translation.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { TokenStorage } from '../../core/auth/token-storage.service';
import { OrganizationApiService } from '../../core/organization/organization-api.service';
import { ToastService } from '../../core/toast/toast.service';

// Logos are typically small already (a few hundred KB) and, unlike
// member/progress photos, are often PNGs with transparency — read as-is
// via FileReader rather than the canvas-recompress-to-JPEG pipeline
// used for photos (see members.ts), which would flatten transparency
// onto a white background. A plain size cap stands in for compression.
const MAX_LOGO_BYTES = 2 * 1024 * 1024;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

@Component({
  selector: 'app-settings-dialog',
  standalone: true,
  imports: [FormsModule, DialogModule, SelectModule, ButtonModule, TranslatePipe],
  templateUrl: './settings-dialog.html',
  styleUrls: ['./settings-dialog.css'],
})
export class SettingsDialog implements OnInit {
  private i18n = inject(TranslationService);
  private tokenStorage = inject(TokenStorage);
  private organizationApi = inject(OrganizationApiService);
  private toast = inject(ToastService);

  visible = model(false);

  readonly languages = AVAILABLE_LANGUAGES;

  get selectedLanguage(): AppLanguage {
    return this.i18n.lang();
  }

  set selectedLanguage(lang: AppLanguage) {
    this.i18n.setLang(lang);
  }

  // ---- Organization logo (Owner-only) ----
  // Uploaded once here, reused everywhere the org's identity needs to
  // appear in a generated document — payslip PDFs today (see
  // PayslipPdfService on the backend), potentially more later.
  isOwner = this.tokenStorage.isOwner();
  logoUrl = signal<string | null>(null);
  savingLogo = signal(false);

  ngOnInit(): void {
    if (this.isOwner) {
      this.organizationApi.mine().subscribe({
        next: (org) => this.logoUrl.set(org.logoUrl),
        error: () => {},
      });
    }
  }

  async onLogoSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.toast.error(this.i18n.t('settings.logoInvalidType'));
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      this.toast.error(this.i18n.t('settings.logoTooLarge'));
      return;
    }

    this.savingLogo.set(true);
    const dataUrl = await readFileAsDataUrl(file);
    this.organizationApi.uploadLogo(dataUrl).subscribe({
      next: (org) => {
        this.savingLogo.set(false);
        this.logoUrl.set(org.logoUrl);
        this.toast.success(this.i18n.t('settings.logoSaved'));
      },
      error: () => {
        this.savingLogo.set(false);
        this.toast.error(this.i18n.t('settings.logoSaveError'));
      },
    });
  }

  removeLogo(): void {
    this.savingLogo.set(true);
    this.organizationApi.removeLogo().subscribe({
      next: (org) => {
        this.savingLogo.set(false);
        this.logoUrl.set(org.logoUrl);
      },
      error: () => {
        this.savingLogo.set(false);
        this.toast.error(this.i18n.t('settings.logoSaveError'));
      },
    });
  }
}
