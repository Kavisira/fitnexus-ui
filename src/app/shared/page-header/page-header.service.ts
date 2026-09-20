import { Injectable, signal } from '@angular/core';

/** Lets a routed page put its own title into the top nav bar's centered
 * title slot instead of repeating an <h1> inside its own content —
 * every screen calls setTitleKey() in ngOnInit and clear() in
 * ngOnDestroy so the bar doesn't keep a stale title after navigating
 * away. Holds a translation KEY (not the resolved string) so the
 * title stays correct if the language is switched while the page is
 * open — Header's template resolves it through the `translate` pipe,
 * which is impure and re-evaluates on every change-detection pass. */
@Injectable({ providedIn: 'root' })
export class PageHeaderService {
  readonly titleKey = signal<string | null>(null);

  setTitleKey(key: string): void {
    this.titleKey.set(key);
  }

  clear(): void {
    this.titleKey.set(null);
  }
}
