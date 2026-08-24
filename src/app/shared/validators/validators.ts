import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * At least 6 characters, one uppercase letter, one lowercase letter, and
 * one number. Used for both signup and reset-password flows so the rule
 * stays identical everywhere a password is created.
 */
export function strongPasswordValidator(): ValidatorFn {
  const pattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/;
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null;
    }
    return pattern.test(control.value) ? null : { weakPassword: true };
  };
}

export function passwordsMatchValidator(passwordKey: string, confirmKey: string): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const password = group.get(passwordKey)?.value;
    const confirm = group.get(confirmKey)?.value;
    if (!password || !confirm) {
      return null;
    }
    return password === confirm ? null : { passwordMismatch: true };
  };
}

/** Simple international phone check (E.164-ish). Swap for a proper
 * libphonenumber-based validator later if stricter per-country rules
 * are needed. */
export const PHONE_PATTERN = /^\+?[1-9]\d{7,14}$/;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Accepts either a valid email address or a valid phone number — used
 * on the forgot-password identifier step, where either is allowed. */
export function emailOrPhoneValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = (control.value ?? '').trim();
    if (!value) {
      return null;
    }
    const isValid = EMAIL_PATTERN.test(value) || PHONE_PATTERN.test(value);
    return isValid ? null : { emailOrPhone: true };
  };
}
