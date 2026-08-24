import { Injectable, inject } from '@angular/core';
import { MessageService } from 'primeng/api';

/** Single place all features call to show a toast, so success/error/warning
 * messages look and behave the same everywhere instead of each page
 * wiring PrimeNG's MessageService directly. */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private messageService = inject(MessageService);

  success(detail: string, summary = 'Success'): void {
    this.messageService.add({ severity: 'success', summary, detail, life: 4000 });
  }

  error(detail: string, summary = 'Error'): void {
    this.messageService.add({ severity: 'error', summary, detail, life: 6000 });
  }

  warn(detail: string, summary = 'Warning'): void {
    this.messageService.add({ severity: 'warn', summary, detail, life: 5000 });
  }

  info(detail: string, summary = 'Info'): void {
    this.messageService.add({ severity: 'info', summary, detail, life: 4000 });
  }
}
