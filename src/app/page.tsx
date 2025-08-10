
"use client";

import * as React from 'react';
import Image from 'next/image';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from '@/components/ui/carousel';
import Autoplay from "embla-carousel-autoplay";
import Fade from "embla-carousel-fade";
import ClassNames from "embla-carousel-class-names";
import { UploadDialog } from '@/components/upload-dialog';
import { Button } from '@/components/ui/button';
import { Camera, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import type { Photo } from '@/lib/types';

const backgroundImages: Pick<Photo, 'id' | 'url' | 'description'>[] = [
  { id: 'bg-1', url: 'https://tastyspoon.s3.ap-south-1.amazonaws.com/weddingtest/IMG-20250316-WA0013.jpg', description: 'Couple at sunset' },
  { id: 'bg-2', url: 'https://tastyspoon.s3.ap-south-1.amazonaws.com/weddingtest/IMG-20250316-WA0015+(1).jpg', description: 'Holding hands' },
  { id: 'bg-3', url: 'https://tastyspoon.s3.ap-south-1.amazonaws.com/weddingtest/IMG-20250316-WA0015.jpg', description: 'Wedding rings' },
  { id: 'bg-4', url: 'https://tastyspoon.s3.ap-south-1.amazonaws.com/weddingtest/IMG-20250316-WA0017.jpg', description: 'The kiss' },
];

export default function Home() {
  const autoplay = React.useRef(
    Autoplay({ delay: 15000, stopOnInteraction: false })
  );

  // This state is not used on the homepage but might be for `onPhotoAdd`.
  // It's kept for consistency with the UploadDialog component props.
  const [allPhotos, setAllPhotos] = React.useState<Photo[]>([]);

  const addPhoto = (newPhotoData: Omit<Photo, 'id' | 'timestamp' | 'comments' | 'voiceNotes'>) => {
    const newPhoto: Photo = {
      ...newPhotoData,
      id: new Date().toISOString(),
      timestamp: new Date().toISOString(),
      comments: [],
      voiceNotes: [],
    };
    // In a real app, you'd likely navigate to the gallery or show a success message.
    console.log('New photo added:', newPhoto);
    setAllPhotos(prevPhotos => [newPhoto, ...prevPhotos]);
  };

  return (
    <div className="min-h-screen w-full relative">
      <Carousel
        opts={{ loop: true }}
        plugins={[autoplay.current, Fade(), ClassNames()]}
        className="w-full h-screen absolute inset-0 z-0">
          <CarouselContent className="h-full embla__viewport">
          {backgroundImages.map((photo, index) => (
              <CarouselItem key={photo.id} className="h-full embla__fade relative">
              <div className="w-full h-full relative">
                <Image
                  src={photo.url}
                  alt={photo.description}
                  fill
                  className="object-cover"
                  sizes="100vw"
                  priority={index === 0}
                  data-ai-hint="wedding couple"
                />
                <div className="absolute inset-0 bg-black/40" />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center text-white p-4">
        
        <div className="bg-black/30 backdrop-blur-sm p-8 rounded-xl shadow-2xl">
          <h1 className="text-5xl md:text-7xl font-headline mb-4">
            Ever After Album
          </h1>
          <p className="text-lg md:text-xl max-w-2xl mx-auto mb-8 font-light">
            A shared wedding photo album for our special day. Browse the gallery or upload your own memories.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <UploadDialog onPhotoAdd={addPhoto} trigger={
              <Button size="lg" className="rounded-full shadow-lg">
                <Camera className="mr-2" />
                Upload Your Memory
              </Button>
            } />
            <Link href="/gallery" passHref>
              <Button size="lg" variant="outline" className="rounded-full shadow-lg bg-white/20 border-white text-white hover:bg-white/30">
                View Gallery <ArrowRight className="ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
