
"use client";

import * as React from 'react';
import { PhotoGallery } from "@/components/photo-gallery";
import { photos as allPhotos } from "@/lib/mock-data";
import type { Photo } from '@/lib/types';
import { notFound, useRouter } from 'next/navigation';

interface CategoryPageProps {
  params: {
    category: string;
  };
}

export default function CategoryPage({ params }: CategoryPageProps) {
  const router = useRouter();
  const categoryName = decodeURIComponent(params.category);

  const [photos, setPhotos] = React.useState<Photo[]>([]);

  React.useEffect(() => {
    const filteredPhotos = allPhotos.filter(p => p.category === categoryName);
    
    if (filteredPhotos.length === 0) {
      // Check if the category is valid at all. If not, show a 404 page.
      const isValidCategory = allPhotos.some(p => p.category === categoryName);
      if (!isValidCategory) {
        notFound();
      }
    }
    
    setPhotos(filteredPhotos);
  }, [categoryName]);


  const handleAddPhoto = (newPhotoData: Omit<Photo, 'id' | 'timestamp' | 'comments' | 'voiceNotes'>) => {
    const newPhoto: Photo = {
      ...newPhotoData,
      id: new Date().toISOString(),
      timestamp: new Date().toISOString(),
      comments: [],
      voiceNotes: [],
    };

    // In a real app, you would post this to a server and then refetch.
    // For this mock version, we'll just add it to the global mock data and local state.
    allPhotos.unshift(newPhoto);
    if(newPhoto.category === categoryName) {
      setPhotos(prevPhotos => [newPhoto, ...prevPhotos]);
    } else {
        // If the photo was added to a different category, navigate to that category's page
        router.push(`/gallery/${newPhotoData.category}`);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PhotoGallery
        initialPhotos={photos}
        categoryName={categoryName}
        onPhotoAdd={handleAddPhoto}
      />
    </div>
  );
}
