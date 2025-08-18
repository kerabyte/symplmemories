
"use client";

import * as React from 'react';
import { PhotoGallery } from "@/components/photo-gallery";
import { photos as allPhotos } from "@/lib/mock-data";
import type { Photo } from '@/lib/types';
import { notFound, useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

interface CategoryPageProps {
  params: {
    category: string;
  };
}

export default function CategoryPage({ params }: CategoryPageProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [categoryName, setCategoryName] = React.useState('');
  const [photos, setPhotos] = React.useState<Photo[]>([]);
  
  // The 'params' object from Next.js is correctly passed and resolved here.
  // The warning the user saw was likely due to how it was being used in the dependency array.
  React.useEffect(() => {
    // Decode the category name from the URL slug (e.g., "Family%20Portraits" -> "Family Portraits")
    const decodedCategory = decodeURIComponent(params.category);
    setCategoryName(decodedCategory);

    // Filter the mock photos to find ones that match the current category.
    // In a real application, you would fetch this data from an API based on the category ID.
    const filteredPhotos = allPhotos.filter(p => p.category === decodedCategory);
    setPhotos(filteredPhotos);

    // This check is a good practice, but for now, we will display the page
    // with a "no photos" message if the category is valid but empty.
    const knownCategories = [...new Set(allPhotos.map(p => p.category))];
    if (!knownCategories.includes(decodedCategory)) {
        // We can choose to show a "not found" or simply an empty gallery.
        // For a better user experience, we'll show the empty gallery.
        console.warn(`Category "${decodedCategory}" not found in mock data, showing empty gallery.`);
    }

  }, [params.category]); // Dependency array should use the primitive value from params.


  const handleAddPhoto = (newPhotoData: Omit<Photo, 'id' | 'timestamp' | 'comments' | 'voiceNotes'>) => {
    // This function is for client-side updates after a user uploads a new photo.
    // It optimistically adds the new photo to the UI.
    const newPhoto: Photo = {
      ...newPhotoData,
      id: new Date().toISOString(), // Temporary ID
      timestamp: new Date().toISOString(),
      comments: [],
      voiceNotes: [],
    };

    // In a real app, you would post this to a server and then refetch or re-validate the data.
    // For now, we add to our mock data array in memory.
    allPhotos.unshift(newPhoto);

    // If the new photo belongs to the currently viewed category, add it to the state to update the UI.
    if(newPhoto.category === categoryName) {
      setPhotos(prevPhotos => [newPhoto, ...prevPhotos]);
    } else {
        // If the photo was added to a *different* category, inform the user and navigate them.
        toast({
            title: "Photo Added",
            description: `Your photo was added to the "${newPhotoData.category}" gallery.`,
        });
        router.push(`/gallery/${encodeURIComponent(newPhotoData.category)}`);
    }
  };

  // Render a loading state or nothing while the category is being determined to prevent flicker.
  if (!categoryName) {
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
