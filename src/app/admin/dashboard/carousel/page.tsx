
"use client";

import 'react-image-crop/dist/ReactCrop.css';
import * as React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
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
import { Input } from '@/components/ui/input';
import ReactCrop, { type Crop } from 'react-image-crop';

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
  
  // States for Add/Crop dialog
  const [addDialogOpen, setAddDialogOpen] = React.useState(false);
  const [cropDialogOpen, setCropDialogOpen] = React.useState(false);
  const [imgSrc, setImgSrc] = React.useState('');
  const [crop, setCrop] = React.useState<Crop>();
  const [completedCrop, setCompletedCrop] = React.useState<Crop>();
  const imgRef = React.useRef<HTMLImageElement>(null);
  const [fileName, setFileName] = React.useState('');

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

  const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setFileName(file.name);
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImgSrc(reader.result?.toString() || '');
        setAddDialogOpen(false); // Close first dialog
        setCropDialogOpen(true); // Open crop dialog
      });
      reader.readAsDataURL(file);
    }
  };

  const getCroppedImg = (image: HTMLImageElement, crop: Crop) => {
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    canvas.width = crop.width;
    canvas.height = crop.height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('No 2d context');
    }

    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      crop.width,
      crop.height
    );

    return canvas.toDataURL('image/jpeg');
  };

  const handleAddImage = async () => {
    if (!completedCrop || !imgRef.current) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not crop image.' });
      return;
    }

    const croppedImageDataUrl = getCroppedImg(imgRef.current, completedCrop);
    setIsAdding(true);

    try {
      // 1. Upload to S3
      const uploadResponse = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: croppedImageDataUrl, fileName: fileName, path: 'carousel_images' }),
      });

      const uploadData = await uploadResponse.json();
      if (!uploadResponse.ok || !uploadData.url) {
        throw new Error(uploadData.issue || 'Failed to upload image');
      }

      const imageUrl = uploadData.url;

      // 2. Add URL to our database
      const addDbResponse = await fetch('/api/admin/carousel/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageURLs: imageUrl }),
      });
      const addDbData = await addDbResponse.json();
      if (!addDbResponse.ok || !addDbData.id) {
        // If this fails, try to delete the just-uploaded image from S3
        await fetch('/api/admin/upload/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileUrl: imageUrl }),
        });
        throw new Error(addDbData.issue || 'Failed to save image to database.');
      }
      
      toast({ title: 'Success', description: 'New image added successfully.' });
      resetCropDialog();
      fetchImages(); // Refresh the list
    } catch (error) {
      console.error('Error adding image:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: (error as Error).message || 'Could not add the new image.',
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteImage = async (image: CarouselImage) => {
    setIsDeleting(image.id);
    try {
        // 1. Delete from S3
        const s3DeleteResponse = await fetch('/api/admin/upload/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileUrl: image.imageURLs }),
        });

        if (!s3DeleteResponse.ok) {
             const errorData = await s3DeleteResponse.json();
             // Non-fatal, maybe the file was already deleted. We can still proceed.
             console.warn(`Could not delete file from S3: ${errorData.issue || 'Unknown error'}`);
        }

        // 2. Delete from our database
        const response = await fetch('/api/admin/carousel/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ carouselID: image.id }),
        });

        const data = await response.json();
        if (response.ok && data.success) {
            toast({ title: 'Success', description: 'Image deleted successfully.' });
            fetchImages(); // Refresh the list
        } else {
            throw new Error(data.issue || data.message || 'Failed to delete image from database');
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
  
  const resetCropDialog = () => {
    setCropDialogOpen(false);
    setImgSrc('');
    setCrop(undefined);
    setCompletedCrop(undefined);
    setFileName('');
    if(document.getElementById('image-upload-input')) {
      (document.getElementById('image-upload-input') as HTMLInputElement).value = "";
    }
  }

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
                <Plus className="mr-2" /> Add Image
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload New Carousel Image</DialogTitle>
                <DialogDescription>
                  Select an image file from your computer to upload.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Label htmlFor="image-upload-input">Image File</Label>
                <Input
                  id="image-upload-input"
                  type="file"
                  accept="image/*"
                  onChange={onSelectFile}
                />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

       {/* Crop Dialog */}
       <Dialog open={cropDialogOpen} onOpenChange={(isOpen) => !isOpen && resetCropDialog()}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Crop Image</DialogTitle>
            <DialogDescription>
              Crop the image to a 9:16 aspect ratio for the background.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center items-center p-4 h-[60vh]">
            {imgSrc && (
              <ReactCrop
                crop={crop}
                onChange={c => setCrop(c)}
                onComplete={c => setCompletedCrop(c)}
                aspect={9 / 16}
                className="max-h-full"
              >
                <img
                  ref={imgRef}
                  alt="Crop me"
                  src={imgSrc}
                  style={{ maxHeight: '60vh' }}
                />
              </ReactCrop>
            )}
          </div>
          <DialogFooter>
             <Button variant="outline" onClick={resetCropDialog}>Cancel</Button>
            <Button onClick={handleAddImage} disabled={isAdding}>
              {isAdding ? <Loader2 className="mr-2 animate-spin" /> : null}
              Add Image
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                                This action cannot be undone. This will permanently delete the image from the server and the carousel.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteImage(image)}>
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
