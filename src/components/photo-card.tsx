"use client";

import Image from 'next/image';
import type { Photo } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';

interface PhotoCardProps {
  photo: Photo;
  onClick: () => void;
}

export function PhotoCard({ photo, onClick }: PhotoCardProps) {
  return (
    <Card
      className="overflow-hidden cursor-pointer group transition-all duration-300 hover:shadow-xl hover:scale-105 rounded-lg border-border/50"
      onClick={onClick}
    >
      <CardContent className="p-0">
        <div className="aspect-square relative">
          <Image
            src={photo.url}
            alt={photo.description}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-110"
            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
            data-ai-hint="wedding couple"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-0 left-0 p-2 md:p-4">
            <p className="text-white text-xs md:text-sm font-light drop-shadow-md">by {photo.author}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
