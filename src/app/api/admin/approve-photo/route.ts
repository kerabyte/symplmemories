
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'default-secret-key-that-is-long-enough');

const s3Client = new S3Client({
    region: process.env.AWS_S3_REGION!,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    }
});


async function verifyJWT(token: string) {
    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        return payload;
    } catch (error) {
        return null;
    }
}

function getKeyFromUrl(fileUrl: string) {
    try {
        const url = new URL(fileUrl);
        // The key is the path without the leading slash
        return url.pathname.substring(1);
    } catch (error) {
        console.error("Invalid URL for S3 key extraction:", fileUrl, error);
        return null;
    }
}

async function deleteFromS3(fileUrl: string) {
    const key = getKeyFromUrl(fileUrl);
    if (!key) {
        console.error('Could not determine file key from URL for S3 deletion.');
        return false;
    }

    const params = {
        Bucket: process.env.AWS_S3_BUCKET_NAME!,
        Key: key,
    };

    try {
        const command = new DeleteObjectCommand(params);
        await s3Client.send(command);
        console.log(`Successfully deleted ${key} from S3.`);
        return true;
    } catch (error) {
        console.error(`S3 Delete Error for key ${key}:`, error);
        // We don't throw here, just log the error. The DB record deletion should still proceed.
        return false;
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

    const { imageID, approve, imageURL } = await request.json();

    if (!imageID || typeof approve !== 'boolean') {
        return NextResponse.json({ issue: 'Image ID and approval status are required.' }, { status: 400 });
    }

    const wedId = process.env.WEDDING_ID;
    const authKey = process.env.AUTH_KEY;
    const backendUrl = process.env.API_BACKEND_URL;

    if (!wedId || !authKey || !backendUrl) {
        return NextResponse.json({ issue: 'Server configuration error.' }, { status: 500 });
    }

    // If rejecting the image, we also need to delete it from S3.
    if (approve === false) {
        if (!imageURL) {
             return NextResponse.json({ issue: 'Image URL is required for deletion.' }, { status: 400 });
        }
        await deleteFromS3(imageURL);
    }

    try {
        const apiResponse = await fetch(`${backendUrl}/api/wedding/apprvimg`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ wedId, wedauthkey: authKey, imageID, approve }),
        });

        const data = await apiResponse.json();

        if (!apiResponse.ok) {
            return NextResponse.json({ issue: data.issue || data.message || 'Failed to post to backend' }, { status: apiResponse.status });
        }

        return NextResponse.json(data);

    } catch (error) {
        console.error('Approve photo proxy error:', error);
        return NextResponse.json({ issue: 'An unexpected error occurred.' }, { status: 500 });
    }
}
