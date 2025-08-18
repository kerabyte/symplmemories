
import GalleryPageClient from './page-client';
import type { Photo } from '@/lib/types';
import { photos as allPhotos } from '@/lib/mock-data';

interface Category {
  catID: string;
  catName: string;
}

interface CategoryWithCount extends Category {
  imageCount: number;
}

async function getCategoriesWithCounts(): Promise<CategoryWithCount[]> {
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
    const categories = data.categories || [];

    // Fetch image counts for each category in parallel
    const categoriesWithCounts = await Promise.all(
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
            return {
              ...cat,
              imageCount: imageData.totalApproved || 0,
            };
          } else {
            return {
              ...cat,
              imageCount: 0,
            };
          }
        } catch (error) {
          console.error(`Error fetching image count for category ${cat.catID}:`, error);
          return {
            ...cat,
            imageCount: 0,
          };
        }
      })
    );

    // Fallback to mock data if no categories are returned but photos exist
    if (categoriesWithCounts.length === 0 && allPhotos.length > 0) {
      const mockCategories = [...new Set(allPhotos.map(p => p.category))];
      return mockCategories.map((catName, index) => ({
        catID: `mock-cat-${index}`,
        catName: catName,
        imageCount: allPhotos.filter(p => p.category === catName).length,
      }));
    }

    return categoriesWithCounts;
  } catch (error) {
    console.error('Error fetching categories:', error);
    // If fetching fails, create categories from mock data to ensure the page still works
    const mockCategories = [...new Set(allPhotos.map(p => p.category))];
    return mockCategories.map((catName, index) => ({
      catID: `mock-cat-${index}`,
      catName: catName,
      imageCount: allPhotos.filter(p => p.category === catName).length,
    }));
  }
}

export default async function GalleryPage() {
  const categories = await getCategoriesWithCounts();

  // Use mock photos for slideshow
  const formattedPhotos: Photo[] = allPhotos;

  // Create category objects for the UI using real image counts from backend
  const categoryData = categories.map(cat => {
    return {
      name: cat.catName,
      id: cat.catID,
      photos: [], // We don't load all photos here, just show counts
      imageCount: cat.imageCount,
      // Use placeholder for thumbnail as requested
      thumbnail: `https://placehold.co/600x400.png`,
    };
  });

  // However, if the backend returns no categories but we have mock photos,
  // let's create categories from the mock data to show something.
  if (categoryData.length === 0 && allPhotos.length > 0) {
    const mockCategoryNames = [...new Set(allPhotos.map(p => p.category))];
    const mockCategoryData = mockCategoryNames.map(name => {
      const photosInCategory = allPhotos.filter(p => p.category === name);
      return {
        name,
        id: `mock-${name.replace(/\s+/g, '-').toLowerCase()}`,
        photos: photosInCategory,
        imageCount: photosInCategory.length,
        thumbnail: photosInCategory[0]?.url || `https://placehold.co/600x400.png`
      }
    })
    return <GalleryPageClient initialCategories={mockCategoryData} allPhotos={formattedPhotos} />;
  }

  return <GalleryPageClient initialCategories={categoryData} allPhotos={formattedPhotos} />;
}
