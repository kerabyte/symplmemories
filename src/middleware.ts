
import { NextResponse } from 'next/server';
import type {NextRequest} from 'next/server';
import {jwtVerify} from 'jose';
import { doubleCsrf } from 'csrf-csrf';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'default-secret-key-that-is-long-enough');
const JWT_COOKIE_NAME = 'admin_session';

const {
  generateToken,
  validateRequest,
} = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET || 'default-csrf-secret-that-is-long-enough', // A secret that is used to hash the token
  cookieName: 'csrf_token', // The name of the cookie to be used, recommend using Host- prefix.
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    sameSite: 'lax',
  },
  size: 64, // The size of the generated tokens in bits
  headerName: "x-csrf-token",
});

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
  if (pathname.startsWith('/admin/dashboard')) {
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

  // Verify CSRF token for all state-changing API requests.
  if (request.method === 'POST' && pathname.startsWith('/api/admin/')) {
    try {
      await validateRequest(request);
    } catch(e) {
        console.error(`[CSRF] Failed validation for ${request.method} ${pathname}`, e);
        return new NextResponse(JSON.stringify({ error: "Invalid CSRF token. Please refresh the page and try again." }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
    }
  }
  
  // Generate and set the CSRF token on the response for the client to use.
  // This should happen on any response so the client always has a fresh token.
  const csrfToken = generateToken();
  response.cookies.set('csrf_token', csrfToken, {
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      sameSite: 'lax',
  });

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
