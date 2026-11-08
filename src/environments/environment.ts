// Development config — used by `ng serve` / `ng build` (no --configuration
// production) and swapped for environment.prod.ts on production builds via
// the `fileReplacements` entry in angular.json.
export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:3000/api',
  // Matches the backend's CASHFREE_ENV=TEST — the Cashfree JS SDK takes
  // its own separate 'sandbox'/'production' mode string (see
  // billing.ts, which loads it).
  cashfreeMode: 'sandbox' as const,
};
