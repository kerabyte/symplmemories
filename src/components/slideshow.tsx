"use client";

import * as React from 'react';
import Image from 'next/image';
import type { Photo } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { Play } from 'lucide-react';
import Autoplay from "embla-carousel-autoplay"

interface SlideshowProps {
  photos: Photo[];
}

export function Slideshow({ photos }: SlideshowProps) {
  const plugin = React.useRef(
    Autoplay({ delay: 4000, stopOnInteraction: true })
  )

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Play className="mr-2 h-4 w-4" />
          Slideshow
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-none w-full h-full p-0 border-0 bg-black/90 flex items-center justify-center">
        <Carousel 
            opts={{ loop: true }} 
            plugins={[plugin.current]}
            onMouseEnter={plugin.current.stop}
            onMouseLeave={plugin.current.reset}
            className="w-full h-full max-w-6xl max-h-[80vh]">
          <CarouselContent className="h-full">
            {photos.map((photo) => (
              <CarouselItem key={photo.id} className="h-full">
                <div className="w-full h-full relative flex flex-col items-center justify-center text-white">
                  <div className="relative w-full h-full">
                    <Image
                      src={photo.url}
                      alt={photo.description}
                      fill
                      className="object-contain"
                      sizes="100vw"
                      data-ai-hint="wedding couple"
                    />
                  </div>
                  <div className="absolute bottom-8 left-0 right-0 p-4 text-center bg-black/50">
                    <p>{photo.description}</p>
                    <p className="text-sm text-muted-foreground">by {photo.author}</p>
                  </div>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="absolute left-4 text-white bg-black/30 hover:bg-black/50 border-white/50 hover:text-white" />
          <CarouselNext className="absolute right-4 text-white bg-black/30 hover:bg-black/50 border-white/50 hover:text-white" />
        </Carousel>
      </DialogContent>
    </Dialog>
  );
}
