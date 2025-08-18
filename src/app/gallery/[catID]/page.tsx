
import * as React from 'react';
import type { Photo, Category } from '@/lib/types';
import { notFound } from 'next/navigation';
import { PhotoGalleryClient } from '@/components/photo-gallery-client';

async function getCategoryDetails(catID: string): Promise<Category | null> {
    const wedId = process.env.WEDDING_ID;
    const authKey = process.env.AUTH_KEY;
    const backendUrl = process.env.API_BACKEND_URL;

    if (!wedId || !authKey || !backendUrl) {
        console.error('Server configuration error for getCategories.');
        return null;
    }

    try {
        const res = await fetch(`${backendUrl}/api/wedding/getcategories`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ wedId, wedauthkey: authKey }),
            next: { revalidate: 3600, tags: ['categories'] } // Cache for an hour
        });

        if (!res.ok) {
            console.error('Failed to fetch categories list:', res.status, await res.text());
            return null;
        }

        const data = await res.json();
        const categories = data.categories as Category[] || [];
        const category = categories.find(c => c.catID === catID);

        return category || null;

    } catch (error) {
        console.error('Error fetching category details:', error);
        return null;
    }
}


async function getApprovedPhotos(catID: string): Promise<Photo[]> {
  const wedId = process.env.WEDDING_ID;
  const authKey = process.env.AUTH_KEY;
  const backendUrl = process.env.API_BACKEND_URL;

  if (!wedId || !authKey || !backendUrl) {
    console.error('Server configuration error for getApprovedPhotos.');
    return [];
  }

  try {
    const res = await fetch(`${backendUrl}/api/wedding/lstimages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wedId, wedauthkey: authKey, catID }),
      next: { revalidate: 60, tags: [`photos:${catID}`] } // Revalidate every minute
    });
    
    if (!res.ok) {
      console.error(`Failed to fetch photos for catID ${catID}:`, res.status, await res.text());
      return [];
    }
    
    const data = await res.json();
    // The backend response for list images has a different structure than our Photo type
    // We need to map the fields correctly.
    const formattedPhotos: Photo[] = (data.images || []).map((img: any) => ({
        id: img.imageID,
        url: img.imageURL,
        description: 'Uploaded by a guest', // Backend doesn't provide this, so we use a placeholder
        author: 'Guest', // Backend doesn't provide this
        timestamp: img.createdAt,
        category: catID, // We use the catID here
        comments: [], // Comments would be fetched separately
        voiceNotes: [], // Voice notes would be fetched separately
    }));

    return formattedPhotos;
  } catch (error) {
    console.error(`Error fetching photos for catID ${catID}:`, error);
    return [];
  }
}

async function getAllCategories(): Promise<Category[]> {
  const wedId = process.env.WEDDING_ID;
  const authKey = process.env.AUTH_KEY;
  const backendUrl = process.env.API_BACKEND_URL;

  if (!wedId || !authKey || !backendUrl) {
    return [];
  }

  try {
    const res = await fetch(`${backendUrl}/api/wedding/getcategories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wedId, wedauthkey: authKey }),
      next: { revalidate: 3600 } 
    });
    const data = await res.json();
    return data.categories || [];
  } catch (error) {
    return [];
  }
}


interface CategoryPageProps {
  params: {
    catID: string;
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { catID } = params;

  if (!catID) {
      notFound();
  }
  
  // Fetch photos and category details in parallel
  const [photos, category, allCategories] = await Promise.all([
      getApprovedPhotos(catID),
      getCategoryDetails(catID),
      getAllCategories()
  ]);

  if (!category) {
      // If the category ID from the URL doesn't exist in our backend, show a 404
      notFound();
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PhotoGalleryClient
        initialPhotos={photos}
        categoryName={category.catName}
        allCategories={allCategories}
      />
    </div>
  );
}

