import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzAlertModule } from 'ng-zorro-antd/alert';

import { ThemeToggleComponent } from '../../../shared/components/theme-toggle/theme-toggle.component';
import {
  PHONE_PATTERN,
  passwordsMatchValidator,
  strongPasswordValidator,
} from '../../../../shared/validators/validators';
import { AuthApiService } from '../../../../core/auth/auth-api.service';
import { ToastService } from '../../../../core/toast/toast.service';

@Component({
  selector: 'app-v2-signup',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    NzButtonModule,
    NzIconModule,
    NzInputModule,
    NzAlertModule,
    ThemeToggleComponent,
  ],
  templateUrl: './signup.component.html',
  host: {
    class: 'block w-full min-h-screen',
  },
})
export class V2SignupComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private authApi = inject(AuthApiService);
  private toast = inject(ToastService);

  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.group(
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
    return this.form.controls;
  }

  onSubmit(): void {
    this.errorMessage.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    const { ownerName, organizationName, phone, email, password } = this.form.getRawValue();

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
