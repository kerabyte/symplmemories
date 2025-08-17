
"use client";

import 'react-image-crop/dist/ReactCrop.css';
import * as React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Plus, Trash2, UploadCloud } from 'lucide-react';
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
import { cn } from '@/lib/utils';

interface CarouselImage {
  id: string;
  imageURLs?: string;
  imageURL?: string;  // Alternative field name
  url?: string;       // Another alternative field name
  [key: string]: any; // Allow other fields from backend
}

// Smart image component that handles optimization timeouts for large images
const OptimizedImage = ({ src, alt, className, ...props }: any) => {
  const [useOptimized, setUseOptimized] = React.useState(true);
  const [isLoading, setIsLoading] = React.useState(true);
  const [hasError, setHasError] = React.useState(false);

  React.useEffect(() => {
    console.log('🎯 OptimizedImage received src:', src);
    // Reset states when src changes
    setIsLoading(true);
    setHasError(false);
    setUseOptimized(true);

    // Check if src is valid
    if (!src) {
      console.warn('❌ No src provided to OptimizedImage');
      setIsLoading(false);
      setHasError(true);
      return;
    }

    // Set a timeout to fallback if Next.js optimization takes too long
    const timeoutId = setTimeout(() => {
      console.warn('⏰ Next.js optimization timeout, switching to direct rendering for:', src);
      setUseOptimized(false);
    }, 5000); // 5 second timeout

    return () => clearTimeout(timeoutId);
  }, [src]); // CRITICAL FIX: Only depend on src to prevent infinite re-renders

  const handleOptimizedError = () => {
    console.warn(`🚨 Next.js optimization failed for: ${src}, switching to direct rendering`);
    setUseOptimized(false);
    setIsLoading(true); // Reset loading for fallback
    setHasError(false);
  };

  const handleLoad = () => {
    console.log(`✅ Image loaded successfully: ${src}`);
    setIsLoading(false);
    setHasError(false);
  };

  const handleDirectError = () => {
    console.error(`❌ Direct image loading failed: ${src}`);
    setIsLoading(false);
    setHasError(true);
  };

  if (!useOptimized) {
    // Fallback to direct image rendering without Next.js optimization
    return (
      <div className="relative w-full h-full">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted z-10">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        )}
        <img
          src={src}
          alt={alt}
          className={`w-full h-full ${className || ''} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
          onLoad={handleLoad}
          onError={handleDirectError}
        />
        {hasError && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground z-10">
            <div className="text-center">
              <div className="text-2xl mb-2">🖼️</div>
              <div className="text-sm">Failed to load image</div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted z-10">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      )}
      <Image
        src={src}
        alt={alt}
        fill
        className={`${className || ''} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        onError={handleOptimizedError}
        onLoad={handleLoad}
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        {...props}
      />
    </div>
  );
};

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
  const [isDragging, setIsDragging] = React.useState(false);


  const fetchImages = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/carousel/list', { method: 'POST' });
      const data = await response.json();
      console.log('🔍 Raw API Response:', data);

      if (response.ok) {
        // Try different possible field names from backend response
        const imageList = data.carouselImages || data.images || data.data || [];
        console.log('🖼️ Fetched carousel images:', {
          rawData: data,
          count: imageList.length,
          sampleImages: imageList.slice(0, 3),
          sampleURLs: imageList.slice(0, 3).map((img: any) => img.imageURLs || img.imageURL || img.url),
          validImages: imageList.filter((img: any) => img.imageURLs || img.imageURL || img.url).length,
          fieldNames: imageList.length > 0 ? Object.keys(imageList[0]) : []
        });
        setImages(imageList);
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

  const processFile = (file: File) => {
    // Check file size (5MB limit)
    const maxSizeInBytes = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSizeInBytes) {
      toast({
        variant: 'destructive',
        title: 'File Too Large',
        description: `Image file size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds the 5MB limit. Please choose a smaller image or compress it first.`,
      });
      return;
    }

    console.log(`📁 Processing file: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);

    setFileName(file.name);
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      setImgSrc(reader.result?.toString() || '');
      setAddDialogOpen(false); // Close first dialog
      setCropDialogOpen(true); // Open crop dialog
    });
    reader.readAsDataURL(file);
  }

  const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const getCroppedImg = (image: HTMLImageElement, crop: Crop) => {
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    // CRITICAL: Use the ACTUAL pixel dimensions from the original image, not the crop UI dimensions
    // This maintains the original image resolution and prevents quality loss
    let sourceWidth = crop.width * scaleX;
    let sourceHeight = crop.height * scaleY;

    // Smart resolution limiting for optimal web performance
    // Increase to 4096px for higher quality (was 2048px)
    const MAX_DIMENSION = 4096;
    const maxDimension = Math.max(sourceWidth, sourceHeight);
    const originalWidth = sourceWidth;
    const originalHeight = sourceHeight;

    if (maxDimension > MAX_DIMENSION) {
      const scaleFactor = MAX_DIMENSION / maxDimension;
      sourceWidth = Math.round(sourceWidth * scaleFactor);
      sourceHeight = Math.round(sourceHeight * scaleFactor);
      console.log(`📐 Resolution Limited: ${originalWidth}x${originalHeight} → ${sourceWidth}x${sourceHeight}`);
    } else {
      console.log(`📐 Original Resolution Maintained: ${sourceWidth}x${sourceHeight}`);
    }

    canvas.width = sourceWidth;
    canvas.height = sourceHeight;

    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('No 2d context');
    }

    // Optimize canvas rendering for quality
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(
      image,
      crop.x * scaleX,     // Source X (in original image pixels)
      crop.y * scaleY,     // Source Y (in original image pixels)
      crop.width * scaleX, // Source width (in original image pixels)
      crop.height * scaleY,// Source height (in original image pixels)
      0,                   // Destination X
      0,                   // Destination Y
      sourceWidth,         // Destination width (scaled if needed)
      sourceHeight         // Destination height (scaled if needed)
    );

    // Check WebP support by trying to create a small WebP data URL
    const testWebP = () => {
      try {
        const testCanvas = document.createElement('canvas');
        testCanvas.width = testCanvas.height = 1;
        return testCanvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
      } catch {
        return false;
      }
    };

    if (testWebP()) {
      // WebP lossless quality for maximum quality
      const dataUrl = canvas.toDataURL('image/webp', 0.90);

      // Debug information
      const fileSizeKB = Math.round((dataUrl.length * 0.75) / 1024); // Approximate file size
      console.log(`🎯 Image Processing Debug:
        Original Image: ${image.naturalWidth}x${image.naturalHeight}
        Crop Area: ${crop.width}x${crop.height} 
        Canvas Size: ${canvas.width}x${canvas.height}
        WebP Quality: 1.0 (lossless)
        Estimated File Size: ${fileSizeKB}KB
        Data URL Length: ${dataUrl.length} chars`);

      return dataUrl;
    } else {
      // Fallback to high-quality PNG for browsers that don't support WebP (rare)
      const dataUrl = canvas.toDataURL('image/png');
      const fileSizeKB = Math.round((dataUrl.length * 0.75) / 1024);
      console.log(`📷 PNG Fallback: ${canvas.width}x${canvas.height}, ~${fileSizeKB}KB`);
      return dataUrl;
    }
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
    if (document.getElementById('image-upload-input')) {
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
                  Select an image file from your device to upload.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Label
                  htmlFor="image-upload-input"
                  className={cn(
                    "flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted/75 transition-colors",
                    { "border-primary bg-primary/10": isDragging }
                  )}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <UploadCloud className="w-10 h-10 mb-3 text-muted-foreground" />
                    <p className="mb-2 text-sm text-muted-foreground">
                      <span className="font-semibold">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground">PNG, JPG, or WEBP</p>
                  </div>
                  <Input
                    id="image-upload-input"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={onSelectFile}
                  />
                </Label>
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
              {images.filter(image => {
                const imageUrl = image.imageURLs || image.imageURL || image.url;
                console.log('🔗 Filtering image:', { id: image.id, imageUrl, fullImage: image });
                return imageUrl;
              }).map((image) => {
                const imageUrl = image.imageURLs || image.imageURL || image.url;
                console.log('🖼️ Rendering image:', { id: image.id, imageUrl });
                return (
                  <CarouselItem key={image.id} className="h-full group">
                    <div className="relative w-full h-full">
                      {/* Temporarily bypass OptimizedImage for debugging */}
                      <img
                        src={imageUrl}
                        alt="Carousel Image"
                        className="w-full h-full object-cover"
                        onLoad={() => console.log('✅ Direct image loaded:', imageUrl)}
                        onError={(e) => {
                          console.error('❌ Direct image failed:', imageUrl, e);
                          e.currentTarget.style.display = 'none';
                        }}
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
                );
              })}
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
