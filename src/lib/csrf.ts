import { type NextRequest } from 'next/server';

export const CSRF_HEADER_NAME = 'X-CSRF-Token';
export const CSRF_COOKIE_NAME = 'csrf-token';

/**
 * Verifies the CSRF token by comparing the header value with the cookie value.
 * @param request The incoming Next.js request.
 * @returns `true` if the tokens are valid and match, otherwise `false`.
 */
export function verifyCsrfToken(request: NextRequest): boolean {
    const csrfTokenFromHeader = request.headers.get(CSRF_HEADER_NAME);
    const csrfTokenFromCookie = request.cookies.get(CSRF_COOKIE_NAME)?.value;

    if (!csrfTokenFromHeader || !csrfTokenFromCookie) {
        console.warn('[CSRF] Verification failed: Missing CSRF token in header or cookie.');
        return false;
    }

    if (csrfTokenFromHeader !== csrfTokenFromCookie) {
        console.warn('[CSRF] Verification failed: Mismatch between CSRF header and cookie.');
        return false;
    }

    return true;
}
