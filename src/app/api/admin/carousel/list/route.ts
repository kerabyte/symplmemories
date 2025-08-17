
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'default-secret-key-that-is-long-enough');

async function verifyJWT(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload;
  } catch (error) {
    return null;
  }
}

export async function POST(request: Request) {
    const session = cookies().get('admin_session')?.value;
    if (!session) {
        return NextResponse.json({ issue: 'Unauthorized' }, { status: 401 });
    }
    const decoded = await verifyJWT(session);
    if (!decoded) {
        return NextResponse.json({ issue: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    const wedId = process.env.WEDDING_ID;
    const authKey = process.env.AUTH_KEY;
    const backendUrl = process.env.API_BACKEND_URL;

    if (!wedId || !authKey || !backendUrl) {
        return NextResponse.json({ issue: 'Server configuration error.' }, { status: 500 });
    }

    try {
        const apiResponse = await fetch(`${backendUrl}/api/wedding/lstcarouselimg`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ wedId, wedauthkey: authKey }),
        });

        const data = await apiResponse.json();

        if (!apiResponse.ok) {
            return NextResponse.json({ issue: data.issue || 'Failed to fetch from backend' }, { status: apiResponse.status });
        }

        return NextResponse.json(data);

    } catch (error) {
        console.error('List carousel proxy error:', error);
        return NextResponse.json({ issue: 'An unexpected error occurred.' }, { status: 500 });
    }
}
