import { Injectable } from '@angular/core';
import { decodeJwt, isJwtExpired } from './jwt-utils';

const TOKEN_KEY = 'fitnexus-token';

@Injectable({ providedIn: 'root' })
export class TokenStorage {
  set(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  }

  get(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  clear(): void {
    localStorage.removeItem(TOKEN_KEY);
  }

  /** Reads the `role` claim straight off the current token — never
   * trusted for anything security-sensitive (the backend re-checks on
   * every request), just used to decide what the UI shows, like the
   * owner-only credentials section on an employee's detail screen. */
  getRole(): string | null {
    const token = this.get();
    if (!token) {
      return null;
    }
    const decoded = decodeJwt(token);
    return (decoded?.['role'] as string | undefined) ?? null;
  }

  isOwner(): boolean {
    return this.getRole() === 'OWNER';
  }

  /** Reads the `email` claim off the current token — display-only,
   * same "never security-sensitive" caveat as getRole(). Used for the
   * header's profile avatar initial and account menu. */
  getEmail(): string | null {
    const token = this.get();
    if (!token) {
      return null;
    }
    const decoded = decodeJwt(token);
    return (decoded?.['email'] as string | undefined) ?? null;
  }

  /** True when a token is present and its `exp` claim (30m or 30d,
   * depending on "remember me" at login) hasn't passed yet. */
  hasValidSession(): boolean {
    const token = this.get();
    if (!token) {
      return false;
    }
    if (isJwtExpired(token)) {
      this.clear();
      return false;
    }
    return true;
  }
}
