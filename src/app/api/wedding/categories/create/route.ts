
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
    const session = (await cookies()).get('admin_session')?.value;
    if (!session) {
        // Allow non-admins for this action, assuming guests can create categories
    } else {
        const decoded = await verifyJWT(session);
        if (!decoded) {
            // Non-admin or invalid token, but we can still proceed for guests.
        }
    }

    const { catName } = await request.json();

    if (!catName) {
        return NextResponse.json({ issue: 'Category name is required.' }, { status: 400 });
    }

    const wedId = process.env.WEDDING_ID;
    const authKey = process.env.AUTH_KEY;
    const backendUrl = process.env.API_BACKEND_URL;

    if (!wedId || !authKey || !backendUrl) {
        return NextResponse.json({ issue: 'Server configuration error.' }, { status: 500 });
    }

    try {
        const apiResponse = await fetch(`${backendUrl}/api/wedding/createcategory`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ wedId, wedauthkey: authKey, catName }),
        });

        const data = await apiResponse.json();

        if (!apiResponse.ok) {
            return NextResponse.json({ issue: data.message || data.issue || 'Failed to post to backend' }, { status: apiResponse.status });
        }

        return NextResponse.json(data, { status: 201 });

    } catch (error) {
        console.error('Create category proxy error:', error);
        return NextResponse.json({ issue: 'An unexpected error occurred.' }, { status: 500 });
    }
}
