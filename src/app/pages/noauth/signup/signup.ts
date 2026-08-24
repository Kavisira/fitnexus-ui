import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { MessageModule } from 'primeng/message';

import { ThemeToggle } from '../../../shared/theme-toggle/theme-toggle';
import { PHONE_PATTERN, passwordsMatchValidator, strongPasswordValidator } from '../../../shared/validators/validators';
import { AuthApiService } from '../../../core/auth/auth-api.service';
import { ToastService } from '../../../core/toast/toast.service';

/** Collects the account details, then hands off to the dedicated
 * /verify-otp screen (shared with the login flow's "not verified yet"
 * redirect) rather than embedding an OTP step here. */
@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    CardModule,
    ButtonModule,
    InputTextModule,
    PasswordModule,
    MessageModule,
    ThemeToggle,
  ],
  templateUrl: './signup.html',
  styleUrls: ['./signup.css'],
})
export class Signup {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private authApi = inject(AuthApiService);
  private toast = inject(ToastService);

  submitting = signal(false);
  errorMessage = signal<string | null>(null);

  detailsForm = this.fb.group(
    {
      ownerName: ['', [Validators.required, Validators.minLength(2)]],
      organizationName: ['', [Validators.required, Validators.minLength(2)]],
      phone: ['', [Validators.required, Validators.pattern(PHONE_PATTERN)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, strongPasswordValidator()]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordsMatchValidator('password', 'confirmPassword') },
  );

  get f() {
    return this.detailsForm.controls;
  }

  submitDetails(): void {
    this.errorMessage.set(null);

    if (this.detailsForm.invalid) {
      this.detailsForm.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    const { ownerName, organizationName, phone, email, password } = this.detailsForm.getRawValue();

    this.authApi
      .register({
        ownerName: ownerName!,
        organizationName: organizationName!,
        phone: phone!,
        email: email!,
        password: password!,
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.toast.success('Verification codes sent to your email and phone.');
          this.router.navigate(['/verify-otp'], { queryParams: { email } });
        },
        error: (err) => {
          this.submitting.set(false);
          const message = err?.error?.message ?? 'Registration failed. Please try again.';
          this.errorMessage.set(message);
          this.toast.error(message);
        },
      });
  }
}
