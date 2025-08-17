
import HomePageClient from './page-client';

async function getCarouselImages() {
  const wedId = process.env.WEDDING_ID;
  const authKey = process.env.AUTH_KEY;
  const backendUrl = process.env.API_BACKEND_URL;

  if (!wedId || !authKey || !backendUrl) {
    console.error('Server configuration error: Missing environment variables.');
    return [];
  }
  
  try {
    const res = await fetch(`${backendUrl}/api/wedding/lstcarouselimg`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wedId, wedauthkey: authKey }),
      // Add revalidation to fetch fresh data periodically
      next: { revalidate: 3600 } // Revalidate every hour
    });

    if (!res.ok) {
      const errorData = await res.json();
      console.error('Failed to fetch carousel images:', errorData.message || res.statusText);
      return [];
    }

    const data = await res.json();
    return data.carouselImages || [];
  } catch (error) {
    console.error('Error fetching carousel images:', error);
    return [];
  }
}

const fallbackImages = [
  { id: 'bg-1', imageURLs: 'https://placehold.co/1920x1080.png' },
  { id: 'bg-2', imageURLs: 'https://placehold.co/1920x1080.png' },
  { id: 'bg-3', imageURLs: 'https://placehold.co/1920x1080.png' },
];

export default async function Home() {
  let images = await getCarouselImages();

  if (!images || images.length === 0) {
    console.warn("Carousel images could not be fetched or are empty, using fallback images.");
    images = fallbackImages;
  }

  return <HomePageClient backgroundImages={images} />;
}
