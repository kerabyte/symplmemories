
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

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
        const { image, fileName, path } = await request.json();

        if (!image || !fileName || !path) {
            return NextResponse.json({ issue: 'Image data, file name, and path are required.' }, { status: 400 });
        }

        const bucketName = process.env.AWS_S3_BUCKET_NAME;
        const region = process.env.AWS_S3_REGION;

        if (!bucketName || !region) {
            return NextResponse.json({ issue: 'AWS configuration is incomplete.' }, { status: 500 });
        }

        // Extract image format from data URL
        const imageFormatMatch = image.match(/^data:image\/(\w+);base64,/);
        const imageFormat = imageFormatMatch ? imageFormatMatch[1] : 'jpeg';
        const contentType = `image/${imageFormat}`;

        const buffer = Buffer.from(image.replace(/^data:image\/\w+;base64,/, ""), 'base64');

        // Debug information
        const fileSizeKB = Math.round(buffer.length / 1024);
        const base64Length = image.length;
        console.log(`📤 S3 Upload Debug:
            Format: ${imageFormat}
            Buffer Size: ${fileSizeKB}KB
            Base64 Length: ${base64Length} chars
            Original Filename: ${fileName}`);
        // Clean the filename: remove spaces and special characters, keep only alphanumeric, dots, and hyphens
        let cleanFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');

        // Update file extension to match the actual format being uploaded
        if (imageFormat === 'webp') {
            // Replace the original extension with .webp
            cleanFileName = cleanFileName.replace(/\.(jpg|jpeg|png|gif)$/i, '.webp');
            if (!cleanFileName.endsWith('.webp')) {
                cleanFileName += '.webp';
            }
        }

        const uniqueFileName = `${uuidv4()}-${cleanFileName}`;
        const s3Path = `${path}/${uniqueFileName}`;

        const params = {
            Bucket: bucketName,
            Key: s3Path,
            Body: buffer,
            ContentType: contentType,
            // Removed ACL as the bucket doesn't allow ACLs
        };

        const command = new PutObjectCommand(params);
        await s3Client.send(command);

        const fileUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${s3Path}`;

        return NextResponse.json({ url: fileUrl }, { status: 201 });

    } catch (error) {
        console.error('S3 Upload Error:', error);
        return NextResponse.json({
            issue: 'An unexpected error occurred during file upload.'
        }, { status: 500 });
    }
}
