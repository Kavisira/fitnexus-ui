import { Injectable, signal } from '@angular/core';

/**
 * Shared open/collapsed state for the sidebar, since the toggle button
 * that controls it lives in the header (top bar), not the sidebar
 * itself — both components inject this to stay in sync.
 *
 * Two independent concerns:
 *  - `collapsed`: desktop-only icon-rail toggle (~220px <-> ~64px).
 *  - `mobileOpen`: small-screen drawer toggle — the sidebar is hidden
 *    off-canvas by default below the 768px breakpoint and slides in
 *    as an overlay when this is true.
 */
@Injectable({ providedIn: 'root' })
export class SidebarStateService {
  collapsed = signal(false);
  mobileOpen = signal(false);

  toggleCollapsed(): void {
    this.collapsed.update((value) => !value);
  }

  toggleMobile(): void {
    this.mobileOpen.update((value) => !value);
  }

  closeMobile(): void {
    this.mobileOpen.set(false);
  }

  // The header's single nav-toggle button does different things
  // depending on viewport: collapse/expand the rail on desktop, open
  // the drawer on mobile — mirrors the same 768px breakpoint the CSS
  // uses to switch the sidebar into drawer mode.
  toggleForViewport(): void {
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      this.toggleMobile();
    } else {
      this.toggleCollapsed();
    }
  }
}
