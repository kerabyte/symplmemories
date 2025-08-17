
"use client";

import * as React from 'react';
import { photos } from "@/lib/mock-data";
import type { Photo } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Camera, Home, Play } from 'lucide-react';
import Link from 'next/link';
import { useIsMobile } from '@/hooks/use-mobile';
import { UploadDialog } from '@/components/upload-dialog';
import { Slideshow } from '@/components/slideshow';
import { useRouter } from 'next/navigation';


type CategoryName = Photo['category'];

export default function GalleryPage() {
  const [allPhotos, setAllPhotos] = React.useState<Photo[]>(photos);
  const router = useRouter();
  const isMobile = useIsMobile();
  
  const handleAddPhoto = (newPhotoData: Omit<Photo, 'id' | 'timestamp' | 'comments' | 'voiceNotes'>) => {
    const newPhoto: Photo = {
      ...newPhotoData,
      id: new Date().toISOString(),
      timestamp: new Date().toISOString(),
      comments: [],
      voiceNotes: [],
    };
    setAllPhotos(prevPhotos => [newPhoto, ...prevPhotos]);
    // Navigate to the new photo's category page
    router.push(`/gallery/${encodeURIComponent(newPhotoData.category)}`);
  };

  const categories = React.useMemo(() => {
    const categoryMap = new Map<CategoryName, Photo[]>();
    allPhotos.forEach(photo => {
      if (!categoryMap.has(photo.category)) {
        categoryMap.set(photo.category, []);
      }
      categoryMap.get(photo.category)!.push(photo);
    });
    return Array.from(categoryMap.entries()).map(([name, photos]) => ({
      name,
      photos,
      thumbnail: photos[0]?.url,
    }));
  }, [allPhotos]);

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
          <Slideshow photos={allPhotos} trigger={
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
        <Slideshow photos={allPhotos} isMobile={false}/>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
       <header className="py-4 px-4 md:px-8 sticky top-0 bg-background/80 backdrop-blur-sm z-10 border-b">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl md:text-4xl font-headline text-foreground">
            Photo Gallery
          </h1>
          {renderHeaderActions()}
        </div>
      </header>

      <main className="container mx-auto p-4 md:p-8">
        <h2 className="text-xl md:text-2xl font-headline text-center mb-6 md:mb-8">Categories</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
          {categories.map(category => (
            <Link key={category.name} href={`/gallery/${encodeURIComponent(category.name)}`} passHref>
                <Card
                className="overflow-hidden cursor-pointer group transition-all duration-300 hover:shadow-xl hover:scale-105 rounded-lg border-border/50"
                >
                <CardContent className="p-0">
                    <div className="aspect-video relative">
                    <Image
                        src={category.thumbnail || 'https://placehold.co/600x400.png'}
                        alt={`Preview for ${category.name} category`}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-110"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        data-ai-hint="wedding"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                    <div className="absolute bottom-0 left-0 p-4 md:p-6">
                        <h3 className="text-white text-lg md:text-2xl font-headline drop-shadow-md">{category.name}</h3>
                        <p className="text-white/80 text-xs md:text-sm font-light drop-shadow-md">{category.photos.length} photos</p>
                    </div>
                    </div>
                </CardContent>
                </Card>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
