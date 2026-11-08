import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { CheckboxModule } from 'primeng/checkbox';
import { MessageModule } from 'primeng/message';

import { ThemeToggle } from '../../../shared/theme-toggle/theme-toggle';
import { AuthApiService } from '../../../core/auth/auth-api.service';
import { TokenStorage } from '../../../core/auth/token-storage.service';
import { ToastService } from '../../../core/toast/toast.service';
import { ConfirmService } from '../../../core/confirm/confirm.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    CardModule,
    ButtonModule,
    InputTextModule,
    PasswordModule,
    CheckboxModule,
    MessageModule,
    ThemeToggle,
  ],
  templateUrl: './login.html',
  styleUrls: ['./login.css'],
})
export class Login {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private authApi = inject(AuthApiService);
  private tokenStorage = inject(TokenStorage);
  private toast = inject(ToastService);
  private confirmDialog = inject(ConfirmService);

  // Signals (not plain fields) because this project runs zoneless — plain
  // field mutations inside an rxjs subscribe callback wouldn't repaint the
  // view on their own. See the same note in verify-otp.ts / forgot-password.ts.
  submitting = signal(false);
  errorMessage = signal<string | null>(null);

  form = this.fb.group({
    identifier: ['', [Validators.required]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    rememberMe: [false],
  });

  get identifier() {
    return this.form.controls.identifier;
  }

  get password() {
    return this.form.controls.password;
  }

  onSubmit(): void {
    this.errorMessage.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    const { identifier, password, rememberMe } = this.form.getRawValue();

    this.authApi.login({ identifier: identifier!, password: password!, rememberMe: !!rememberMe }).subscribe({
      next: (res) => {
        this.submitting.set(false);
        this.tokenStorage.set(res.accessToken);
        this.toast.success('Logged in successfully.');

        // Expiry is checked fresh right here, from THIS login response —
        // not discovered later from a failed write — per the explicit
        // requirement: show the popup immediately if the login response
        // says the trial/plan has already run out. SubscriptionGuard on
        // the backend still blocks every write either way; this is just
        // the "catch it immediately on login" half of that requirement.
        if (res.subscription?.isExpired) {
          this.confirmDialog
            .alert({
              header: 'Subscription expired',
              message: 'Your trial or plan has ended. Please upgrade to continue using FitNexus.',
              okLabel: 'Go to Billing',
            })
            .then(() => this.router.navigate(['/billing']));
          return;
        }

        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/dashboard';
        this.router.navigateByUrl(returnUrl);
      },
      error: (err) => {
        this.submitting.set(false);

        // Registered but never finished email/phone OTP verification —
        // send them to the dedicated verification screen instead of
        // just showing an error.
        if (err?.error?.requiresVerification && err?.error?.email) {
          this.toast.warn('Please verify your email and phone to continue.', 'Verification required');
          this.router.navigate(['/verify-otp'], { queryParams: { email: err.error.email } });
          return;
        }

        const message = err?.error?.message ?? 'Login failed. Please check your credentials and try again.';
        this.errorMessage.set(message);
        this.toast.error(message);
      },
    });
  }
}
