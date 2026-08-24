import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { InputOtpModule } from 'primeng/inputotp';
import { MessageModule } from 'primeng/message';

import { ThemeToggle } from '../../../shared/theme-toggle/theme-toggle';
import { emailOrPhoneValidator, passwordsMatchValidator, strongPasswordValidator } from '../../../shared/validators/validators';
import { AuthApiService } from '../../../core/auth/auth-api.service';
import { ToastService } from '../../../core/toast/toast.service';

type ForgotPasswordStep = 'identifier' | 'otp' | 'reset' | 'success';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    CardModule,
    ButtonModule,
    InputTextModule,
    PasswordModule,
    InputOtpModule,
    MessageModule,
    ThemeToggle,
  ],
  templateUrl: './forgot-password.html',
  styleUrls: ['./forgot-password.css'],
})
export class ForgotPassword {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private authApi = inject(AuthApiService);
  private toast = inject(ToastService);

  // Signals (not plain fields) because this project runs zoneless — see
  // the same note in signup.ts.
  step = signal<ForgotPasswordStep>('identifier');
  sending = signal(false);
  verifying = signal(false);
  resending = signal(false);
  resetting = signal(false);
  errorMessage = signal<string | null>(null);
  otpErrorMessage = signal<string | null>(null);

  identifierForm = this.fb.group({
    identifier: ['', [Validators.required, emailOrPhoneValidator()]],
  });

  otpForm = this.fb.group({
    otp: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]],
  });

  resetForm = this.fb.group(
    {
      newPassword: ['', [Validators.required, strongPasswordValidator()]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordsMatchValidator('newPassword', 'confirmPassword') },
  );

  get identifierControl() {
    return this.identifierForm.controls.identifier;
  }

  get otpControl() {
    return this.otpForm.controls.otp;
  }

  get resetControls() {
    return this.resetForm.controls;
  }

  submitIdentifier(): void {
    this.errorMessage.set(null);

    if (this.identifierForm.invalid) {
      this.identifierForm.markAllAsTouched();
      return;
    }

    this.sending.set(true);
    const { identifier } = this.identifierForm.getRawValue();

    this.authApi.forgotPassword(identifier!).subscribe({
      next: () => {
        this.sending.set(false);
        this.toast.success('If that account exists, a verification code has been sent.');
        this.step.set('otp');
      },
      error: (err) => {
        this.sending.set(false);
        const message = err?.error?.message ?? 'Something went wrong. Please try again.';
        this.errorMessage.set(message);
        this.toast.error(message);
      },
    });
  }

  verifyOtp(): void {
    this.otpErrorMessage.set(null);

    if (this.otpForm.invalid) {
      this.otpForm.markAllAsTouched();
      return;
    }

    this.verifying.set(true);
    const { otp } = this.otpForm.getRawValue();
    const { identifier } = this.identifierForm.getRawValue();

    this.authApi.verifyResetOtp(identifier!, otp!).subscribe({
      next: () => {
        this.verifying.set(false);
        this.step.set('reset');
      },
      error: (err) => {
        this.verifying.set(false);
        const message = err?.error?.message ?? 'Invalid or expired code. Please try again.';
        this.otpErrorMessage.set(message);
        this.toast.error(message);
      },
    });
  }

  resendOtp(): void {
    if (this.resending()) {
      return;
    }

    this.otpErrorMessage.set(null);
    this.resending.set(true);
    const { identifier } = this.identifierForm.getRawValue();

    this.authApi.forgotPassword(identifier!).subscribe({
      next: () => {
        this.resending.set(false);
        this.otpForm.reset();
        this.toast.success('A new code has been sent.');
      },
      error: (err) => {
        this.resending.set(false);
        const message = err?.error?.message ?? 'Could not resend the code. Please try again.';
        this.otpErrorMessage.set(message);
        this.toast.error(message);
      },
    });
  }

  submitReset(): void {
    if (this.resetForm.invalid) {
      this.resetForm.markAllAsTouched();
      return;
    }

    this.resetting.set(true);
    const { newPassword } = this.resetForm.getRawValue();
    const { identifier } = this.identifierForm.getRawValue();
    const { otp } = this.otpForm.getRawValue();

    this.authApi.resetPassword(identifier!, otp!, newPassword!).subscribe({
      next: () => {
        this.resetting.set(false);
        this.toast.success('Password updated. Please log in with your new password.');
        this.step.set('success');
      },
      error: (err) => {
        this.resetting.set(false);
        const message = err?.error?.message ?? 'Could not reset password. Please try again.';
        this.errorMessage.set(message);
        this.toast.error(message);
      },
    });
  }

  editIdentifier(): void {
    this.step.set('identifier');
  }

  goToLogin(): void {
    this.router.navigateByUrl('/login');
  }
}
