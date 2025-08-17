
'use client';

import * as React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, ThumbsDown, ThumbsUp, XCircle, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import TinderCard from 'react-tinder-card';
import { Card } from '@/components/ui/card';

interface UnapprovedImage {
  imageID: string;
  imageURL: string;
  categoryId: string;
  approval: boolean;
  createdAt: string;
}

export default function ApprovePhotosPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [images, setImages] = React.useState<UnapprovedImage[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [lastDirection, setLastDirection] = React.useState<string | null>(null);
  const currentIndexRef = React.useRef(currentIndex);

  const childRefs = React.useMemo(
    () =>
      Array(images.length)
        .fill(0)
        .map(() => React.createRef<any>()),
    [images.length]
  );

  const updateCurrentIndex = (val: number) => {
    setCurrentIndex(val);
    currentIndexRef.current = val;
  };

  const canSwipe = currentIndex >= 0;

  const swiped = async (direction: 'left' | 'right', image: UnapprovedImage, index: number) => {
    setLastDirection(direction);
    updateCurrentIndex(index - 1);
    await handleApproval(image, direction === 'right');
  };

  const outOfFrame = (id: string, idx: number) => {
    console.log(`${id} (${idx}) left the screen!`, currentIndexRef.current);
    if (currentIndexRef.current >= idx && childRefs[idx]) {
      (childRefs[idx].current as any)?.restoreCard();
    }
  };

  const swipe = async (dir: 'left' | 'right') => {
    if (canSwipe && currentIndex < images.length) {
      await (childRefs[currentIndex].current as any)?.swipe(dir);
    }
  };

  const fetchUnapprovedImages = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/unapproved-photos', { method: 'POST' });
      const data = await response.json();
      if (response.ok) {
        // Sort images by creation date, oldest first, for review
        const sortedImages = (data.images || []).sort(
          (a: UnapprovedImage, b: UnapprovedImage) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        setImages(sortedImages);
        updateCurrentIndex(sortedImages.length - 1);
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
        // The image is removed from the stack visually, no need to refetch
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
      // If the API fails, refetch to restore the stack to the correct state
      fetchUnapprovedImages();
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
            {images.length > 0 ? `${currentIndex + 1} / ${images.length} remaining` : '0 remaining'}
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col justify-center items-center p-4 relative min-h-0">
        {isLoading ? (
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        ) : images.length > 0 ? (
          <>
            <div className="w-full h-full max-w-sm max-h-[70vh] relative">
              {images.map((image, index) => (
                <TinderCard
                  ref={childRefs[index]}
                  className="absolute inset-0"
                  key={image.imageID}
                  onSwipe={(dir) => swiped(dir as 'left' | 'right', image, index)}
                  onCardLeftScreen={() => outOfFrame(image.imageID, index)}
                  preventSwipe={['up', 'down']}
                >
                  <Card className="w-full h-full rounded-2xl overflow-hidden shadow-2xl relative">
                    <Image
                      src={image.imageURL}
                      alt="A photo for approval"
                      fill
                      className="object-contain"
                      sizes="100vw"
                    />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                       <div className="absolute top-8 left-8 -rotate-12 transform opacity-0 group-hover:opacity-100 transition-opacity tinder-card-reject">
                         <ThumbsDown className="h-24 w-24 text-destructive drop-shadow-lg" />
                       </div>
                       <div className="absolute top-8 right-8 rotate-12 transform opacity-0 group-hover:opacity-100 transition-opacity tinder-card-approve">
                         <ThumbsUp className="h-24 w-24 text-green-500 drop-shadow-lg" />
                       </div>
                     </div>
                  </Card>
                </TinderCard>
              ))}
            </div>

            <div className="flex gap-8 mt-8">
              <Button variant="outline" size="icon" className="h-16 w-16 rounded-full border-4 border-destructive text-destructive hover:bg-destructive/10" onClick={() => swipe('left')} disabled={!canSwipe}>
                <XCircle className="h-8 w-8" />
              </Button>
              <Button variant="outline" size="icon" className="h-16 w-16 rounded-full border-4 border-green-500 text-green-500 hover:bg-green-500/10" onClick={() => swipe('right')} disabled={!canSwipe}>
                <CheckCircle className="h-8 w-8" />
              </Button>
            </div>
            
            {lastDirection && (
              <h2 key={lastDirection} className="mt-4 text-xl text-muted-foreground">
                You swiped {lastDirection}
              </h2>
            )}

          </>
        ) : (
          <div className="text-center">
            <h2 className="text-2xl font-headline mb-2">All Done!</h2>
            <p className="text-muted-foreground">There are no more photos to approve.</p>
          </div>
        )}
      </main>
      <style jsx global>{`
        .tinder-card-reject, .tinder-card-approve { transition: opacity 0.3s ease; }
        .tinder-card-container .swipe-reject-indicator { opacity: 1 !important; }
        .tinder-card-container .swipe-approve-indicator { opacity: 1 !important; }
      `}</style>
    </div>
  );
}
