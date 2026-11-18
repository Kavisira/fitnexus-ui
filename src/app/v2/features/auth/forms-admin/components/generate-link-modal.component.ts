import { Component, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';

import { ToastService } from '../../../../../core/toast/toast.service';
import { FormShareLink, FormTemplate } from '../../../../../core/forms/form-api.service';

/**
 * Generate / send a single-use link for one template to one Member
 * (never a Lead — see FormsService.generateShareLink, a hard
 * NotFoundException if memberId doesn't resolve to a Member in this
 * org). On success shows the QR code + public URL, exactly like the
 * old forms-admin.html.
 */
@Component({
  selector: 'app-generate-link-modal',
  imports: [CommonModule, FormsModule, NzButtonModule, NzCheckboxModule, NzIconModule, NzModalModule, NzSelectModule],
  template: `
    <nz-modal
      [nzVisible]="true"
      [nzTitle]="''"
      [nzFooter]="null"
      [nzWidth]="560"
      [nzClassName]="'generate-link-modal'"
      [nzBodyStyle]="{ 'max-height': 'calc(100vh - 48px)', 'overflow-y': 'auto', padding: '0' }"
      (nzOnCancel)="close.emit()"
    >
      <div *nzModalContent>
        <!-- Header -->
        <div class="flex items-center gap-3 px-6 pt-5 pb-3 border-b border-gray-100 dark:border-gray-800">
          <span class="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/30 shrink-0 leading-none">
            <span nz-icon nzType="qrcode" class="!text-base !leading-none text-blue-600 dark:text-blue-300"></span>
          </span>
          <div class="flex flex-col justify-center min-w-0">
            <h2 class="text-base font-bold m-0 leading-tight text-gray-900 dark:text-white truncate">Send Form</h2>
            <p class="text-xs m-0 leading-tight text-gray-500 dark:text-gray-400 truncate">{{ template()?.name }}</p>
          </div>
        </div>

        <div class="px-6 py-4 space-y-4">
          @if (!link()) {
            <section class="rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/30 p-4">
              <h3 class="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">
                <span nz-icon nzType="user" class="text-blue-600"></span>
                Member
              </h3>
              <nz-select
                [nzShowSearch]="true" nzPlaceHolder="Select a member" class="w-full"
                [ngModel]="memberId()" (ngModelChange)="memberId.set($event)"
              >
                @for (m of memberOptions(); track m.value) {
                  <nz-option [nzLabel]="m.label" [nzValue]="m.value"></nz-option>
                }
              </nz-select>

              <label nz-checkbox class="mt-3" [ngModel]="sendWhatsapp()" (ngModelChange)="sendWhatsapp.set($event)">
                <span class="text-sm">Send via WhatsApp</span>
              </label>
            </section>

            <button
              nz-button nzType="primary" [disabled]="!memberId()" [nzLoading]="generating()"
              class="!rounded-lg !h-9 !w-full !inline-flex !items-center !justify-center gap-1.5 !bg-blue-700 hover:!bg-blue-800"
              (click)="generate()"
            >
              <span nz-icon nzType="qrcode"></span>
              <span>Generate link</span>
            </button>
          } @else {
            <div class="flex flex-col items-center text-center gap-3">
              <img [src]="link()!.qrCodeDataUrl" alt="QR code" class="w-48 h-48 rounded-lg border border-gray-100 dark:border-gray-700" />
              <p class="text-xs break-all text-gray-600 dark:text-gray-400 m-0">{{ link()!.publicUrl }}</p>
              <button nz-button nzType="default" class="!rounded-lg !h-9 !inline-flex !items-center gap-1.5" (click)="copyLink()">
                <span nz-icon nzType="copy"></span>
                <span>Copy link</span>
              </button>
            </div>
          }
        </div>

        <div class="flex justify-end gap-2 px-6 py-3 border-t border-gray-100 dark:border-gray-800">
          <button nz-button type="button" nzType="default" (click)="close.emit()" class="!rounded-lg !h-9 !px-4">Close</button>
        </div>
      </div>
    </nz-modal>
  `,
})
export class GenerateLinkModalComponent {
  private toast = inject(ToastService);

  readonly template = input<FormTemplate | null>(null);
  readonly memberOptions = input<{ label: string; value: string }[]>([]);
  readonly generating = input<boolean>(false);
  readonly link = input<FormShareLink | null>(null);

  readonly close = output<void>();
  readonly generateLink = output<{ memberId: string; sendWhatsapp: boolean }>();

  readonly memberId = signal<string | null>(null);
  readonly sendWhatsapp = signal(true);

  generate(): void {
    const memberId = this.memberId();
    if (!memberId) {
      return;
    }
    this.generateLink.emit({ memberId, sendWhatsapp: this.sendWhatsapp() });
  }

  copyLink(): void {
    const url = this.link()?.publicUrl;
    if (!url) {
      return;
    }
    navigator.clipboard?.writeText(url).then(
      () => this.toast.success('Link copied.'),
      () => undefined,
    );
  }
}
