import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { NzMessageService } from 'ng-zorro-antd/message';

/** Single place all features call to show a toast, so success/error/warning
 * messages look and behave the same everywhere instead of each page
 * wiring message services directly. Seamlessly bridges v1 (PrimeNG) and
 * v2 (NG-ZORRO). */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private router = inject(Router);
  private messageService = inject(MessageService, { optional: true });
  private nzMessage = inject(NzMessageService, { optional: true });

  private isV2(): boolean {
    return this.router.url.includes('/v2');
  }

  success(detail: string, summary = 'Success'): void {
    if (this.isV2() && this.nzMessage) {
      this.nzMessage.success(detail);
    } else if (this.messageService) {
      this.messageService.add({ severity: 'success', summary, detail, life: 4000 });
    } else if (this.nzMessage) {
      this.nzMessage.success(detail);
    }
  }

  error(detail: string, summary = 'Error'): void {
    if (this.isV2() && this.nzMessage) {
      this.nzMessage.error(detail);
    } else if (this.messageService) {
      this.messageService.add({ severity: 'error', summary, detail, life: 6000 });
    } else if (this.nzMessage) {
      this.nzMessage.error(detail);
    }
  }

  warn(detail: string, summary = 'Warning'): void {
    if (this.isV2() && this.nzMessage) {
      this.nzMessage.warning(detail);
    } else if (this.messageService) {
      this.messageService.add({ severity: 'warn', summary, detail, life: 5000 });
    } else if (this.nzMessage) {
      this.nzMessage.warning(detail);
    }
  }

  info(detail: string, summary = 'Info'): void {
    if (this.isV2() && this.nzMessage) {
      this.nzMessage.info(detail);
    } else if (this.messageService) {
      this.messageService.add({ severity: 'info', summary, detail, life: 4000 });
    } else if (this.nzMessage) {
      this.nzMessage.info(detail);
    }
  }
}
