
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    // This action can be performed by guests, so no strict JWT check is required.
    const wedId = process.env.WEDDING_ID;
    const authKey = process.env.AUTH_KEY;
    const backendUrl = process.env.API_BACKEND_URL;

    if (!wedId || !authKey || !backendUrl) {
        return NextResponse.json({ issue: 'Server configuration error.' }, { status: 500 });
    }

    try {
        const apiResponse = await fetch(`${backendUrl}/api/wedding/lstallimgs`, {
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
        console.error('List all images proxy error:', error);
        return NextResponse.json({ issue: 'An unexpected error occurred.' }, { status: 500 });
    }
}
