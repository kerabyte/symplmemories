
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
    // This action can be performed by guests, so no strict JWT check is required
    const { imageURLs, catID } = await request.json();

    if (!imageURLs || !Array.isArray(imageURLs) || imageURLs.length === 0) {
        return NextResponse.json({ issue: 'An array of image URLs is required.' }, { status: 400 });
    }
    if (!catID) {
        return NextResponse.json({ issue: 'Category ID is required.' }, { status: 400 });
    }

    const wedId = process.env.WEDDING_ID;
    const authKey = process.env.AUTH_KEY;
    const backendUrl = process.env.API_BACKEND_URL;

    if (!wedId || !authKey || !backendUrl) {
        return NextResponse.json({ issue: 'Server configuration error.' }, { status: 500 });
    }

    try {
        const apiResponse = await fetch(`${backendUrl}/api/wedding/addimages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ wedId, wedauthkey: authKey, imageURLs, catID }),
        });

        const data = await apiResponse.json();

        if (!apiResponse.ok) {
            return NextResponse.json({ issue: data.message || data.issue || 'Failed to post to backend' }, { status: apiResponse.status });
        }

        return NextResponse.json(data, { status: 201 });

    } catch (error) {
        console.error('Add images proxy error:', error);
        return NextResponse.json({ issue: 'An unexpected error occurred.' }, { status: 500 });
    }
}
