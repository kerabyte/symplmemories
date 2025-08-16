import {NextResponse} from 'next/server';
import type {NextRequest} from 'next/server';
import {jwtVerify} from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'default-secret-key-that-is-long-enough');
const JWT_COOKIE_NAME = 'admin_session';

async function verifyJWT(token: string) {
  try {
    const {payload} = await jwtVerify(token, JWT_SECRET);
    return payload;
  } catch (error) {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const {pathname} = request.nextUrl;

  // Logic for protected admin routes (e.g., /admin/dashboard)
  if (pathname.startsWith('/admin/') && pathname !== '/admin/login') {
    const sessionCookie = request.cookies.get(JWT_COOKIE_NAME);

    if (!sessionCookie) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }

    const decoded = await verifyJWT(sessionCookie.value);

    if (!decoded) {
      // Clear invalid cookie and redirect to login
      const response = NextResponse.redirect(new URL('/admin', request.url));
      response.cookies.delete(JWT_COOKIE_NAME);
      return response;
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


  return NextResponse.next();
}

export const config = {
  // Apply middleware to all admin paths except for static assets
  matcher: ['/admin/:path*', '/admin'],
};
