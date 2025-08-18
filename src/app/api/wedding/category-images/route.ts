import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { wedId, catID } = body;

        if (!wedId || !catID) {
            return NextResponse.json(
                { error: 'Missing required fields: wedId and catID' },
                { status: 400 }
            );
        }

        const authKey = process.env.AUTH_KEY;
        const backendUrl = process.env.API_BACKEND_URL;

        if (!authKey || !backendUrl) {
            console.error('Server configuration error: Missing AUTH_KEY or API_BACKEND_URL');
            return NextResponse.json(
                { error: 'Server configuration error' },
                { status: 500 }
            );
        }

        // Fetch images from backend
        const response = await fetch(`${backendUrl}/api/wedding/lstimages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                wedId,
                wedauthkey: authKey,
                catID,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
            console.error('Backend API error:', response.status, errorData);

            if (response.status === 404) {
                return NextResponse.json(
                    { error: 'Category not found or no images in this category' },
                    { status: 404 }
                );
            }

            return NextResponse.json(
                { error: errorData.message || 'Failed to fetch images' },
                { status: response.status }
            );
        }

        const data = await response.json();

        // Transform backend response to match frontend Photo interface
        const transformedImages = (data.images || []).map((img: any) => ({
            id: img.imageID,
            url: img.imageURL,
            author: 'Guest', // Backend doesn't provide author, using default
            description: img.description || '', // Add description if available in backend
            timestamp: img.createdAt || new Date().toISOString(),
            category: '', // Will be filled by the page component
            comments: [],
            voiceNotes: [],
        }));

        return NextResponse.json({
            images: transformedImages,
            totalApproved: data.totalApproved || transformedImages.length,
            categoryId: data.categoryId,
            weddingId: data.weddingId,
        });

    } catch (error) {
        console.error('Error in category-images API:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
