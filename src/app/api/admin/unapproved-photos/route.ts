
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

    const wedId = process.env.WEDDING_ID;
    const authKey = process.env.AUTH_KEY;
    const backendUrl = process.env.API_BACKEND_URL;

    if (!wedId || !authKey || !backendUrl) {
        return NextResponse.json({ issue: 'Server configuration error.' }, { status: 500 });
    }

    try {
        console.log(`🔍 Fetching unapproved images from: ${backendUrl}/api/wedding/unprvdimgs`);

        const apiResponse = await fetch(`${backendUrl}/api/wedding/unprvdimgs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ wedId, wedauthkey: authKey }),
        });

        console.log(`📡 Backend response status: ${apiResponse.status}`);
        const data = await apiResponse.json();
        console.log(`📄 Backend response data:`, {
            hasImages: !!data.images,
            imageCount: data.images?.length || 0,
            sampleImageURLs: data.images?.slice(0, 3).map((img: any) => img.imageURL) || []
        });

        if (!apiResponse.ok) {
            return NextResponse.json({ issue: data.issue || data.message || 'Failed to fetch from backend' }, { status: apiResponse.status });
        }

        return NextResponse.json(data);

    } catch (error) {
        console.error('List unapproved photos proxy error:', error);
        return NextResponse.json({ issue: 'An unexpected error occurred.' }, { status: 500 });
    }
}
