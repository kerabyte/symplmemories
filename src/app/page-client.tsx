
"use client";

import * as React from 'react';
import Image from 'next/image';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from '@/components/ui/carousel';
import Autoplay from "embla-carousel-autoplay";
import Fade from "embla-carousel-fade";
import ClassNames from "embla-carousel-class-names";
import { UploadDialog } from '@/components/upload-dialog';
import { Button } from '@/components/ui/button';
import { Camera, ArrowRight, Loader2 } from 'lucide-react';
import Link from 'next/link';
import type { Photo } from '@/lib/types';
import { useRouter } from 'next/navigation';


interface HomePageClientProps {
  backgroundImages: { id: string; imageURLs: string; }[];
}

// Optimized background image component with fallback for large images
const BackgroundImage = ({ src, alt, priority = false }: { src: string; alt: string; priority?: boolean }) => {
  const [useOptimized, setUseOptimized] = React.useState(true);
  const [isLoading, setIsLoading] = React.useState(true);
  const [hasError, setHasError] = React.useState(false);

  React.useEffect(() => {
    // Reset states when src changes
    setIsLoading(true);
    setHasError(false);
    setUseOptimized(true);

    if (!src) {
      setIsLoading(false);
      setHasError(true);
      return;
    }

    // Set a timeout to fallback if Next.js optimization takes too long
    const timeoutId = setTimeout(() => {
      console.warn('⏰ Background image optimization timeout, switching to direct rendering for:', src);
      setUseOptimized(false);
    }, 8000); // 8 second timeout for background images

    return () => clearTimeout(timeoutId);
  }, [src]);

  const handleOptimizedError = () => {
    console.warn(`🚨 Background image optimization failed for: ${src}, switching to direct rendering`);
    setUseOptimized(false);
    setIsLoading(true); // Reset loading for fallback
    setHasError(false);
  };

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleDirectError = () => {
    console.error(`❌ Background image loading failed: ${src}`);
    setIsLoading(false);
    setHasError(true);
  };

  if (!useOptimized) {
    // Fallback to direct image rendering without Next.js optimization
    return (
      <>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <Loader2 className="h-12 w-12 animate-spin text-white/50" />
          </div>
        )}
        <img
          src={src}
          alt={alt}
          className={`w-full h-full object-cover ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-500`}
          onLoad={handleLoad}
          onError={handleDirectError}
        />
        {hasError && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-white/60">
            <div className="text-center">
              <div className="text-4xl mb-4">🖼️</div>
              <div>Background image unavailable</div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
          <Loader2 className="h-12 w-12 animate-spin text-white/50" />
        </div>
      )}
      <Image
        src={src}
        alt={alt}
        fill
        className={`object-cover ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-500`}
        sizes="100vw"
        priority={priority}
        onError={handleOptimizedError}
        onLoad={handleLoad}
        data-ai-hint="wedding couple"
      />
    </>
  );
};

export default function HomePageClient({ backgroundImages }: HomePageClientProps) {
  const autoplay = React.useRef(
    Autoplay({ delay: 15000, stopOnInteraction: false })
  );
  const router = useRouter();

  const [allPhotos, setAllPhotos] = React.useState<Photo[]>([]);

  // Preload next few images for smoother transitions
  React.useEffect(() => {
    if (backgroundImages.length > 1) {
      // Preload the next 2-3 images
      const imagesToPreload = backgroundImages.slice(1, 4);
      imagesToPreload.forEach((img, index) => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = img.imageURLs;
        // Lower priority for non-critical preloads
        link.fetchPriority = 'low';
        document.head.appendChild(link);

        // Cleanup function to remove preload links
        setTimeout(() => {
          if (document.head.contains(link)) {
            document.head.removeChild(link);
          }
        }, 30000); // Remove after 30 seconds
      });
    }
  }, [backgroundImages]);

  const addPhoto = (newPhotoData: Omit<Photo, 'id' | 'timestamp' | 'comments' | 'voiceNotes'>) => {
     // In a real app, this would re-validate data. Here we just navigate.
    router.push(`/gallery/${encodeURIComponent(newPhotoData.category)}`);
  };

  return (
    <div className="min-h-screen w-full relative">
      <Carousel
        opts={{ loop: true }}
        plugins={[autoplay.current, Fade(), ClassNames()]}
        className="w-full h-screen absolute inset-0 z-0">
        <CarouselContent className="h-full embla__viewport">
          {backgroundImages.map((photo, index) => (
            <CarouselItem key={photo.id} className="h-full embla__fade relative">
              <div className="w-full h-full relative">
                <BackgroundImage
                  src={photo.imageURLs}
                  alt={`Wedding background image ${index + 1}`}
                  priority={index === 0 || index === 1} // Prioritize first two images
                />
                <div className="absolute inset-0 bg-black/40" />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center text-white p-4">

        <div className="bg-black/30 backdrop-blur-sm p-8 rounded-xl shadow-2xl">
          <h1 className="text-5xl md:text-7xl font-headline mb-4">
            Ever After Album
          </h1>
          <p className="text-lg md:text-xl max-w-2xl mx-auto mb-8 font-light">
            A shared wedding photo album for our special day. Browse the gallery or upload your own memories.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <UploadDialog onPhotoAdd={addPhoto} trigger={
              <Button size="lg" className="rounded-full shadow-lg">
                <Camera className="mr-2" />
                Upload Your Memory
              </Button>
            } />
            <Link href="/gallery" passHref>
              <Button size="lg" variant="outline" className="rounded-full shadow-lg bg-white/20 border-white text-white hover:bg-white/30">
                View Gallery <ArrowRight className="ml-2" />
              </Button>
            </Link>
          </div>
        </div>
         <p className="mt-8 text-sm text-white/70 font-brand font-bold">Powered by SymplMemories</p>
      </div>
    </div>
  );
}
