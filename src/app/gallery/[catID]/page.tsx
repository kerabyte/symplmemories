
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import CategoryPageClient from './page-client';
import type { Photo } from '@/lib/types';

interface CategoryImage {
  imageID: string;
  imageURL: string;
  categoryId: string;
  approval: boolean;
  createdAt: string;
}

interface CategoryResponse {
  images: CategoryImage[];
  totalApproved: number;
  categoryId: string;
  weddingId: string;
}

async function getCategoryData(categoryId: string) {
  const wedId = process.env.WEDDING_ID;
  const authKey = process.env.AUTH_KEY;
  const backendUrl = process.env.API_BACKEND_URL;

  if (!wedId || !authKey || !backendUrl) {
    console.error('Server configuration error: Missing environment variables');
    return { images: [], categoryName: 'Unknown Category', totalApproved: 0 };
  }

  try {
    // First, get categories to find the category name
    const categoriesRes = await fetch(`${backendUrl}/api/wedding/getcategories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wedId, wedauthkey: authKey }),
      next: { revalidate: 300, tags: ['categories'] }
    });

    let categoryName = 'Unknown Category';
    if (categoriesRes.ok) {
      const categoriesData = await categoriesRes.json();
      const category = categoriesData.categories?.find((cat: any) => cat.catID === categoryId);
      if (category) {
        categoryName = category.catName;
      }
    }

    // Then get images for this category
    const imagesRes = await fetch(`${backendUrl}/api/wedding/lstimages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wedId,
        wedauthkey: authKey,
        catID: categoryId,
      }),
      next: { revalidate: 60, tags: [`category-${categoryId}`] } // Revalidate every minute
    });

    if (!imagesRes.ok) {
      if (imagesRes.status === 404) {
        // Category exists but no images
        return { images: [], categoryName, totalApproved: 0 };
      }
      console.error('Failed to fetch category images:', imagesRes.status, await imagesRes.text());
      return { images: [], categoryName, totalApproved: 0 };
    }

    const data: CategoryResponse = await imagesRes.json();

    // Transform backend images to Photo interface
    const transformedImages: Photo[] = data.images.map((img) => ({
      id: img.imageID,
      url: img.imageURL,
      author: 'Guest', // Backend doesn't provide author info yet
      description: '', // Add description field when backend supports it
      timestamp: img.createdAt,
      category: categoryName,
      comments: [],
    }));

    return {
      images: transformedImages,
      categoryName,
      totalApproved: data.totalApproved,
    };

  } catch (error) {
    console.error('Error fetching category data:', error);
    return { images: [], categoryName: 'Unknown Category', totalApproved: 0 };
  }
}

export default async function CategoryPage({
  params
}: {
  params: Promise<{ catID: string }>
}) {
  const { catID } = await params;

  // Fetch category data
  const { images, categoryName, totalApproved } = await getCategoryData(catID);

  // If category doesn't exist or is invalid UUID format, show 404
  if (!catID || (!images.length && totalApproved === 0)) {
    // Only show 404 if we're sure the category doesn't exist
    // For now, let's show the page even with no images to allow uploads
  }

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading photos...</p>
        </div>
      </div>
    }>
      <CategoryPageClient
        initialPhotos={images}
        categoryName={categoryName}
        categoryId={catID}
        totalApproved={totalApproved}
      />
    </Suspense>
  );
}
