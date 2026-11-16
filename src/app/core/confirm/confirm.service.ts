import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { NzModalService } from 'ng-zorro-antd/modal';

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
 * so every confirmation in the app is consistent. Seamlessly bridges
 * v1 (PrimeNG) and v2 (NG-ZORRO). */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private router = inject(Router);
  private confirmationService = inject(ConfirmationService, { optional: true });
  private nzModalService = inject(NzModalService, { optional: true });

  private isV2(): boolean {
    return this.router.url.includes('/v2');
  }

  /** A plain OK-only notice — no Cancel button, resolves once dismissed. */
  alert(options: { message: string; header?: string; okLabel?: string }): Promise<void> {
    return new Promise((resolve) => {
      if (this.isV2() && this.nzModalService) {
        this.nzModalService.info({
          nzTitle: options.header ?? 'Notice',
          nzContent: options.message,
          nzOkText: options.okLabel ?? 'OK',
          nzOnOk: () => resolve(),
          nzOnCancel: () => resolve(),
        });
        return;
      }

      if (this.confirmationService) {
        this.confirmationService.confirm({
          message: options.message,
          header: options.header ?? 'Notice',
          icon: 'pi pi-info-circle',
          acceptLabel: options.okLabel ?? 'OK',
          rejectVisible: false,
          acceptButtonProps: { severity: 'info' },
          accept: () => resolve(),
          reject: () => resolve(),
        });
      } else if (this.nzModalService) {
        this.nzModalService.info({
          nzTitle: options.header ?? 'Notice',
          nzContent: options.message,
          nzOkText: options.okLabel ?? 'OK',
          nzOnOk: () => resolve(),
          nzOnCancel: () => resolve(),
        });
      }
    });
  }

  /** Resolves true if accepted, false if rejected/dismissed. */
  confirm(options: ConfirmOptions): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.isV2() && this.nzModalService) {
        this.nzModalService.confirm({
          nzTitle: options.header ?? 'Please confirm',
          nzContent: options.message,
          nzOkText: options.acceptLabel ?? 'Yes',
          nzOkDanger: options.severity === 'danger',
          nzCancelText: options.rejectLabel ?? 'Cancel',
          nzOnOk: () => resolve(true),
          nzOnCancel: () => resolve(false),
        });
        return;
      }

      if (this.confirmationService) {
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
          accept: () => resolve(true),
          reject: () => resolve(false),
        });
      } else if (this.nzModalService) {
        this.nzModalService.confirm({
          nzTitle: options.header ?? 'Please confirm',
          nzContent: options.message,
          nzOkText: options.acceptLabel ?? 'Yes',
          nzOkDanger: options.severity === 'danger',
          nzCancelText: options.rejectLabel ?? 'Cancel',
          nzOnOk: () => resolve(true),
          nzOnCancel: () => resolve(false),
        });
      }
    });
  }
}
