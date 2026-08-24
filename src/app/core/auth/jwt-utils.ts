/** Minimal JWT payload decoder — no external dependency needed since we
 * only ever read the `exp` (and `sub`/`email`) claims client-side. Never
 * use this for anything security-sensitive; the token is still verified
 * server-side on every request. */
export interface DecodedJwt {
  sub?: string;
  email?: string;
  exp?: number; // seconds since epoch
  [key: string]: unknown;
}

export function decodeJwt(token: string): DecodedJwt | null {
  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }

  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const json = decodeURIComponent(
      atob(padded)
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join(''),
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function isJwtExpired(token: string): boolean {
  const decoded = decodeJwt(token);
  if (!decoded?.exp) {
    return true;
  }
  return Date.now() >= decoded.exp * 1000;
}
