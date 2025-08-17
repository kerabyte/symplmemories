
import GalleryPageClient from './page-client';
import type { Photo } from '@/lib/types';

interface Category {
  catID: string;
  catName: string;
}

interface FetchedPhoto {
  imageID: string;
  imageURL: string;
  catID: string;
  catName: string;
  createdAt: string;
  [key: string]: any;
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
    return data.categories || [];
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
}

async function getAllPhotos(): Promise<FetchedPhoto[]> {
  const wedId = process.env.WEDDING_ID;
  const authKey = process.env.AUTH_KEY;
  const backendUrl = process.env.API_BACKEND_URL;

   if (!wedId || !authKey || !backendUrl) {
    console.error('Server configuration error for getAllPhotos.');
    return [];
  }

  try {
    const res = await fetch(`${backendUrl}/api/wedding/lstallimgs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wedId, wedauthkey: authKey }),
      next: { revalidate: 300, tags: ['photos'] } // Revalidate every 5 minutes
    });

    if (!res.ok) {
       console.error('Failed to fetch photos:', res.status, await res.text());
      return [];
    }

    const data = await res.json();
    // The backend returns an object with a key like "Reception Photos"
    // We need to flatten all arrays inside this object into one
    const allPhotos = Object.values(data).flat() as FetchedPhoto[];
    return allPhotos.filter(p => p.imageURL && p.imageID);

  } catch (error) {
    console.error('Error fetching photos:', error);
    return [];
  }
}

export default async function GalleryPage() {
  const [categories, allPhotos] = await Promise.all([
    getCategories(),
    getAllPhotos()
  ]);

  // Map fetched photos to our Photo type
  const formattedPhotos: Photo[] = allPhotos.map(p => ({
    id: p.imageID,
    url: p.imageURL,
    description: p.description || '', // Add fallback
    author: p.uploadedBy || 'Guest', // Add fallback
    timestamp: p.createdAt,
    category: p.catName, // This is important
    comments: [],
    voiceNotes: [],
  }));

  // Create category objects for the UI
  const categoryData = categories.map(cat => {
    const photosInCategory = formattedPhotos.filter(p => p.category === cat.catName);
    return {
      name: cat.catName,
      photos: photosInCategory,
      thumbnail: photosInCategory[0]?.url, // Use first photo as thumbnail
    };
  }).filter(c => c.photos.length > 0); // Only show categories with photos

  return <GalleryPageClient initialCategories={categoryData} allPhotos={formattedPhotos} />;
}
