"use client";

import * as React from 'react';
import type { Photo } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Camera, Play } from 'lucide-react';
import { UploadDialog } from './upload-dialog';
import { Slideshow } from './slideshow';
import { PhotoCard } from './photo-card';
import { PhotoViewModal } from './photo-view-modal';

export function PhotoGallery({ initialPhotos }: { initialPhotos: Photo[] }) {
  const [photos, setPhotos] = React.useState<Photo[]>(initialPhotos.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
  const [selectedPhoto, setSelectedPhoto] = React.useState<Photo | null>(null);

  const addPhoto = (newPhotoData: Omit<Photo, 'id' | 'timestamp' | 'comments' | 'voiceNotes'>) => {
    const newPhoto: Photo = {
      ...newPhotoData,
      id: new Date().toISOString(),
      timestamp: new Date().toISOString(),
      comments: [],
      voiceNotes: [],
    };
    setPhotos(prevPhotos => [newPhoto, ...prevPhotos]);
  };
  
  const handleUpdatePhoto = (updatedPhoto: Photo) => {
    setPhotos(currentPhotos =>
      currentPhotos.map(p => (p.id === updatedPhoto.id ? updatedPhoto : p))
    );
    if (selectedPhoto && selectedPhoto.id === updatedPhoto.id) {
        setSelectedPhoto(updatedPhoto);
    }
  };

  return (
    <>
      <header className="py-6 px-4 md:px-8 sticky top-0 bg-background/80 backdrop-blur-sm z-10 border-b">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-3xl md:text-4xl font-headline text-foreground">
            Ever After Album
          </h1>
          <div className="flex items-center gap-2 md:gap-4">
            <UploadDialog onPhotoAdd={addPhoto} />
            <Slideshow photos={photos} />
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 md:p-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {photos.map((photo) => (
            <PhotoCard
              key={photo.id}
              photo={photo}
              onClick={() => setSelectedPhoto(photo)}
            />
          ))}
        </div>
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
