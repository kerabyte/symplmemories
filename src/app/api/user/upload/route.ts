import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

const s3Client = new S3Client({
    region: process.env.AWS_S3_REGION!,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    }
});

// Helper function to compress and convert image to WebP
async function compressImageToWebP(base64Image: string): Promise<string> {
    return new Promise((resolve, reject) => {
        if (typeof window === 'undefined') {
            // Server-side fallback - return original image
            resolve(base64Image);
            return;
        }

        const img = new Image();
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                if (!ctx) {
                    reject(new Error('Could not get canvas context'));
                    return;
                }

                // Calculate optimal dimensions (max 4096px)
                const maxDimension = 4096;
                let { width, height } = img;

                if (width > maxDimension || height > maxDimension) {
                    const ratio = Math.min(maxDimension / width, maxDimension / height);
                    width = Math.round(width * ratio);
                    height = Math.round(height * ratio);
                }

                canvas.width = width;
                canvas.height = height;

                // Use high-quality scaling
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';

                // Draw image
                ctx.drawImage(img, 0, 0, width, height);

                // Convert to WebP with 92% quality
                const compressedDataUrl = canvas.toDataURL('image/webp', 0.92);
                resolve(compressedDataUrl);
            } catch (error) {
                reject(error);
            }
        };

        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = base64Image;
    });
}

export async function POST(request: Request) {
    try {
        const { images } = await request.json();

        if (!images || !Array.isArray(images) || images.length === 0) {
            return NextResponse.json({ issue: 'At least one image is required.' }, { status: 400 });
        }

        const bucketName = process.env.AWS_S3_BUCKET_NAME;
        const region = process.env.AWS_S3_REGION;

        if (!bucketName || !region) {
            return NextResponse.json({ issue: 'AWS configuration is incomplete.' }, { status: 500 });
        }

        const uploadResults = [];

        for (const imageData of images) {
            const { image, fileName } = imageData;

            if (!image || !fileName) {
                uploadResults.push({
                    fileName,
                    success: false,
                    error: 'Image data and file name are required.'
                });
                continue;
            }

            try {
                // Check file size (20MB limit)
                const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
                const sizeInBytes = (base64Data.length * 3) / 4;
                const sizeInMB = sizeInBytes / (1024 * 1024);

                if (sizeInMB > 20) {
                    uploadResults.push({
                        fileName,
                        success: false,
                        error: 'File size exceeds 20MB limit.'
                    });
                    continue;
                }

                // Server-side compression simulation (we'll handle this client-side)
                let processedImage = image;

                // Extract image format from data URL
                const imageFormatMatch = image.match(/^data:image\/(\w+);base64,/);
                const originalFormat = imageFormatMatch ? imageFormatMatch[1] : 'jpeg';

                // For server-side processing, we'll assume WebP conversion happens client-side
                // and update content type accordingly
                const isWebP = image.includes('data:image/webp');
                const contentType = isWebP ? 'image/webp' : `image/${originalFormat}`;

                const buffer = Buffer.from(processedImage.replace(/^data:image\/\w+;base64,/, ""), 'base64');

                // Debug information
                const fileSizeKB = Math.round(buffer.length / 1024);
                console.log(`📤 User Upload Debug:
                    Original Format: ${originalFormat}
                    Content Type: ${contentType}
                    Buffer Size: ${fileSizeKB}KB
                    Original Filename: ${fileName}`);

                // Clean the filename: remove spaces and special characters
                let cleanFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');

                // Update file extension for WebP
                if (isWebP) {
                    cleanFileName = cleanFileName.replace(/\.(jpg|jpeg|png|gif)$/i, '.webp');
                    if (!cleanFileName.endsWith('.webp')) {
                        cleanFileName += '.webp';
                    }
                }

                const uniqueFileName = `${uuidv4()}-${cleanFileName}`;
                const s3Path = `user_images/${uniqueFileName}`;

                const params = {
                    Bucket: bucketName,
                    Key: s3Path,
                    Body: buffer,
                    ContentType: contentType,
                };

                const command = new PutObjectCommand(params);
                await s3Client.send(command);

                const fileUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${s3Path}`;

                uploadResults.push({
                    fileName,
                    success: true,
                    url: fileUrl
                });

            } catch (error) {
                console.error(`Upload error for ${fileName}:`, error);
                uploadResults.push({
                    fileName,
                    success: false,
                    error: 'Failed to upload to S3.'
                });
            }
        }

        const successfulUploads = uploadResults.filter(result => result.success);
        const failedUploads = uploadResults.filter(result => !result.success);

        if (successfulUploads.length === 0) {
            return NextResponse.json({
                issue: 'All uploads failed.',
                results: uploadResults
            }, { status: 500 });
        }

        return NextResponse.json({
            urls: successfulUploads.map(result => result.url),
            results: uploadResults,
            totalSuccess: successfulUploads.length,
            totalFailed: failedUploads.length
        }, { status: 201 });

    } catch (error) {
        console.error('User upload error:', error);
        return NextResponse.json({
            issue: 'An unexpected error occurred during file upload.'
        }, { status: 500 });
    }
}
