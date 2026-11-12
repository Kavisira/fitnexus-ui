import { Injectable } from '@angular/core';
import { isJwtExpired } from '../auth/jwt-utils';

// Deliberately a SEPARATE localStorage key from the tenant app's own
// 'fitnexus-token' — a platform-admin session and a gym owner/staff
// session must never read or clobber each other, even if both happen
// to be open in the same browser at once (e.g. you, testing your own
// org's login in one tab and /admin-portal in another).
const TOKEN_KEY = 'fitnexus-platform-admin-token';

@Injectable({ providedIn: 'root' })
export class AdminPortalTokenStorage {
  set(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  }

  get(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  clear(): void {
    localStorage.removeItem(TOKEN_KEY);
  }

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
