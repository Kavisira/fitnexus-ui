import { Injectable, inject } from '@angular/core';
import { NzMessageService } from 'ng-zorro-antd/message';

/** Single place all features call to show a toast, so success/error/warning
 * messages look and behave the same everywhere. Backed by NG-ZORRO's message
 * service on every page (including v1 screens still awaiting migration). */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private nzMessage = inject(NzMessageService);

  // `summary` is kept for API compatibility with existing callers; NG-ZORRO
  // messages are single-line, so only the detail text is shown.
  success(detail: string, _summary = 'Success'): void {
    this.nzMessage.success(detail);
  }

  error(detail: string, _summary = 'Error'): void {
    this.nzMessage.error(detail);
  }

  warn(detail: string, _summary = 'Warning'): void {
    this.nzMessage.warning(detail);
  }

  info(detail: string, _summary = 'Info'): void {
    this.nzMessage.info(detail);
  }
}
