
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
    const session = cookies().get('admin_session')?.value;
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

        const buffer = Buffer.from(image.replace(/^data:image\/\w+;base64,/, ""), 'base64');
        const uniqueFileName = `${uuidv4()}-${fileName}`;
        const s3Path = `${path}/${uniqueFileName}`;

        const params = {
            Bucket: process.env.AWS_S3_BUCKET_NAME!,
            Key: s3Path,
            Body: buffer,
            ContentType: 'image/jpeg',
            ACL: 'public-read' as const,
        };

        const command = new PutObjectCommand(params);
        await s3Client.send(command);
        
        const fileUrl = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_S3_REGION}.amazonaws.com/${s3Path}`;

        return NextResponse.json({ url: fileUrl }, { status: 201 });

    } catch (error) {
        console.error('S3 Upload Error:', error);
        return NextResponse.json({ issue: 'An unexpected error occurred during file upload.' }, { status: 500 });
    }
}
