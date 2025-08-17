
import { NextResponse } from 'next/server';
import type {NextRequest} from 'next/server';
import {jwtVerify} from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'default-secret-key-that-is-long-enough');
const JWT_COOKIE_NAME = 'admin_session';

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
  if (pathname.startsWith('/admin/dashboard') || pathname.startsWith('/api/admin/')) {
     if (pathname.startsWith('/api/admin/login') || pathname.startsWith('/api/admin/logout')) {
         // These routes don't need authentication check themselves
     } else {
        const sessionCookie = request.cookies.get(JWT_COOKIE_NAME);

        if (!sessionCookie) {
          const url = request.nextUrl.clone()
          url.pathname = '/admin'
          return NextResponse.redirect(url)
        }

        const decoded = await verifyJWT(sessionCookie.value);

        if (!decoded) {
          // Clear invalid cookie and redirect to login
          const url = request.nextUrl.clone()
          url.pathname = '/admin'
          const redirectResponse = NextResponse.redirect(url);
          redirectResponse.cookies.delete(JWT_COOKIE_NAME);
          return redirectResponse;
        }
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

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * This ensures the middleware runs on all pages and API routes.
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
