import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzAlertModule } from 'ng-zorro-antd/alert';

import { ThemeToggleComponent } from '../../../shared/components/theme-toggle/theme-toggle.component';
import { AppOtpInputComponent } from '../../../shared/components/app-otp-input/app-otp-input.component';
import {
  emailOrPhoneValidator,
  passwordsMatchValidator,
  strongPasswordValidator,
} from '../../../../shared/validators/validators';
import { AuthApiService } from '../../../../core/auth/auth-api.service';
import { ToastService } from '../../../../core/toast/toast.service';

type ForgotStep = 'identifier' | 'otp' | 'reset' | 'success';

@Component({
  selector: 'app-v2-forgot-password',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    NzButtonModule,
    NzIconModule,
    NzInputModule,
    NzAlertModule,
    ThemeToggleComponent,
    AppOtpInputComponent,
  ],
  templateUrl: './forgot-password.component.html',
  host: {
    class: 'block w-full min-h-screen',
  },
})
export class V2ForgotPasswordComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private authApi = inject(AuthApiService);
  private toast = inject(ToastService);

  readonly step = signal<ForgotStep>('identifier');
  readonly sending = signal(false);
  readonly verifying = signal(false);
  readonly resending = signal(false);
  readonly resetting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly otpErrorMessage = signal<string | null>(null);

  readonly identifierForm = this.fb.group({
    identifier: ['', [Validators.required, emailOrPhoneValidator()]],
  });

  readonly otpForm = this.fb.group({
    otp: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]],
  });

  readonly resetForm = this.fb.group(
    {
      newPassword: ['', [Validators.required, strongPasswordValidator()]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordsMatchValidator('newPassword', 'confirmPassword') },
  );

  get idControl() {
    return this.identifierForm.controls.identifier;
  }
  get otpControl() {
    return this.otpForm.controls.otp;
  }
  get rControls() {
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
    if (this.resending()) return;
    this.otpErrorMessage.set(null);
    this.resending.set(true);
    const { identifier } = this.identifierForm.getRawValue();

    this.authApi.resendResetOtp(identifier!).subscribe({
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

  goToLogin(): void {
    this.router.navigateByUrl('/login');
  }
}
