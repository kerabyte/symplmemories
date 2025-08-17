
"use client";

import * as React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Plus, Trash2, X } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface CarouselImage {
  id: string;
  imageURLs: string;
}

export default function ManageCarouselPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [images, setImages] = React.useState<CarouselImage[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isAdding, setIsAdding] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = React.useState(false);
  const [newImageUrls, setNewImageUrls] = React.useState('');

  const fetchImages = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/carousel/list', { method: 'POST' });
      const data = await response.json();
      if (response.ok) {
        setImages(data.carouselImages || []);
      } else {
        throw new Error(data.issue || 'Failed to fetch images');
      }
    } catch (error) {
      console.error('Error fetching images:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not fetch carousel images.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  const handleAddImages = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdding(true);
    try {
      const response = await fetch('/api/admin/carousel/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageURLs: newImageUrls }),
      });
      const data = await response.json();
      if (response.ok && data.status) {
        toast({ title: 'Success', description: 'New images added successfully.' });
        setNewImageUrls('');
        setAddDialogOpen(false);
        fetchImages(); // Refresh the list
      } else {
        throw new Error(data.issue || 'Failed to add images');
      }
    } catch (error) {
      console.error('Error adding images:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: (error as Error).message || 'Could not add new images.',
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteImage = async (carouselID: string) => {
    setIsDeleting(carouselID);
    try {
      const response = await fetch('/api/admin/carousel/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ carouselID }),
      });
      const data = await response.json();
      if (response.ok && data.status) {
        toast({ title: 'Success', description: 'Image deleted successfully.' });
        fetchImages(); // Refresh the list
      } else {
        throw new Error(data.issue || 'Failed to delete image');
      }
    } catch (error) {
      console.error('Error deleting image:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: (error as Error).message || 'Could not delete the image.',
      });
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <div className="h-screen bg-background text-foreground flex flex-col">
      <header className="py-4 px-4 md:px-8 sticky top-0 bg-background/80 backdrop-blur-sm z-10 border-b flex-shrink-0">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Link href="/admin/dashboard" passHref>
              <Button variant="ghost" size="icon">
                <ArrowLeft />
                <span className="sr-only">Back to Dashboard</span>
              </Button>
            </Link>
            <h1 className="text-2xl md:text-4xl font-headline text-foreground">
              Manage Carousel
            </h1>
          </div>
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2" /> Add Images
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleAddImages}>
                <DialogHeader>
                  <DialogTitle>Add New Carousel Images</DialogTitle>
                  <DialogDescription>
                    Enter one or more image URLs, separated by commas.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <Label htmlFor="image-urls" className="sr-only">Image URLs</Label>
                  <Textarea
                    id="image-urls"
                    value={newImageUrls}
                    onChange={(e) => setNewImageUrls(e.target.value)}
                    placeholder="https://example.com/image1.jpg, https://example.com/image2.jpg"
                    rows={5}
                    required
                    disabled={isAdding}
                  />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={isAdding}>
                    {isAdding ? <Loader2 className="mr-2 animate-spin" /> : null}
                    Add Images
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="flex-1 min-h-0">
        {isLoading ? (
          <div className="h-full flex justify-center items-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : images.length > 0 ? (
          <Carousel
            opts={{
              align: "center",
              loop: true,
            }}
            className="w-full h-full"
          >
            <CarouselContent className="h-full">
              {images.filter(image => image.imageURLs).map((image) => (
                <CarouselItem key={image.id} className="h-full group">
                  <div className="relative w-full h-full">
                    <Image
                      src={image.imageURLs}
                      alt="Carousel Image"
                      fill
                      className="object-cover"
                      sizes="100vw"
                    />
                      <div className="absolute top-4 right-4 z-20">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="destructive"
                              size="icon"
                              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                              disabled={isDeleting === image.id}
                            >
                              {isDeleting === image.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the image from the carousel.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteImage(image.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="absolute left-4 text-white bg-black/30 hover:bg-black/50 border-white/50 hover:text-white" />
            <CarouselNext className="absolute right-4 text-white bg-black/30 hover:bg-black/50 border-white/50 hover:text-white" />
          </Carousel>
        ) : (
          <div className="h-full flex flex-col justify-center items-center text-center">
            <p className="text-muted-foreground">No carousel images found. Add some to get started.</p>
          </div>
        )}
      </main>
    </div>
  );
}
