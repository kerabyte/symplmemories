import {NextResponse} from 'next/server';
import type {NextRequest} from 'next/server';
import {jwtVerify} from 'jose';
import { doubleCsrf } from 'csrf-csrf';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'default-secret-key-that-is-long-enough');
const JWT_COOKIE_NAME = 'admin_session';

// CSRF Protection Configuration
const {
  generateToken, // Use this in your routes to provide the token to your UI
  validateRequest, // Use this in your API routes to check if the request is valid
} = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET || 'default-csrf-secret-that-is-long-enough',
  cookieName: "__Host-csrf-token",
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    sameSite: "strict",
  },
  size: 64,
  tokenHeader: "X-CSRF-Token",
});


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
  
  // CSRF protection for API routes
  if (pathname.startsWith('/api/admin/login')) {
    try {
        await validateRequest(request);
    } catch(e) {
        console.error('CSRF Error', e);
        return NextResponse.json({ error: 'CSRF token is invalid.' }, { status: 403 });
    }
  }


  // Logic for protected admin routes (e.g., /admin/dashboard)
  if (pathname.startsWith('/admin/') && pathname !== '/admin') {
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

  const response = NextResponse.next();
  
  // Generate and set the CSRF token on the response for the client to use.
  // This should happen on any response so the client always has a fresh token.
  const token = generateToken(request, response);
  response.cookies.set('csrf_token', token, {
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      sameSite: 'strict',
  });
  
  return response;
}

export const config = {
  // Apply middleware to all admin paths AND api routes
  matcher: ['/admin/:path*', '/api/admin/login'],
};
