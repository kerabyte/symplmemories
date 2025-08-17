
'use client';

import * as React from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, ThumbsDown, ThumbsUp } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import TinderCard from 'react-tinder-card';

interface UnapprovedImage {
  imageID: string;
  imageURL: string;
  categoryId: string;
  approval: boolean;
  createdAt: string;
}

// Fallback component for when images fail to load
const ImageWithFallback = ({ src, alt, ...props }: any) => {
  const [imgSrc, setImgSrc] = React.useState(src);
  const [hasError, setHasError] = React.useState(false);

  React.useEffect(() => {
    setImgSrc(src);
    setHasError(false);
  }, [src]);

  if (hasError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground">
        <div className="text-center">
          <div className="text-4xl mb-2">🖼️</div>
          <div className="text-sm">Image failed to load</div>
          <div className="text-xs mt-1 break-all max-w-[200px]">{src}</div>
        </div>
      </div>
    );
  }

  return (
    <Image
      {...props}
      src={imgSrc}
      alt={alt}
      onError={() => {
        console.error('🚨 Image failed to load:', src);
        setHasError(true);
      }}
      onLoad={() => {
        console.log('✅ Image loaded successfully:', src);
      }}
    />
  );
};

export default function ApprovePhotosPage() {
  const { toast } = useToast();
  const [images, setImages] = React.useState<UnapprovedImage[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [lastDirection, setLastDirection] = React.useState<string | undefined>();

  // used for outOfFrame closure
  const currentIndexRef = React.useRef(currentIndex);

  const childRefs = React.useMemo(
    () =>
      Array(images.length)
        .fill(0)
        .map(() => React.createRef<any>()),
    [images.length]
  );

  const fetchUnapprovedImages = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/unapproved-photos', { method: 'POST' });
      const data = await response.json();
      if (response.ok) {
        const sortedImages = (data.images || []).sort(
          (a: UnapprovedImage, b: UnapprovedImage) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        // Debug: Log image URLs to check domains
        console.log('🖼️ Approval Images Debug:', {
          count: sortedImages.length,
          imageURLs: sortedImages.map(img => img.imageURL),
          sampleDomains: [...new Set(sortedImages.map(img => {
            try {
              return new URL(img.imageURL).hostname;
            } catch {
              return 'Invalid URL';
            }
          }))]
        });

        setImages(sortedImages);
        setCurrentIndex(sortedImages.length - 1);
        currentIndexRef.current = sortedImages.length - 1;
      } else {
        throw new Error(data.issue || 'Failed to fetch images');
      }
    } catch (error) {
      console.error('Error fetching unapproved images:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not fetch images for approval.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    fetchUnapprovedImages();
  }, [fetchUnapprovedImages]);

  const updateCurrentIndex = (val: number) => {
    setCurrentIndex(val);
    currentIndexRef.current = val;
  };

  const canSwipe = currentIndex >= 0;

  const swiped = (direction: string, image: UnapprovedImage, index: number) => {
    setLastDirection(direction);
    const approve = direction === 'right';
    handleApproval(image, approve);
    updateCurrentIndex(index - 1);
  };

  const outOfFrame = (id: number) => {
    // console.log(`${id} left the screen!`);
  };

  const swipe = async (dir: 'left' | 'right') => {
    if (canSwipe && currentIndex < images.length) {
      await childRefs[currentIndex].current.swipe(dir);
    }
  };

  const handleApproval = async (image: UnapprovedImage, approve: boolean) => {
    try {
      const response = await fetch('/api/admin/approve-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageID: image.imageID, approve, imageURL: image.imageURL }),
      });

      const data = await response.json();
      if (response.ok) {
        toast({
          title: 'Success',
          description: `Image ${data.action} successfully.`,
        });
      } else {
        throw new Error(data.issue || 'Failed to process approval');
      }
    } catch (error) {
      console.error('Error approving image:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: (error as Error).message || 'Could not process the request.',
      });
      // If API fails, you might want to add the image back to the stack
    }
  };

  return (
    <div className="h-screen bg-background text-foreground flex flex-col overflow-hidden">
      <header className="py-4 px-4 md:px-8 sticky top-0 bg-background/80 backdrop-blur-sm z-10 border-b flex-shrink-0">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Link href="/admin/dashboard" passHref>
              <Button variant="ghost" size="icon">
                <ArrowLeft />
                <span className="sr-only">Back to Dashboard</span>
              </Button>
            </Link>
            <h1 className="text-2xl md:text-4xl font-headline text-foreground">
              Approve Photos
            </h1>
          </div>
          <div className="text-sm text-muted-foreground">
            {images.length > 0 && currentIndex > -1 ? `${currentIndex + 1} / ${images.length} remaining` : '0 remaining'}
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col justify-center items-center p-4 relative min-h-0">
        {isLoading ? (
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        ) : images.length > 0 ? (
          <>
            <div className="relative w-full max-w-md mx-auto" style={{ height: '70vh', minHeight: '500px', maxHeight: '700px' }}>
              {images.map((image, index) => (
                <TinderCard
                  ref={childRefs[index]}
                  className="absolute inset-0 w-full h-full"
                  key={image.imageID}
                  onSwipe={(dir) => swiped(dir, image, index)}
                  onCardLeftScreen={() => outOfFrame(index)}
                  preventSwipe={['up', 'down']}
                >
                  <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-2xl border bg-card">
                    <div className="relative w-full h-full p-4">
                      <ImageWithFallback
                        src={image.imageURL}
                        alt={`Photo for approval - ${image.imageID}`}
                        fill
                        className="object-contain"
                        sizes="(max-width: 640px) 100vw, 448px"
                        priority={index === currentIndex}
                      />
                    </div>
                  </div>
                </TinderCard>
              ))}
            </div>

            <div className="flex gap-8 mt-8">
              <Button
                variant="outline"
                size="icon"
                className="h-16 w-16 rounded-full border-4 border-destructive text-destructive hover:bg-destructive/10"
                onClick={() => swipe('left')}
                disabled={!canSwipe}
              >
                <ThumbsDown className="h-8 w-8" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-16 w-16 rounded-full border-4 border-green-500 text-green-500 hover:bg-green-500/10"
                onClick={() => swipe('right')}
                disabled={!canSwipe}
              >
                <ThumbsUp className="h-8 w-8" />
              </Button>
            </div>
          </>
        ) : (
          <div className="text-center">
            <h2 className="text-2xl font-headline mb-2">All Done!</h2>
            <p className="text-muted-foreground">There are no more photos to approve.</p>
          </div>
        )}
      </main>
    </div>
  );
}
