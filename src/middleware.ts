
import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { verifyCsrfToken, CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from './lib/csrf';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'default-secret-key-that-is-long-enough');
const JWT_COOKIE_NAME = 'admin_session';

// API routes that do not require CSRF protection.
// The login route is exempt because the CSRF token is not yet available.
const PUBLIC_API_ROUTES: string[] = [
  // No public admin routes, all require session and CSRF
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
  const { pathname } = request.nextUrl;

  // 1. JWT-based authentication for admin routes
  // Protect all routes under /admin/ except the login page /admin itself
  if (pathname.startsWith('/admin/') && pathname !== '/admin/dashboard') {
      // This is a catch-all for any future /admin/sub-pages.
      // Redirect them to the dashboard for now.
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
  }
  
  if (pathname.startsWith('/admin/dashboard') || pathname.startsWith('/api/admin/logout')) {
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

  // If user is logged in, redirect them away from the login page
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


  // 2. Handle CSRF token generation and verification
  const response = NextResponse.next();

  // Set CSRF token cookie if it doesn't exist
  if (!request.cookies.has(CSRF_COOKIE_NAME)) {
    const token = crypto.randomUUID();
    response.cookies.set({
      name: CSRF_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      sameSite: 'lax',
    });
    // The readable cookie for the client script
    response.cookies.set({
        name: 'X-CSRF-Token',
        value: token,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        sameSite: 'lax',
    });
  }
  
  // Verify CSRF token for all state-changing API requests.
  if (request.method === 'POST' && pathname.startsWith('/api/admin/')) {
       // The login route is a special case. It's a POST request but happens before a session is established.
      // It still needs CSRF protection.
      if (!verifyCsrfToken(request)) {
          console.error(`[CSRF] Failed validation for ${request.method} ${pathname}`);
          return new NextResponse(JSON.stringify({ error: "Invalid CSRF token. Please refresh the page and try again." }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' }
          });
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
