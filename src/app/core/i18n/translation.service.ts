import { Injectable, signal } from '@angular/core';
import { en } from './translations/en';
import { ta } from './translations/ta';

export type AppLanguage = 'en' | 'ta';

const STORAGE_KEY = 'fitnexus-lang';

const DICTS: Record<AppLanguage, unknown> = { en, ta };

export const AVAILABLE_LANGUAGES: { code: AppLanguage; nativeName: string }[] = [
  { code: 'en', nativeName: 'English' },
  { code: 'ta', nativeName: 'தமிழ்' },
];

/**
 * Minimal runtime i18n service (no external library) so the language can
 * be switched instantly without a page reload/rebuild. Add more languages
 * later by creating another translations/<code>.ts file, adding it to
 * DICTS and AVAILABLE_LANGUAGES above.
 */
@Injectable({ providedIn: 'root' })
export class TranslationService {
  readonly lang = signal<AppLanguage>(this.resolveInitialLang());

  setLang(lang: AppLanguage): void {
    this.lang.set(lang);
    localStorage.setItem(STORAGE_KEY, lang);
  }

  /** Looks up a dot-separated key (e.g. "auth.login.title") in the
   * current language's dictionary, falling back to English, then to the
   * key itself if nothing matches. */
  t(key: string): string {
    return this.lookup(DICTS[this.lang()], key) ?? this.lookup(DICTS.en, key) ?? key;
  }

  private lookup(dict: unknown, key: string): string | undefined {
    const value = key.split('.').reduce<unknown>((acc, part) => {
      if (acc && typeof acc === 'object' && part in (acc as Record<string, unknown>)) {
        return (acc as Record<string, unknown>)[part];
      }
      return undefined;
    }, dict);
    return typeof value === 'string' ? value : undefined;
  }

  private resolveInitialLang(): AppLanguage {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'ta' || stored === 'en' ? stored : 'en';
  }
}
