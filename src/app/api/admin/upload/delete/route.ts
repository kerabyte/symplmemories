
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

export async function POST(request: Request) {
    const session = (await cookies()).get('admin_session')?.value;
    if (!session) {
        return NextResponse.json({ issue: 'Unauthorized' }, { status: 401 });
    }
    const decoded = await verifyJWT(session);
    if (!decoded) {
        return NextResponse.json({ issue: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    try {
        const { fileUrl } = await request.json();

        if (!fileUrl) {
            return NextResponse.json({ issue: 'File URL is required.' }, { status: 400 });
        }

        const key = getKeyFromUrl(fileUrl);
        if (!key) {
            return NextResponse.json({ issue: 'Could not determine file key from URL.' }, { status: 400 });
        }

        const params = {
            Bucket: process.env.AWS_S3_BUCKET_NAME!,
            Key: key,
        };

        const command = new DeleteObjectCommand(params);
        await s3Client.send(command);

        return NextResponse.json({ success: true, message: 'File deleted successfully from S3' });

    } catch (error) {
        console.error('S3 Delete Error:', error);
        return NextResponse.json({ issue: 'An unexpected error occurred during file deletion.' }, { status: 500 });
    }
}
