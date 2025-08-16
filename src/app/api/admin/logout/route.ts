
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const JWT_COOKIE_NAME = 'admin_session';

export async function POST() {
  try {
    const cookieStore = cookies();
    
    // To properly delete a cookie, you need to set its value to empty and maxAge to 0.
    cookieStore.set(JWT_COOKIE_NAME, '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 0,
    });

    return NextResponse.json({ success: true, message: 'Logged out successfully.' });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ success: false, message: 'An unexpected error occurred during logout.' }, { status: 500 });
  }
}
