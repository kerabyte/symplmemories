
"use client";

import * as React from 'react';
import type { Photo } from '@/lib/types';
import { PhotoCard } from '@/components/photo-card';
import { PhotoViewModal } from '@/components/photo-view-modal';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Home, Camera, Play } from 'lucide-react';
import Link from 'next/link';
import { useIsMobile } from '@/hooks/use-mobile';
import { UploadDialog } from '@/components/upload-dialog';
import { Slideshow } from '@/components/slideshow';
import { useRouter } from 'next/navigation';

interface CategoryPageClientProps {
    initialPhotos: Photo[];
    categoryName: string;
    categoryId: string;
    totalApproved: number;
}

export default function CategoryPageClient({
    initialPhotos,
    categoryName,
    categoryId,
    totalApproved
}: CategoryPageClientProps) {
    const [photos, setPhotos] = React.useState<Photo[]>(initialPhotos.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    const [selectedPhoto, setSelectedPhoto] = React.useState<Photo | null>(null);
    const isMobile = useIsMobile();
    const router = useRouter();

    React.useEffect(() => {
        setPhotos(initialPhotos.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    }, [initialPhotos]);

    const handleAddPhoto = React.useCallback((newPhotoData: Omit<Photo, 'id' | 'timestamp' | 'comments' | 'voiceNotes'> & { categoryId: string }) => {
        // Add optimistic update
        const newPhoto: Photo = {
            id: `temp-${Date.now()}`,
            timestamp: new Date().toISOString(),
            comments: [],
            voiceNotes: [],
            ...newPhotoData,
        };

        setPhotos(prev => [newPhoto, ...prev]);

        // In a real app, this would trigger a revalidation
        // For now, we'll refresh the page to get the latest data
        setTimeout(() => {
            router.refresh();
        }, 1000);
    }, [router]);

    const handleUpdatePhoto = (updatedPhoto: Photo) => {
        setPhotos(currentPhotos =>
            currentPhotos.map(p => (p.id === updatedPhoto.id ? updatedPhoto : p))
        );
        if (selectedPhoto && selectedPhoto.id === updatedPhoto.id) {
            setSelectedPhoto(updatedPhoto);
        }
    };

    const renderHeaderActions = () => {
        if (isMobile) {
            return (
                <div className="flex items-center gap-1">
                    <Link href="/gallery" passHref>
                        <Button variant="ghost" size="icon">
                            <ArrowLeft />
                            <span className="sr-only">Back to Gallery</span>
                        </Button>
                    </Link>
                    <Link href="/" passHref>
                        <Button variant="ghost" size="icon">
                            <Home />
                            <span className="sr-only">Home</span>
                        </Button>
                    </Link>
                    <UploadDialog
                        onPhotoAdd={handleAddPhoto}
                        trigger={
                            <Button variant="ghost" size="icon">
                                <Camera />
                                <span className="sr-only">Upload Photo</span>
                            </Button>
                        }
                    />
                    {photos.length > 0 && (
                        <Slideshow
                            photos={photos}
                            trigger={
                                <Button variant="ghost" size="icon">
                                    <Play />
                                    <span className="sr-only">Slideshow</span>
                                </Button>
                            }
                        />
                    )}
                </div>
            );
        }

        return (
            <div className="flex items-center gap-2 md:gap-4">
                <Link href="/gallery" passHref>
                    <Button variant="outline">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Gallery
                    </Button>
                </Link>
                <Link href="/" passHref>
                    <Button variant="outline">
                        <Home className="mr-2 h-4 w-4" />
                        Home
                    </Button>
                </Link>
                <UploadDialog onPhotoAdd={handleAddPhoto} isMobile={false} />
                {photos.length > 0 && (
                    <Slideshow photos={photos} isMobile={false} />
                )}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-background text-foreground">
            <header className="py-4 px-4 md:px-8 sticky top-0 bg-background/80 backdrop-blur-sm z-10 border-b rounded-b-xl shadow-md">
                <div className="container mx-auto flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl md:text-4xl font-headline text-foreground">
                            {categoryName}
                        </h1>
                        <p className="text-sm md:text-base text-muted-foreground mt-1">
                            {totalApproved} {totalApproved === 1 ? 'photo' : 'photos'}
                        </p>
                    </div>
                    {renderHeaderActions()}
                </div>
            </header>

            <main className="container mx-auto p-4 md:p-8">
                {photos.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-6">
                        {photos.map((photo) => (
                            <PhotoCard
                                key={photo.id}
                                photo={photo}
                                onClick={() => setSelectedPhoto(photo)}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16">
                        <div className="max-w-md mx-auto">
                            <Camera className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                            <h2 className="text-xl font-semibold mb-2">No photos in this category yet</h2>
                            <p className="text-muted-foreground mb-6">
                                Be the first to add a photo to the "{categoryName}" category!
                            </p>
                            <UploadDialog
                                onPhotoAdd={handleAddPhoto}
                                trigger={
                                    <Button size="lg">
                                        <Camera className="mr-2 h-5 w-5" />
                                        Upload First Photo
                                    </Button>
                                }
                            />
                        </div>
                    </div>
                )}
            </main>

            {selectedPhoto && (
                <PhotoViewModal
                    photo={selectedPhoto}
                    onClose={() => setSelectedPhoto(null)}
                    onUpdatePhoto={handleUpdatePhoto}
                />
            )}
        </div>
    );
}
