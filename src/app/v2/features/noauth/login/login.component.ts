import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzIconModule } from 'ng-zorro-antd/icon';

import { ThemeToggleComponent } from '../../../shared/components/theme-toggle/theme-toggle.component';
import { AuthApiService } from '../../../../core/auth/auth-api.service';
import { TokenStorage } from '../../../../core/auth/token-storage.service';
import { ToastService } from '../../../../core/toast/toast.service';
import { ConfirmService } from '../../../../core/confirm/confirm.service';

@Component({
  selector: 'app-v2-login',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    NzButtonModule,
    NzInputModule,
    NzCheckboxModule,
    NzAlertModule,
    NzIconModule,
    ThemeToggleComponent,
  ],
  template: `
    <div
      class="min-h-screen w-full flex items-center justify-center p-4 relative bg-cover bg-center bg-no-repeat"
      style="background-image: url('/assets/imgs/loginbg.png');"
    >
      <!-- Dark gradient overlay matching existing login screen -->
      <div class="absolute inset-0 bg-gradient-to-br from-slate-900/70 via-slate-900/80 to-slate-950/85 z-0 pointer-events-none"></div>

      <!-- Top right theme toggle -->
      <div class="fixed top-4 right-4 z-50">
        <app-theme-toggle></app-theme-toggle>
      </div>

      <!-- Centered Login Card -->
      <div class="relative z-10 w-full max-w-[420px] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100/20 dark:border-gray-800 p-8 sm:p-9">
        <div class="mb-6">
          <h1 class="text-xl font-bold tracking-tight text-gray-900 dark:text-white m-0">
            Welcome back
          </h1>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-0">
            Sign in to your FitNexus account
          </p>
        </div>

        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4" novalidate>
          <!-- Email / Phone Field -->
          <div>
            <label for="identifier" class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Email or phone number
            </label>
            <nz-input-wrapper class="w-full">
              <span nzInputPrefix nz-icon nzType="user" class="text-gray-400 text-base mr-1.5"></span>
              <input
                nz-input
                id="identifier"
                type="text"
                formControlName="identifier"
                placeholder="Enter your email or phone number"
                autocomplete="username"
                class="w-full !py-2.5 !rounded-lg bg-blue-50/50 dark:bg-gray-800 border border-blue-100 dark:border-gray-700"
              />
            </nz-input-wrapper>
            @if (identifier.invalid && identifier.touched) {
              <p class="text-xs text-red-500 mt-1 mb-0">Email or phone number is required.</p>
            }
          </div>

          <!-- Password Field -->
          <div>
            <label for="password" class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Password
            </label>
            <nz-input-password class="w-full">
              <span nzInputPrefix nz-icon nzType="lock" class="text-gray-400 text-base mr-1.5"></span>
              <input
                nz-input
                id="password"
                type="password"
                formControlName="password"
                placeholder="Password"
                autocomplete="current-password"
                class="w-full !py-2.5 !rounded-lg bg-blue-50/50 dark:bg-gray-800 border border-blue-100 dark:border-gray-700"
              />
            </nz-input-password>
            <div class="flex justify-end mt-1">
              <a routerLink="/forgot-password" class="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                Forgot password?
              </a>
            </div>
            @if (password.invalid && password.touched) {
              <p class="text-xs text-red-500 mt-1 mb-0">Password is required.</p>
            }
          </div>

          <!-- Remember Me Checkbox -->
          <div class="pt-1">
            <label nz-checkbox formControlName="rememberMe" class="text-sm text-gray-600 dark:text-gray-300">
              Remember me
            </label>
          </div>

          <!-- Error Alert Banner -->
          @if (errorMessage(); as msg) {
            <nz-alert nzType="error" [nzMessage]="msg" nzShowIcon class="rounded-xl"></nz-alert>
          }

          <!-- Submit Button -->
          <button
            nz-button
            nzType="primary"
            nzSize="large"
            nzBlock
            type="submit"
            [nzLoading]="submitting()"
            class="!h-11 !rounded-xl !font-semibold !mt-6 shadow-sm !bg-blue-600 hover:!bg-blue-700"
          >
            Login
          </button>
        </form>

        <!-- Sign Up Link -->
        <div class="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
          Don't have an account?
          <a routerLink="/signup" class="font-semibold text-blue-600 dark:text-blue-400 hover:underline ml-1">
            Sign up
          </a>
        </div>
      </div>
    </div>
  `,
})
export class V2LoginComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private authApi = inject(AuthApiService);
  private tokenStorage = inject(TokenStorage);
  private toast = inject(ToastService);
  private confirmDialog = inject(ConfirmService);

  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.group({
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
