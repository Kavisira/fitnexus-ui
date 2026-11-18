import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeuix/themes/aura';
import { definePreset } from '@primeuix/themes';

import { en_US, provideNzI18n } from 'ng-zorro-antd/i18n';
import { provideNzIcons } from 'ng-zorro-antd/icon';
import { provideNzDateFnsAdapter } from 'ng-zorro-antd/core/time';
import { NzModalService } from 'ng-zorro-antd/modal';
import { ICONS } from './v2/shared/icons';

import { routes } from './app.routes';
import { authInterceptor } from './core/auth/auth.interceptor';

// Aura's default primary color is green — override it to the same blue
// used by the header/sidenav (#1d4ed8 / #2563eb) so every PrimeNG
// component (buttons, links, focus rings, checked states, active tabs,
// etc.) shares one brand color instead of two clashing ones.
const FitNexusPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
      950: '#172554',
    },
  },
});

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAnimationsAsync(),
    provideNzI18n(en_US),
    provideNzIcons(ICONS),
    provideNzDateFnsAdapter(),
    // NzModalService isn't providedIn: 'root' (only NzModalModule provides it),
    // so register it app-wide for ConfirmService, which any page may inject.
    NzModalService,
    // PrimeNG stays only for v1 screens still awaiting migration (legacy-shell.routes.ts).
    providePrimeNG({
      theme: {
        preset: FitNexusPreset,
        options: {
          darkModeSelector: '.my-app-dark',
        },
      },
    }),
  ],
};
