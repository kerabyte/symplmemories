
import GalleryPageClient from './page-client';
import type { Photo } from '@/lib/types';
import { photos as allPhotos } from '@/lib/mock-data';

interface Category {
  catID: string;
  catName: string;
}

interface CategoryWithDetails extends Category {
  imageCount: number;
  imageURLs: string[];
}

async function getCategoriesWithThumbnails(): Promise<CategoryWithDetails[]> {
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
    const categories: Category[] = data.categories || [];

    // Fetch image counts and a thumbnail for each category in parallel
    const categoriesWithDetails = await Promise.all(
      categories.map(async (cat: Category) => {
        try {
          const imageRes = await fetch(`${backendUrl}/api/wedding/lstimages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              wedId,
              wedauthkey: authKey,
              catID: cat.catID,
            }),
            next: { revalidate: 300, tags: [`category-${cat.catID}`] }
          });

          if (imageRes.ok) {
            const imageData = await imageRes.json();
            const images = imageData.images || [];
            const totalApproved = imageData.totalApproved || 0;
            const imageURLs = images.map((img: any) => img.imageURL);

            return {
              ...cat,
              imageCount: totalApproved,
              imageURLs: imageURLs,
            };
          } else {
            return {
              ...cat,
              imageCount: 0,
              imageURLs: [],
            };
          }
        } catch (error) {
          console.error(`Error fetching image count for category ${cat.catID}:`, error);
          return {
            ...cat,
            imageCount: 0,
            imageURLs: [],
          };
        }
      })
    );

    return categoriesWithDetails;
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
}

export default async function GalleryPage() {
  const categories = await getCategoriesWithThumbnails();

  // Use mock photos for slideshow
  const formattedPhotos: Photo[] = allPhotos;

  // Create category objects for the UI using real image counts and thumbnails from backend
  const categoryData = categories.map(cat => {
    return {
      name: cat.catName,
      id: cat.catID,
      photos: [], // We don't load all photos here, just show counts
      imageCount: cat.imageCount,
      imageURLs: cat.imageURLs,
    };
  });

  return <GalleryPageClient initialCategories={categoryData} allPhotos={formattedPhotos} />;
}
