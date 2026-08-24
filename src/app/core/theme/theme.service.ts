import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'fitnexus-theme';
const DARK_CLASS = 'my-app-dark';

export type ThemeMode = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly mode = signal<ThemeMode>(this.resolveInitialMode());

  constructor() {
    this.applyToDocument(this.mode());
  }

  toggle(): void {
    this.setMode(this.mode() === 'dark' ? 'light' : 'dark');
  }

  setMode(mode: ThemeMode): void {
    this.mode.set(mode);
    this.applyToDocument(mode);
    localStorage.setItem(STORAGE_KEY, mode);
  }

  private applyToDocument(mode: ThemeMode): void {
    document.documentElement.classList.toggle(DARK_CLASS, mode === 'dark');
  }

  private resolveInitialMode(): ThemeMode {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  }
}
