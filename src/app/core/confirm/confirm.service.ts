import { Injectable, inject } from '@angular/core';
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

/** Single place all features call to ask the user to confirm something, so
 * every confirmation in the app is consistent. Backed by NG-ZORRO modals on
 * every page (including v1 screens still awaiting migration). */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private modal = inject(NzModalService);

  /** A plain OK-only notice — no Cancel button, resolves once dismissed. */
  alert(options: { message: string; header?: string; okLabel?: string }): Promise<void> {
    return new Promise((resolve) => {
      this.modal.info({
        nzTitle: options.header ?? 'Notice',
        nzContent: options.message,
        nzOkText: options.okLabel ?? 'OK',
        nzOnOk: () => resolve(),
        nzOnCancel: () => resolve(),
      });
    });
  }

  /** Resolves true if accepted, false if rejected/dismissed. */
  confirm(options: ConfirmOptions): Promise<boolean> {
    return new Promise((resolve) => {
      this.modal.confirm({
        nzTitle: options.header ?? 'Please confirm',
        nzContent: options.message,
        nzOkText: options.acceptLabel ?? 'Yes',
        nzOkDanger: options.severity === 'danger',
        nzCancelText: options.rejectLabel ?? 'Cancel',
        nzOnOk: () => resolve(true),
        nzOnCancel: () => resolve(false),
      });
    });
  }
}
