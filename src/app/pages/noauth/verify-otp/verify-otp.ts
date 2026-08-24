import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputOtpModule } from 'primeng/inputotp';
import { MessageModule } from 'primeng/message';

import { ThemeToggle } from '../../../shared/theme-toggle/theme-toggle';
import { AuthApiService } from '../../../core/auth/auth-api.service';
import { TokenStorage } from '../../../core/auth/token-storage.service';
import { ToastService } from '../../../core/toast/toast.service';

/** Dedicated email+phone OTP verification screen. Both the registration
 * flow (after submitting details) and the login flow (when an account
 * exists but isn't verified yet) land here — the only difference is how
 * they arrived, not what this screen does. Always ends the same way on
 * success: the account is verified, a session token is issued, and the
 * user goes straight to /dashboard. */
@Component({
  selector: 'app-verify-otp',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, CardModule, ButtonModule, InputOtpModule, MessageModule, ThemeToggle],
  templateUrl: './verify-otp.html',
  styleUrls: ['./verify-otp.css'],
})
export class VerifyOtp implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private authApi = inject(AuthApiService);
  private tokenStorage = inject(TokenStorage);
  private toast = inject(ToastService);

  email = signal<string | null>(null);
  verifying = signal(false);
  resending = signal(false);
  errorMessage = signal<string | null>(null);

  otpForm = this.fb.group({
    emailOtp: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]],
    phoneOtp: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]],
  });

  get otpControls() {
    return this.otpForm.controls;
  }

  ngOnInit(): void {
    const email = this.route.snapshot.queryParamMap.get('email');
    if (!email) {
      // No account context to verify — nothing useful to do here.
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

    this.authApi.verifyRegisterOtp({ email: this.email()!, emailOtp: emailOtp!, phoneOtp: phoneOtp! }).subscribe({
      next: (res) => {
        this.verifying.set(false);
        this.tokenStorage.set(res.accessToken);
        this.toast.success('Account verified successfully.');
        this.router.navigateByUrl('/dashboard');
      },
      error: (err) => {
        this.verifying.set(false);
        const message = err?.error?.message ?? 'OTP verification failed. Please check the codes and try again.';
        this.errorMessage.set(message);
        this.toast.error(message);
      },
    });
  }

  resendOtp(): void {
    if (this.resending() || !this.email()) {
      return;
    }

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

  goToLogin(): void {
    this.router.navigateByUrl('/login');
  }
}
