import { Component, inject, model, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';

import { APP_VERSION } from '../../../environments/version';
import { BackendVersion, VersionApiService } from '../../core/version/version-api.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

/** "Deployed Version" — opened from the header's profile menu. Shows
 * the frontend's own version number (baked in at build time from this
 * app's package.json — see scripts/generate-version.js) side by side
 * with whatever version the backend it's currently talking to reports
 * live from `/api/version`, so a mismatch (e.g. after a deploy that
 * only landed on one side) is obvious at a glance. Deliberately shows
 * a plain version number rather than a commit hash/branch — those
 * aren't meaningful to non-technical staff checking "did the update go
 * live"; bump each app's package.json "version" on every real release. */
@Component({
  selector: 'app-version-dialog',
  standalone: true,
  imports: [CommonModule, DialogModule, ButtonModule, TooltipModule, TranslatePipe],
  templateUrl: './version-dialog.html',
  styleUrls: ['./version-dialog.css'],
})
export class VersionDialog {
  private versionApi = inject(VersionApiService);

  visible = model(false);

  frontend = APP_VERSION;

  backend = signal<BackendVersion | null>(null);
  backendLoading = signal(false);
  backendError = signal(false);

  onShow(): void {
    this.loadBackend();
  }

  loadBackend(): void {
    this.backendLoading.set(true);
    this.backendError.set(false);
    this.versionApi.get().subscribe({
      next: (v) => {
        this.backendLoading.set(false);
        this.backend.set(v);
      },
      error: () => {
        this.backendLoading.set(false);
        this.backendError.set(true);
      },
    });
  }
}
