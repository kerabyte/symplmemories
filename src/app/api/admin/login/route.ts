// src/app/api/admin/login/route.ts
import { NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { cookies } from 'next/headers';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'default-secret-key-that-is-long-enough');
const JWT_COOKIE_NAME = 'admin_session';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    const wedId = process.env.WEDDING_ID;
    const authKey = process.env.AUTH_KEY;
    const backendUrl = process.env.API_BACKEND_URL;

    if (!wedId || !authKey || !backendUrl) {
      return NextResponse.json({ issue: 'Server configuration error.' }, { status: 500 });
    }

    const apiResponse = await fetch(`${backendUrl}/api/wedadmin/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        wedId: wedId,
        admnUsrName: username,
        admnUsrPwd: password,
        wedauthkey: authKey,
      }),
    });

    const data = await apiResponse.json();

    if (apiResponse.ok && data.loginStatus) {
      // Create JWT
      const token = await new SignJWT({ 'sub': data.adminInfo.id, 'user': data.adminInfo.admnUsrName })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('1h') // Token expires in 1 hour
        .sign(JWT_SECRET);

      // Set cookie
      (await cookies()).set(JWT_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 60, // 1 hour
      });

      return NextResponse.json({ loginStatus: true });
    } else {
      return NextResponse.json({ loginStatus: false, issue: data.issue || 'Invalid credentials or server error.' }, { status: 401 });
    }
  } catch (error) {
    console.error('Login proxy error:', error);
    return NextResponse.json({ issue: 'An unexpected error occurred.' }, { status: 500 });
  }
}
