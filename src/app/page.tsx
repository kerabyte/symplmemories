
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
    // Add timeout and retry logic for better reliability
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const res = await fetch(`${backendUrl}/api/wedding/lstcarouselimg`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'max-age=300' // Cache for 5 minutes
      },
      body: JSON.stringify({ wedId, wedauthkey: authKey }),
      signal: controller.signal,
      // Add revalidation to fetch fresh data periodically
      next: {
        revalidate: 1800, // Revalidate every 30 minutes (reduced from 1 hour)
        tags: ['carousel-images'] // Add cache tags for selective revalidation
      }
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Unknown error' }));
      console.error('Failed to fetch carousel images:', {
        status: res.status,
        statusText: res.statusText,
        error: errorData.message || 'API error'
      });
      return [];
    }

    const data = await res.json();
    const images = data.carouselImages || [];

    // Validate image URLs to prevent runtime errors
    const validImages = images.filter((img: any) => {
      const hasValidUrl = img.imageURLs && typeof img.imageURLs === 'string' && img.imageURLs.startsWith('http');
      if (!hasValidUrl) {
        console.warn('Invalid carousel image detected:', img);
      }
      return hasValidUrl;
    });

    console.log(`✅ Fetched ${validImages.length} valid carousel images`);
    return validImages;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('Carousel images fetch timeout');
    } else {
      console.error('Error fetching carousel images:', error);
    }
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
