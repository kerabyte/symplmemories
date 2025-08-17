
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
        return NextResponse.json({ issue: 'Unauthorized' }, { status: 401 });
    }
    const decoded = await verifyJWT(session);
    if (!decoded) {
        return NextResponse.json({ issue: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    const { imageURLs } = await request.json();

    console.log(`🔗 Carousel Add Debug:
        Received URL: ${imageURLs}
        URL Type: ${typeof imageURLs}
        URL Length: ${imageURLs?.length || 0}`);

    if (!imageURLs || typeof imageURLs !== 'string') {
        return NextResponse.json({ issue: 'Image URL is required and must be a string.' }, { status: 400 });
    }

    // Validate URL format
    try {
        new URL(imageURLs);
    } catch (urlError) {
        console.error('Invalid URL format:', imageURLs, urlError);
        return NextResponse.json({ issue: 'Invalid URL format provided.' }, { status: 400 });
    }

    const wedId = process.env.WEDDING_ID;
    const authKey = process.env.AUTH_KEY;
    const backendUrl = process.env.API_BACKEND_URL;

    if (!wedId || !authKey || !backendUrl) {
        return NextResponse.json({ issue: 'Server configuration error.' }, { status: 500 });
    }

    try {
        console.log(`🌐 Backend API Call:
            URL: ${backendUrl}/api/wedding/addcarouselimg
            Wedding ID: ${wedId}
            Image URL: ${imageURLs}
            Auth Key: [HIDDEN]`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

        const apiResponse = await fetch(`${backendUrl}/api/wedding/addcarouselimg`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ wedId, wedauthkey: authKey, imageURLs }),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        console.log(`📡 Backend Response Status: ${apiResponse.status}`);
        const data = await apiResponse.json();
        console.log(`📄 Backend Response Data:`, data);

        if (!apiResponse.ok) {
            return NextResponse.json({ issue: data.message || data.issue || 'Failed to post to backend' }, { status: apiResponse.status });
        }

        return NextResponse.json(data, { status: 201 });

    } catch (error) {
        console.error('Add carousel proxy error:', error);
        return NextResponse.json({ issue: 'An unexpected error occurred.' }, { status: 500 });
    }
}
