
import GalleryPageClient from './page-client';
import type { Photo } from '@/lib/types';

interface Category {
  catID: string;
  catName: string;
}

interface CategoryWithDetails extends Category {
  imageCount: number;
  imageURLs: string[];
}

interface BackendImage {
  imageID: string;
  imageURL: string;
  createdAt: string;
}

async function getCategoriesWithThumbnails(): Promise<{ categoriesWithDetails: CategoryWithDetails[], allPhotos: Photo[] }> {
  const wedId = process.env.WEDDING_ID;
  const authKey = process.env.AUTH_KEY;
  const backendUrl = process.env.API_BACKEND_URL;

  if (!wedId || !authKey || !backendUrl) {
    console.error('Server configuration error for getCategories.');
    return { categoriesWithDetails: [], allPhotos: [] };
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
      return { categoriesWithDetails: [], allPhotos: [] };
    }

    const data = await res.json();
    const categories: Category[] = data.categories || [];
    const allPhotos: Photo[] = [];

    // Fetch image counts and thumbnails for each category in parallel
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
            const images: BackendImage[] = imageData.images || [];
            const totalApproved = imageData.totalApproved || 0;
            
            // Add fetched images to the global allPhotos array
            images.forEach(img => {
              allPhotos.push({
                id: img.imageID,
                url: img.imageURL,
                author: 'Guest',
                description: '',
                timestamp: img.createdAt,
                category: cat.catName,
                comments: [],
              });
            });

            // Limit to a maximum of 10 images for the preview
            const imageURLs = images.slice(0, 10).map((img: any) => img.imageURL);

            return {
              id: cat.catID,
              name: cat.catName,
              imageCount: totalApproved,
              imageURLs: imageURLs,
            };
          } else {
            return {
              id: cat.catID,
              name: cat.catName,
              imageCount: 0,
              imageURLs: [],
            };
          }
        } catch (error) {
          console.error(`Error fetching image count for category ${cat.catID}:`, error);
          return {
            id: cat.catID,
            name: cat.catName,
            imageCount: 0,
            imageURLs: [],
          };
        }
      })
    );
    
    // Remap to match expected structure for client
    const formattedCategories = categoriesWithDetails.map(cat => ({
      ...cat,
      photos: [], // This is not used on the client for this page
    }));

    return { categoriesWithDetails: formattedCategories, allPhotos };
  } catch (error) {
    console.error('Error fetching categories:', error);
    return { categoriesWithDetails: [], allPhotos: [] };
  }
}

export default async function GalleryPage() {
  const { categoriesWithDetails, allPhotos } = await getCategoriesWithThumbnails();

  return <GalleryPageClient initialCategories={categoriesWithDetails} allPhotos={allPhotos} />;
}
