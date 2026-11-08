// Minimal type shim — @cashfreepayments/cashfree-js ships no types of
// its own. Only the two calls billing.ts actually uses are declared.
declare module '@cashfreepayments/cashfree-js' {
  export interface CashfreeCheckoutResult {
    error?: { message: string };
  }

  export interface CashfreeInstance {
    // Cashfree's own parameter name is `subsSessionId` (NOT
    // `subscriptionSessionId`) — passing the wrong key silently gives
    // the SDK no valid session id, so it never opens the checkout
    // page at all (it just idles on its internal ping handshake).
    subscriptionsCheckout(options: {
      subsSessionId: string;
      redirectTarget?: '_self' | '_blank' | '_top';
    }): Promise<CashfreeCheckoutResult>;
  }
  export function load(options: { mode: 'sandbox' | 'production' }): Promise<CashfreeInstance>;
}
