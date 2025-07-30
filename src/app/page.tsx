
"use client";

import * as React from 'react';
import Image from 'next/image';
import { photos } from "@/lib/mock-data";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import Autoplay from "embla-carousel-autoplay";
import { UploadDialog } from '@/components/upload-dialog';
import { Button } from '@/components/ui/button';
import { Camera, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import type { Photo } from '@/lib/types';

export default function Home() {
  const plugin = React.useRef(
    Autoplay({ delay: 5000, stopOnInteraction: true })
  );
  
  const [allPhotos, setAllPhotos] = React.useState<Photo[]>(photos);

  const addPhoto = (newPhotoData: Omit<Photo, 'id' | 'timestamp' | 'comments' | 'voiceNotes'>) => {
    const newPhoto: Photo = {
      ...newPhotoData,
      id: new Date().toISOString(),
      timestamp: new Date().toISOString(),
      comments: [],
      voiceNotes: [],
    };
    setAllPhotos(prevPhotos => [newPhoto, ...prevPhotos]);
  };

  return (
    <div className="min-h-screen w-full relative">
       <Carousel 
            opts={{ loop: true }} 
            plugins={[plugin.current]}
            className="w-full h-screen">
          <CarouselContent className="h-full">
            {photos.map((photo) => (
              <CarouselItem key={photo.id} className="h-full">
                <div className="w-full h-full relative">
                  <Image
                    src={photo.url}
                    alt={photo.description}
                    fill
                    className="object-cover"
                    sizes="100vw"
                    priority={photos.indexOf(photo) === 0}
                    data-ai-hint="wedding couple"
                  />
                  <div className="absolute inset-0 bg-black/40" />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white p-4">
            <div className="bg-black/30 backdrop-blur-sm p-8 rounded-xl shadow-2xl">
                <h1 className="text-5xl md:text-7xl font-headline mb-4">
                    Ever After Album
                </h1>
                <p className="text-lg md:text-xl max-w-2xl mx-auto mb-8 font-light">
                    A shared wedding photo album for our special day. Browse the gallery or upload your own memories.
                </p>
            </div>
             <div className="absolute bottom-10 flex flex-col sm:flex-row items-center gap-4">
                 <UploadDialog onPhotoAdd={addPhoto} trigger={
                     <Button size="lg" className="rounded-full shadow-lg">
                         <Camera className="mr-2"/>
                         Upload Your Memory
                     </Button>
                 } />
                 <Link href="/gallery" passHref>
                    <Button size="lg" variant="outline" className="rounded-full shadow-lg bg-white/20 border-white text-white hover:bg-white/30">
                        View Gallery <ArrowRight className="ml-2"/>
                    </Button>
                </Link>
             </div>
        </div>
    </div>
  );
}
