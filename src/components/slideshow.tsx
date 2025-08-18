
"use client";

import * as React from 'react';
import Image from 'next/image';
import type { Photo } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from '@/components/ui/carousel';
import { Play } from 'lucide-react';
import Autoplay from "embla-carousel-autoplay"
import Fade from "embla-carousel-fade";
import { DropdownMenuItem } from './ui/dropdown-menu';

interface SlideshowProps {
  photos: Photo[];
  isMobile?: boolean;
  trigger?: React.ReactNode;
}

export function Slideshow({ photos, isMobile, trigger }: SlideshowProps) {
  const plugin = React.useRef(
    Autoplay({ delay: 5000, stopOnInteraction: true })
  )

  const Trigger = trigger ? trigger : (isMobile ? (
     <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
        <Play className="mr-2 h-4 w-4" />
        Slideshow
    </DropdownMenuItem>
  ) : (
    <Button variant="outline">
      <Play className="mr-2 h-4 w-4" />
      Slideshow
    </Button>
  ));

  if (!photos || photos.length === 0) {
      return null;
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        {Trigger}
      </DialogTrigger>
      <DialogContent className="max-w-none w-full h-full p-0 border-0 bg-black/90 flex items-center justify-center">
        <DialogTitle className="sr-only">Photo Slideshow</DialogTitle>
        <Carousel 
            opts={{ loop: true }} 
            plugins={[plugin.current, Fade()]}
            className="w-full h-full max-w-6xl max-h-[80vh]">
          <CarouselContent className="h-full">
            {photos.map((photo) => (
              <CarouselItem key={photo.id} className="h-full">
                <div className="w-full h-full relative flex flex-col items-center justify-center text-white">
                  <div className="relative w-full h-full">
                    <Image
                      src={photo.url}
                      alt={photo.description || 'Slideshow image'}
                      fill
                      className="object-contain"
                      sizes="100vw"
                      data-ai-hint="wedding couple"
                    />
                  </div>
                  {(photo.description || photo.author) && (
                    <div className="absolute bottom-8 left-0 right-0 p-4 text-center bg-black/50">
                      {photo.description && <p>{photo.description}</p>}
                      {photo.author && <p className="text-sm text-muted-foreground">by {photo.author}</p>}
                    </div>
                  )}
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </DialogContent>
    </Dialog>
  );
}
