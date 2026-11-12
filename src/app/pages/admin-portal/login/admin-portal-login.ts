import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { MessageModule } from 'primeng/message';
import { ThemeToggle } from '../../../shared/theme-toggle/theme-toggle';

import { AdminPortalApiService } from '../../../core/admin-portal/admin-portal-api.service';

@Component({
  selector: 'app-admin-portal-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CardModule, ButtonModule, InputTextModule, PasswordModule, MessageModule, ThemeToggle],
  templateUrl: './admin-portal-login.html',
  styleUrls: ['./admin-portal-login.css'],
})
export class AdminPortalLogin {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private api = inject(AdminPortalApiService);

  submitting = signal(false);
  errorMessage = signal<string | null>(null);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  onSubmit(): void {
    this.errorMessage.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    const { email, password } = this.form.getRawValue();

    this.api.login(email!, password!).subscribe({
      next: () => {
        this.submitting.set(false);
        this.router.navigate(['/admin-portal/overview']);
      },
      error: (err) => {
        this.submitting.set(false);
        this.errorMessage.set(err?.error?.message ?? 'Login failed.');
      },
    });
  }
}
