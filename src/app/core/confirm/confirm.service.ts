import { Injectable, inject } from '@angular/core';
import { ConfirmationService } from 'primeng/api';

export interface ConfirmOptions {
  message: string;
  header?: string;
  acceptLabel?: string;
  rejectLabel?: string;
  /** Drives the accept button's color — 'danger' for destructive actions
   * (deactivate, delete), 'warn' or 'info' for everything else. */
  severity?: 'danger' | 'warn' | 'info';
}

/** Single place all features call to ask the user to confirm something,
 * so every confirmation in the app is the same themed PrimeNG dialog
 * (rendered once, globally, via <p-confirmdialog> in app.html) instead
 * of the browser's native `confirm()` popup. Mirrors the ToastService
 * pattern — call this, never wire ConfirmationService directly. */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private confirmationService = inject(ConfirmationService);

  /** A plain OK-only notice using the same themed dialog — no Cancel
   * button, resolves once the user dismisses it. Use this instead of
   * `confirm()` for something the user needs to acknowledge rather
   * than decide (e.g. being signed out because the account logged in
   * elsewhere), where offering a "Cancel" wouldn't make sense. */
  alert(options: { message: string; header?: string; okLabel?: string }): Promise<void> {
    return new Promise((resolve) => {
      this.confirmationService.confirm({
        message: options.message,
        header: options.header ?? 'Notice',
        icon: 'pi pi-info-circle',
        acceptLabel: options.okLabel ?? 'OK',
        rejectVisible: false,
        acceptButtonProps: {
          severity: 'info',
        },
        accept: () => resolve(),
        // No reject button, but Escape/outside-click still dismisses —
        // treat that the same as clicking OK.
        reject: () => resolve(),
      });
    });
  }

  /** Resolves true if the user accepted, false if they rejected or
   * dismissed the dialog (Escape, clicking outside, etc). */
  confirm(options: ConfirmOptions): Promise<boolean> {
    return new Promise((resolve) => {
      this.confirmationService.confirm({
        message: options.message,
        header: options.header ?? 'Please confirm',
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: options.acceptLabel ?? 'Yes',
        rejectLabel: options.rejectLabel ?? 'Cancel',
        acceptButtonProps: {
          severity: options.severity ?? 'danger',
        },
        rejectButtonProps: {
          severity: 'secondary',
          outlined: true,
        },
        // reject fires both on an explicit Cancel click AND on dismissal
        // (Escape, clicking outside) — either way it's "not confirmed".
        accept: () => resolve(true),
        reject: () => resolve(false),
      });
    });
  }
}
