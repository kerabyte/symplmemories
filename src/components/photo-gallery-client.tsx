
"use client";

import * as React from 'react';
import type { Photo, Category } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Home, ArrowLeft, Play, Camera } from 'lucide-react';
import { UploadDialog } from './upload-dialog';
import { Slideshow } from './slideshow';
import { PhotoCard } from './photo-card';
import { PhotoViewModal } from './photo-view-modal';
import { useIsMobile } from '@/hooks/use-mobile';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface PhotoGalleryClientProps {
  initialPhotos: Photo[];
  categoryName: string;
  allCategories: Category[];
}

export function PhotoGalleryClient({ initialPhotos, categoryName, allCategories }: PhotoGalleryClientProps) {
  const [photos, setPhotos] = React.useState<Photo[]>(initialPhotos.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
  const [selectedPhoto, setSelectedPhoto] = React.useState<Photo | null>(null);
  const isMobile = useIsMobile();
  const router = useRouter();
  
  React.useEffect(() => {
    setPhotos(initialPhotos.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
  }, [initialPhotos]);

  const handleUpdatePhoto = (updatedPhoto: Photo) => {
    setPhotos(currentPhotos =>
      currentPhotos.map(p => (p.id === updatedPhoto.id ? updatedPhoto : p))
    );
    if (selectedPhoto && selectedPhoto.id === updatedPhoto.id) {
        setSelectedPhoto(updatedPhoto);
    }
  };

  const handleAddPhoto = (newPhotoData: Omit<Photo, 'id' | 'timestamp' | 'comments' | 'voiceNotes'> & { categoryId: string }) => {
    // This is called after a successful upload.
    // We can either optimistically add the photo or just refresh the data.
    // For simplicity and to ensure we get the latest approved photos, we'll refresh.
    router.refresh();
  };

  const renderHeaderActions = () => {
    if (isMobile) {
      return (
        <div className="flex items-center gap-1">
          <Link href="/" passHref>
            <Button variant="ghost" size="icon">
              <Home />
              <span className="sr-only">Home</span>
            </Button>
          </Link>
          <UploadDialog onPhotoAdd={handleAddPhoto} trigger={
            <Button variant="ghost" size="icon">
              <Camera />
              <span className="sr-only">Upload Photo</span>
            </Button>
          } />
          <Slideshow photos={photos} trigger={
             <Button variant="ghost" size="icon">
              <Play />
              <span className="sr-only">Slideshow</span>
            </Button>
          } />
        </div>
      )
    }

    return (
        <div className="flex items-center gap-2 md:gap-4">
            <Link href="/" passHref>
                <Button variant="outline">
                    <Home className="mr-2 h-4 w-4" />
                    Home
                </Button>
            </Link>
            <UploadDialog onPhotoAdd={handleAddPhoto} isMobile={false} />
            <Slideshow photos={photos} isMobile={false}/>
        </div>
    )
  }

  return (
    <>
      <header className="py-4 px-4 md:px-8 sticky top-0 bg-background/80 backdrop-blur-sm z-10 border-b">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
              <Link href="/gallery" passHref>
                <Button variant="ghost" size="icon" className="mr-2">
                    <ArrowLeft />
                    <span className="sr-only">Back to Categories</span>
                </Button>
              </Link>
            <h1 className="text-2xl md:text-4xl font-headline text-foreground">
              {categoryName}
            </h1>
          </div>
          {renderHeaderActions()}
        </div>
      </header>

      <main className="container mx-auto p-4 md:p-8">
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-6">
          {photos.map((photo) => (
            <PhotoCard
              key={photo.id}
              photo={photo}
              onClick={() => setSelectedPhoto(photo)}
            />
          ))}
        </div>
         {photos.length === 0 && (
          <div className="text-center col-span-full py-16">
            <p className="text-muted-foreground">No photos have been added to this category yet.</p>
          </div>
        )}
      </main>

      {selectedPhoto && (
        <PhotoViewModal
          photo={selectedPhoto}
          onClose={() => setSelectedPhoto(null)}
          onUpdatePhoto={handleUpdatePhoto}
        />
      )}
    </>
  );
}
