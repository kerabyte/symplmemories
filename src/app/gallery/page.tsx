
import GalleryPageClient from './page-client';
import type { Photo } from '@/lib/types';
import { photos as allPhotos } from '@/lib/mock-data';

interface Category {
  catID: string;
  catName: string;
}

async function getCategories(): Promise<Category[]> {
  const wedId = process.env.WEDDING_ID;
  const authKey = process.env.AUTH_KEY;
  const backendUrl = process.env.API_BACKEND_URL;

  if (!wedId || !authKey || !backendUrl) {
    console.error('Server configuration error for getCategories.');
    return [];
  }

  try {
    const res = await fetch(`${backendUrl}/api/wedding/getcategories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wedId, wedauthkey: authKey }),
      next: { revalidate: 300, tags: ['categories'] } // Revalidate every 5 minutes
    });

    if (!res.ok) {
      console.error('Failed to fetch categories:', res.status, await res.text());
      return [];
    }

    const data = await res.json();
    // Fallback to a default category if none are returned but photos exist
    if ((!data.categories || data.categories.length === 0) && allPhotos.length > 0) {
      // Create categories from mock data if backend returns none
      const mockCategories = [...new Set(allPhotos.map(p => p.category))];
      return mockCategories.map((catName, index) => ({
        catID: `mock-cat-${index}`,
        catName: catName,
      }));
    }
    return data.categories || [];
  } catch (error) {
    console.error('Error fetching categories:', error);
    // If fetching fails, create categories from mock data to ensure the page still works
    const mockCategories = [...new Set(allPhotos.map(p => p.category))];
    return mockCategories.map((catName, index) => ({
      catID: `mock-cat-${index}`,
      catName: catName,
    }));
  }
}

export default async function GalleryPage() {
  const categories = await getCategories();

  // Use mock photos
  const formattedPhotos: Photo[] = allPhotos;

  // Create category objects for the UI
  // This will now correctly show categories from your backend,
  // but will use the mock data to populate photo counts and thumbnails.
  const categoryData = categories.map(cat => {
    const photosInCategory = formattedPhotos.filter(p => p.category === cat.catName);
    return {
      name: cat.catName,
      photos: photosInCategory,
      // Use placeholder for thumbnail as requested
      thumbnail: `https://placehold.co/600x400.png`,
    };
  });

  // Since we want to display all categories from the backend, even if they have no mock photos,
  // we will pass categoryData directly. We can handle the "0 photos" case in the UI.
  
  // However, if the backend returns no categories but we have mock photos,
  // let's create categories from the mock data to show something.
  if (categoryData.length === 0 && allPhotos.length > 0) {
      const mockCategoryNames = [...new Set(allPhotos.map(p => p.category))];
      const mockCategoryData = mockCategoryNames.map(name => {
          const photosInCategory = allPhotos.filter(p => p.category === name);
          return {
              name,
              photos: photosInCategory,
              thumbnail: photosInCategory[0]?.url || `https://placehold.co/6000x4000.png`
          }
      })
      return <GalleryPageClient initialCategories={mockCategoryData} allPhotos={formattedPhotos} />;
  }


  return <GalleryPageClient initialCategories={categoryData} allPhotos={formattedPhotos} />;
}
