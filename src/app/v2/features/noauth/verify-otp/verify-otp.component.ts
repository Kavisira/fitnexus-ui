import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzAlertModule } from 'ng-zorro-antd/alert';

import { ThemeToggleComponent } from '../../../shared/components/theme-toggle/theme-toggle.component';
import { AppOtpInputComponent } from '../../../shared/components/app-otp-input/app-otp-input.component';
import { AuthApiService } from '../../../../core/auth/auth-api.service';
import { TokenStorage } from '../../../../core/auth/token-storage.service';
import { ToastService } from '../../../../core/toast/toast.service';

@Component({
  selector: 'app-v2-verify-otp',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    NzButtonModule,
    NzIconModule,
    NzAlertModule,
    ThemeToggleComponent,
    AppOtpInputComponent,
  ],
  template: `
    <div
      class="min-h-screen w-full flex items-center justify-center p-4 relative bg-cover bg-center bg-no-repeat"
      style="background-image: url('/assets/imgs/loginbg.png');"
    >
      <div class="absolute inset-0 bg-gradient-to-br from-slate-900/70 via-slate-900/80 to-slate-950/85 z-0 pointer-events-none"></div>

      <div class="fixed top-4 right-4 z-50">
        <app-theme-toggle></app-theme-toggle>
      </div>

      <div class="relative z-10 w-full max-w-[460px] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100/20 dark:border-gray-800 p-8 sm:p-9">
        <div class="mb-6">
          <div class="flex items-center justify-center w-11 h-11 rounded-xl bg-blue-600 text-white shadow-md mx-auto mb-4">
            <span nz-icon nzType="safety-certificate" class="text-2xl"></span>
          </div>
          <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-center text-gray-900 dark:text-white m-0">
            Verify your account
          </h1>
          <p class="text-xs sm:text-sm text-center text-gray-500 dark:text-gray-400 mt-1 mb-0">
            Enter the codes sent to your email and phone to continue.
          </p>
          @if (email(); as e) {
            <div class="mt-2 text-center text-xs font-semibold text-blue-600 dark:text-blue-400">
              {{ e }}
            </div>
          }
        </div>

        @if (errorMessage(); as msg) {
          <div class="mb-4">
            <nz-alert nzType="error" [nzMessage]="msg" nzShowIcon class="!rounded-xl"></nz-alert>
          </div>
        }

        <form [formGroup]="otpForm" (ngSubmit)="verifyOtp()" class="space-y-5" novalidate>
          <div>
            <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Email Verification Code
            </label>
            <app-otp-input formControlName="emailOtp"></app-otp-input>
            @if (controls.emailOtp.invalid && controls.emailOtp.touched) {
              <p class="text-xs text-red-500 mt-1 mb-0">Enter the 6-digit code sent to your email.</p>
            }
          </div>

          <div>
            <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Phone Verification Code
            </label>
            <app-otp-input formControlName="phoneOtp"></app-otp-input>
            @if (controls.phoneOtp.invalid && controls.phoneOtp.touched) {
              <p class="text-xs text-red-500 mt-1 mb-0">Enter the 6-digit code sent to your phone.</p>
            }
          </div>

          <button
            nz-button
            nzType="primary"
            nzSize="large"
            [nzLoading]="verifying()"
            [disabled]="otpForm.invalid"
            type="submit"
            class="w-full !h-11 !rounded-xl !bg-blue-600 hover:!bg-blue-700 font-semibold shadow-md mt-2"
          >
            Verify &amp; Continue
          </button>
        </form>

        <div class="flex items-center justify-between mt-6 pt-4 border-t border-gray-100 dark:border-gray-800 text-xs">
          <button
            nz-button
            nzType="text"
            [nzLoading]="resending()"
            (click)="resendOtp()"
            class="!p-0 text-blue-600 dark:text-blue-400 font-semibold hover:underline"
          >
            Resend codes
          </button>
          <a routerLink="/login" class="text-gray-500 dark:text-gray-400 hover:underline">
            Back to login
          </a>
        </div>
      </div>
    </div>
  `,
  host: {
    class: 'block w-full min-h-screen',
  },
})
export class V2VerifyOtpComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private authApi = inject(AuthApiService);
  private tokenStorage = inject(TokenStorage);
  private toast = inject(ToastService);

  readonly email = signal<string | null>(null);
  readonly verifying = signal(false);
  readonly resending = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly otpForm = this.fb.group({
    emailOtp: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]],
    phoneOtp: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]],
  });

  get controls() {
    return this.otpForm.controls;
  }

  ngOnInit(): void {
    const email = this.route.snapshot.queryParamMap.get('email');
    if (!email) {
      this.router.navigateByUrl('/login');
      return;
    }
    this.email.set(email);
  }

  verifyOtp(): void {
    this.errorMessage.set(null);
    if (this.otpForm.invalid) {
      this.otpForm.markAllAsTouched();
      return;
    }

    this.verifying.set(true);
    const { emailOtp, phoneOtp } = this.otpForm.getRawValue();

    this.authApi
      .verifyRegisterOtp({
        email: this.email()!,
        emailOtp: emailOtp!,
        phoneOtp: phoneOtp!,
      })
      .subscribe({
        next: (res) => {
          this.verifying.set(false);
          this.tokenStorage.set(res.accessToken);
          this.toast.success('Account verified successfully.');
          this.router.navigateByUrl('/dashboard');
        },
        error: (err) => {
          this.verifying.set(false);
          const message =
            err?.error?.message ??
            'OTP verification failed. Please check the codes and try again.';
          this.errorMessage.set(message);
          this.toast.error(message);
        },
      });
  }

  resendOtp(): void {
    if (this.resending() || !this.email()) return;
    this.errorMessage.set(null);
    this.resending.set(true);

    this.authApi.resendRegisterOtp(this.email()!).subscribe({
      next: () => {
        this.resending.set(false);
        this.otpForm.reset();
        this.toast.success('New verification codes have been sent.');
      },
      error: (err) => {
        this.resending.set(false);
        const message = err?.error?.message ?? 'Could not resend codes. Please try again.';
        this.errorMessage.set(message);
        this.toast.error(message);
      },
    });
  }
}

