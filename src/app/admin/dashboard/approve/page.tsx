
'use client';

import * as React from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, ThumbsDown, ThumbsUp, XCircle, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';

interface UnapprovedImage {
  imageID: string;
  imageURL: string;
  categoryId: string;
  approval: boolean;
  createdAt: string;
}

export default function ApprovePhotosPage() {
  const { toast } = useToast();
  const [images, setImages] = React.useState<UnapprovedImage[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [currentIndex, setCurrentIndex] = React.useState(0);

  const fetchUnapprovedImages = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/unapproved-photos', { method: 'POST' });
      const data = await response.json();
      if (response.ok) {
        const sortedImages = (data.images || []).sort(
          (a: UnapprovedImage, b: UnapprovedImage) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        setImages(sortedImages);
        setCurrentIndex(0);
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
    if (isProcessing) return;
    setIsProcessing(true);

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
        // Move to the next image
        if (currentIndex < images.length - 1) {
          setCurrentIndex(currentIndex + 1);
        } else {
          // No more images, refresh the list which should show the empty state
          fetchUnapprovedImages();
        }
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
    } finally {
        setIsProcessing(false);
    }
  };

  const currentImage = images[currentIndex];

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
            {images.length > 0 && currentIndex < images.length ? `${currentIndex + 1} / ${images.length} remaining` : '0 remaining'}
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col justify-center items-center p-4 relative min-h-0">
        {isLoading ? (
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        ) : currentImage ? (
          <>
            <Card className="w-full max-w-sm h-auto aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl relative">
              <Image
                src={currentImage.imageURL}
                alt="A photo for approval"
                fill
                className="object-contain"
                sizes="(max-width: 640px) 100vw, 448px"
                priority
              />
            </Card>

            <div className="flex gap-8 mt-8">
              <Button variant="outline" size="icon" className="h-16 w-16 rounded-full border-4 border-destructive text-destructive hover:bg-destructive/10" onClick={() => handleApproval(currentImage, false)} disabled={isProcessing}>
                {isProcessing ? <Loader2 className="h-8 w-8 animate-spin" /> : <XCircle className="h-8 w-8" />}
              </Button>
              <Button variant="outline" size="icon" className="h-16 w-16 rounded-full border-4 border-green-500 text-green-500 hover:bg-green-500/10" onClick={() => handleApproval(currentImage, true)} disabled={isProcessing}>
                {isProcessing ? <Loader2 className="h-8 w-8 animate-spin" /> : <CheckCircle className="h-8 w-8" />}
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
