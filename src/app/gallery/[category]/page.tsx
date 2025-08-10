
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
  const [categoryName, setCategoryName] = React.useState('');
  const [photos, setPhotos] = React.useState<Photo[]>([]);

  React.useEffect(() => {
    const decodedCategoryName = decodeURIComponent(params.category);
    
    const categoryExists = allPhotos.some(p => p.category === decodedCategoryName);
    const filteredPhotos = allPhotos.filter(p => p.category === decodedCategoryName);

    // This check is important. If the category slug is valid but no photos exist,
    // we still want to render the page with a "no photos" message.
    // However, if the category itself is not in our known list, we should 404.
    const knownCategories = [...new Set(allPhotos.map(p => p.category))];
    if (!knownCategories.includes(decodedCategoryName)) {
      notFound();
      return;
    }

    setCategoryName(decodedCategoryName);
    setPhotos(filteredPhotos);
  }, [params]);


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
        router.push(`/gallery/${encodeURIComponent(newPhotoData.category)}`);
    }
  };

  if (!categoryName) {
    // Render a loading state or nothing while the category is being determined.
    return null;
  }

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
