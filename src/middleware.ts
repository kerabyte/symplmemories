import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { verifyCsrfToken, CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from './lib/csrf';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'default-secret-key-that-is-long-enough');
const JWT_COOKIE_NAME = 'admin_session';

// API routes that do not require CSRF protection.
// Typically, these are GET routes or routes that don't modify state.
const PUBLIC_API_ROUTES: string[] = [
  // No public routes for admin endpoints - all require CSRF protection
];

async function verifyJWT(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload;
  } catch (error) {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const { pathname } = request.nextUrl;

  // 1. Set CSRF tokens for the client on their first visit or if cookies are cleared.
  // The client needs one cookie it can read to send in a header,
  // and the server needs a matching httpOnly cookie to verify against.
  if (!request.cookies.has(CSRF_COOKIE_NAME)) {
    const token = crypto.randomUUID();

    // The main secure token, inaccessible to client-side JS
    response.cookies.set({
      name: CSRF_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      sameSite: 'lax',
    });

    // The duplicate token for the client script to read and send back in a header
    response.cookies.set({
      name: CSRF_HEADER_NAME,
      value: token,
      // NOT httpOnly, so client-side JS can read it
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      sameSite: 'lax',
    });
  }

  // 2. Verify CSRF token for all state-changing API requests.
  if (request.method !== 'GET' && request.method !== 'HEAD' && request.method !== 'OPTIONS') {
    if (pathname.startsWith('/api/admin/')) {
      const isPublic = PUBLIC_API_ROUTES.some(path => pathname.startsWith(path));

      // If it's not a public route, it must be protected.
      if (!isPublic) {
        if (!verifyCsrfToken(request)) {
          console.error(`[CSRF] Failed validation for ${request.method} ${pathname}`);
          return new NextResponse(JSON.stringify({ error: "Invalid CSRF token. Please refresh the page and try again." }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }
    }
  }

  // 3. JWT-based authentication for admin routes (same as before)

  // Logic for protected admin routes (e.g., /admin/dashboard)
  if (pathname.startsWith('/admin/') && pathname !== '/admin') {
    const sessionCookie = request.cookies.get(JWT_COOKIE_NAME);

    if (!sessionCookie) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }

    const decoded = await verifyJWT(sessionCookie.value);

    if (!decoded) {
      // Clear invalid cookie and redirect to login
      const redirectResponse = NextResponse.redirect(new URL('/admin', request.url));
      redirectResponse.cookies.delete(JWT_COOKIE_NAME);
      return redirectResponse;
    }
  }

  // Logic for the admin login page itself
  if (pathname === '/admin') {
    const sessionCookie = request.cookies.get(JWT_COOKIE_NAME);
    if (sessionCookie) {
      const decoded = await verifyJWT(sessionCookie.value);
      // If token is valid, redirect to dashboard
      if (decoded) {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url));
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * This ensures the middleware runs on all pages and API routes to set and verify tokens.
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};