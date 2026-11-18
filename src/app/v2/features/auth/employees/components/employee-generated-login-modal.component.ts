import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzAlertModule } from 'ng-zorro-antd/alert';

import { GeneratedLogin } from '../../../../../core/employees/employee-api.service';

@Component({
  selector: 'app-employee-generated-login-modal',
  imports: [CommonModule, NzModalModule, NzButtonModule, NzIconModule, NzAlertModule],
  template: `
    @if (login(); as creds) {
      <nz-modal
        [nzVisible]="true"
        nzTitle="Employee Login Created"
        [nzFooter]="null"
        [nzWidth]="480"
        (nzOnCancel)="close.emit()"
      >
        <div *nzModalContent class="space-y-4 p-1">
          <nz-alert
            nzType="warning"
            nzMessage="Copy these credentials now. The password is encrypted and cannot be retrieved again."
            nzShowIcon
            class="!rounded-xl"
          ></nz-alert>

          <div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-3 text-xs">
            <div class="flex items-center justify-between">
              <span class="text-gray-500 font-medium">Username:</span>
              <span class="font-mono font-bold text-gray-900 dark:text-white select-all text-sm">{{ creds.username }}</span>
            </div>

            <div class="flex items-center justify-between">
              <span class="text-gray-500 font-medium">Temporary Password:</span>
              <span class="font-mono font-bold text-blue-600 dark:text-blue-400 select-all text-sm">{{ creds.password }}</span>
            </div>
          </div>

          <div class="flex items-center justify-end gap-2 pt-2">
            <button nz-button nzType="default" (click)="copyCredentials(creds)" class="!rounded-xl font-semibold flex items-center gap-1.5">
              <span nz-icon nzType="copy"></span>
              <span>{{ copied() ? 'Copied!' : 'Copy Credentials' }}</span>
            </button>
            <button nz-button nzType="primary" (click)="close.emit()" class="!rounded-xl font-semibold !bg-blue-700 hover:!bg-blue-800">
              Done
            </button>
          </div>
        </div>
      </nz-modal>
    }
  `,
})
export class EmployeeGeneratedLoginModalComponent {
  readonly login = input<GeneratedLogin | null>(null);
  readonly close = output<void>();

  readonly copied = signal(false);

  copyCredentials(creds: GeneratedLogin): void {
    const text = `FitNexus Login\nUsername: ${creds.username}\nPassword: ${creds.password}`;
    navigator.clipboard.writeText(text).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    });
  }
}

