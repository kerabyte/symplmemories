
"use client";

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Camera, Loader2, PlusCircle, UploadCloud, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import type { Photo } from '@/lib/types';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenuItem } from './ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectSeparator } from './ui/select';
import { cn } from '@/lib/utils';
import { ScrollArea } from './ui/scroll-area';

interface Category {
  catID: string;
  catName: string;
}

interface UploadDialogProps {
  onPhotoAdd: (photo: Omit<Photo, 'id' | 'timestamp' | 'comments' | 'voiceNotes'> & { categoryId: string }) => void;
  isMobile?: boolean;
  trigger?: React.ReactNode;
}

const CREATE_NEW_CATEGORY_VALUE = 'create-new-category';

type UploadStatus = 'pending' | 'uploading' | 'completed' | 'error';

interface UploadableFile {
  id: string;
  file: File;
  preview: string;
  status: UploadStatus;
  s3Url?: string;
  error?: string;
}

export function UploadDialog({ onPhotoAdd, isMobile, trigger }: UploadDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [files, setFiles] = React.useState<UploadableFile[]>([]);
  const [categoryId, setCategoryId] = React.useState<string>('');
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [isFetchingCategories, setIsFetchingCategories] = React.useState(false);

  const [newCategoryName, setNewCategoryName] = React.useState('');
  const [isCreatingCategory, setIsCreatingCategory] = React.useState(false);
  const [showNewCategoryDialog, setShowNewCategoryDialog] = React.useState(false);
  const [isDragging, setIsDragging] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const { toast } = useToast();

  const resetState = () => {
    setFiles([]);
    setCategoryId('');
    setIsSubmitting(false);
  };

  const fetchCategories = React.useCallback(async () => {
    setIsFetchingCategories(true);
    try {
      const response = await fetch('/api/wedding/categories/list', { method: 'POST' });
      const data = await response.json();
      if (response.ok) {
        setCategories(data.categories || []);
      } else {
        throw new Error(data.issue || 'Failed to fetch categories');
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not load photo categories."
      });
    } finally {
      setIsFetchingCategories(false);
    }
  }, [toast]);

  React.useEffect(() => {
    if (open) {
      fetchCategories();
    } else {
      // Reset state when dialog is closed
      setTimeout(resetState, 300);
    }
  }, [open, fetchCategories]);


  const processFiles = (selectedFiles: FileList) => {
    const newUploads: UploadableFile[] = Array.from(selectedFiles).map(file => ({
      id: `${file.name}-${file.lastModified}`,
      file,
      preview: URL.createObjectURL(file),
      status: 'pending',
    }));
    setFiles(prev => [...prev, ...newUploads]);
  };

  const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
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
    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Category name cannot be empty.' });
      return;
    }
    setIsCreatingCategory(true);
    try {
      const response = await fetch('/api/wedding/categories/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ catName: newCategoryName }),
      });
      const data = await response.json();
      if (response.ok) {
        toast({ title: 'Success', description: 'New category created.' });
        await fetchCategories(); // Refresh list
        setCategoryId(data.id); // Select new category
        setShowNewCategoryDialog(false);
        setNewCategoryName('');
      } else {
        throw new Error(data.issue || 'Failed to create category');
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: (error as Error).message });
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const handleCategoryChange = (value: string) => {
    if (value === CREATE_NEW_CATEGORY_VALUE) {
      setShowNewCategoryDialog(true);
    } else {
      setCategoryId(value);
    }
  };

  // Helper function to detect actual file type from file content
  const detectFileType = async (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const arr = new Uint8Array(reader.result as ArrayBuffer);
        let header = '';
        for (let i = 0; i < Math.min(arr.length, 4); i++) {
          header += arr[i].toString(16).padStart(2, '0');
        }

        // Common image file signatures
        if (header.startsWith('ffd8ff')) {
          resolve('image/jpeg');
        } else if (header.startsWith('89504e47')) {
          resolve('image/png');
        } else if (header.startsWith('47494638')) {
          resolve('image/gif');
        } else if (header.startsWith('52494646')) {
          resolve('image/webp');
        } else if (header.startsWith('66747970')) {
          // Check for HEIC/HEIF
          const str = String.fromCharCode.apply(null, Array.from(arr.slice(8, 12)));
          if (str === 'heic' || str === 'heix' || str === 'heif' || str === 'mif1') {
            resolve('image/heic');
          } else {
            resolve('unknown');
          }
        } else {
          resolve('unknown');
        }
      };
      reader.readAsArrayBuffer(file.slice(0, 12));
    });
  };

  // Helper function to convert HEIC and other formats to a browser-compatible format
  const convertImageFormat = async (file: File): Promise<File> => {
    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    // Check if it's a HEIC file by extension
    if (fileExtension === 'heic' || fileExtension === 'heif') {
      // Detect actual file type to avoid false positives
      const actualType = await detectFileType(file);

      // If the file is actually a browser-readable format, skip conversion
      if (actualType !== 'image/heic' && actualType !== 'unknown') {
        console.log(`ℹ️ File ${file.name} has .heic extension but is actually ${actualType}, skipping HEIC conversion`);
        return file;
      }

      try {
        console.log(`🔄 Converting HEIC file: ${file.name}`);

        // Dynamically import heic2any to avoid SSR issues
        const { default: heic2any } = await import('heic2any');

        const convertedBlob = await heic2any({
          blob: file,
          toType: 'image/jpeg',
          quality: 0.95, // High quality for initial conversion
        });

        // heic2any can return Blob or Blob[], handle both cases
        const blob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
        const convertedFile = new File([blob], file.name.replace(/\.(heic|heif)$/i, '.jpg'), {
          type: 'image/jpeg',
          lastModified: file.lastModified,
        });

        console.log(`✅ HEIC conversion complete: ${file.name} → ${convertedFile.name}`);
        return convertedFile;
      } catch (error: any) {
        // Check if the error is because the file is already browser-readable
        if (error?.code === 1 && error?.message?.includes('already browser readable')) {
          console.log(`ℹ️ File ${file.name} with .heic extension is already browser-readable (${file.type || 'unknown type'}), skipping conversion`);
          return file; // Return original file as it's already compatible
        } else {
          console.error(`❌ HEIC conversion failed for ${file.name}:`, error);
          throw new Error(`Failed to convert HEIC file: ${file.name}. ${error?.message || ''}`);
        }
      }
    }

    // For other formats, return as-is (will be handled by the compression function)
    return file;
  };

  // Helper function to compress and convert image to WebP
  const compressImageToWebP = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      // Use native Image constructor to avoid conflicts with Next.js Image component
      const img = new (window as any).Image();

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }

          // Calculate optimal dimensions (max 4096px)
          const maxDimension = 4096;
          let { width, height } = img;

          if (width > maxDimension || height > maxDimension) {
            const ratio = Math.min(maxDimension / width, maxDimension / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          canvas.width = width;
          canvas.height = height;

          // Use high-quality scaling
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // Draw image
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to WebP with 90% quality (0.90)
          const compressedDataUrl = canvas.toDataURL('image/webp', 0.90);
          resolve(compressedDataUrl);
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => reject(new Error('Failed to load image'));

      // Convert file to data URL first
      const reader = new FileReader();
      reader.onload = () => img.src = reader.result as string;
      reader.readAsDataURL(file);
    });
  };



  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!categoryId || files.length === 0) {
      toast({ variant: "destructive", title: "Missing Information", description: "Please select a category and at least one photo." });
      return;
    }

    setIsSubmitting(true);

    try {
      // Step 1: Compress all pending files
      const compressionPromises = files.map(async (f) => {
        if (f.status === 'pending') {
          try {
            // Check file size (20MB limit)
            const fileSizeMB = f.file.size / (1024 * 1024);
            if (fileSizeMB > 20) {
              throw new Error('File size exceeds 20MB limit.');
            }

            console.log(`🖼️ Processing image: ${f.file.name}`);

            // Step 1: Convert HEIC and other formats to browser-compatible format
            const convertedFile = await convertImageFormat(f.file);

            // Step 2: Compress to WebP
            console.log(`🗜️ Compressing to WebP: ${convertedFile.name}`);
            const compressedImage = await compressImageToWebP(convertedFile);

            // Log compression results
            const originalSize = f.file.size;
            const compressedSize = Math.round((compressedImage.length * 3) / 4);
            const compressionRatio = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);

            console.log(`📦 Compression complete for ${f.file.name}:
                        Original: ${Math.round(originalSize / 1024)}KB
                        Compressed WebP (90%): ${Math.round(compressedSize / 1024)}KB  
                        Saved: ${compressionRatio}%`);

            return { id: f.id, compressedImage, fileName: f.file.name };
          } catch (error) {
            console.error(`Compression failed for ${f.file.name}:`, error);
            return { id: f.id, error: (error as Error).message };
          }
        }
        return null;
      });

      const compressionResults = await Promise.all(compressionPromises);
      const validCompressions = compressionResults.filter(r => r && !r.error);
      const failedCompressions = compressionResults.filter(r => r && r.error);

      // Update state with compression results
      setFiles(prev => prev.map(f => {
        const successful = validCompressions.find(c => c?.id === f.id);
        if (successful && 'compressedImage' in successful) {
          return { ...f, status: 'completed', s3Url: successful.compressedImage };
        }
        const failed = failedCompressions.find(c => c?.id === f.id);
        if (failed && 'error' in failed) {
          return { ...f, status: 'error', error: failed.error };
        }
        return f;
      }));

      if (failedCompressions.length > 0) {
        toast({
          variant: "destructive",
          title: "Compression Failed",
          description: `${failedCompressions.length} image(s) could not be compressed.`
        });
        setIsSubmitting(false);
        return;
      }

      // Step 2: Upload compressed images to S3
      const imagesToUpload = validCompressions.map(vc => ({
        image: vc?.compressedImage || '',
        fileName: vc?.fileName || ''
      }));

      console.log(`🚀 Uploading ${imagesToUpload.length} compressed images to S3...`);

      const uploadResponse = await fetch('/api/user/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: imagesToUpload }),
      });

      const uploadData = await uploadResponse.json();

      if (!uploadResponse.ok || !uploadData.urls || uploadData.urls.length === 0) {
        throw new Error(uploadData.issue || 'Failed to upload images to S3.');
      }

      console.log(`✅ Successfully uploaded ${uploadData.totalSuccess} images to S3`);

      if (uploadData.totalFailed > 0) {
        toast({
          variant: "destructive",
          title: "Partial Upload Failed",
          description: `${uploadData.totalFailed} image(s) could not be uploaded to S3.`
        });
      }

      // Step 3: Submit URLs to backend
      console.log(`📤 Sending ${uploadData.urls.length} image URLs to backend...`);

      const addImagesResponse = await fetch('/api/wedding/images/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageURLs: uploadData.urls, catID: categoryId }),
      });

      if (!addImagesResponse.ok) {
        const errorData = await addImagesResponse.json();
        throw new Error(errorData.issue || 'Failed to save images to the gallery.');
      }

      const backendData = await addImagesResponse.json();
      console.log(`✅ Successfully added ${backendData.totalCreated || uploadData.urls.length} images to gallery`);

      toast({
        title: 'Upload Complete!',
        description: `Image has been uploaded. Will be shown in gallery pending Approval from Admin`,
      });

      setOpen(false);

    } catch (error) {
      console.error('Upload submission error:', error);
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: (error as Error).message
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const Trigger = trigger ? trigger : (isMobile ? (
    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
      <Camera className="mr-2 h-4 w-4" />
      Upload Photo
    </DropdownMenuItem>
  ) : (
    <Button>
      <Camera className="mr-2 h-4 w-4" />
      Upload Photo
    </Button>
  ));

  const allUploadsDone = files.length > 0 && files.every(f => f.status === 'completed' || f.status === 'error');
  const hasPendingOrUploading = files.some(f => f.status === 'pending' || f.status === 'uploading');

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {Trigger}
        </DialogTrigger>
        <DialogContent
          className="sm:max-w-[580px] w-full max-w-[90vw] rounded-lg flex flex-col max-h-[90vh]"
          onInteractOutside={(e) => {
            if (isSubmitting) {
              e.preventDefault();
            }
          }}
        >
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Upload Your Memories</DialogTitle>
              <DialogDescription>
                Share photos from the special day. Supports JPG, PNG, WEBP, HEIC and more. Upload multiple photos at once (up to 20MB each).
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 min-h-0 py-4 grid gap-4">
              {files.length === 0 ? (
                <Label
                  htmlFor="photo-upload-input"
                  className={cn(
                    "flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted/75 transition-colors",
                    { "border-primary bg-primary/10": isDragging }
                  )}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <UploadCloud className="w-8 h-8 mb-2 text-muted-foreground" />
                    <p className="mb-1 text-sm text-muted-foreground">
                      <span className="font-semibold">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground">JPG, PNG, WEBP, HEIC, etc. (Max 20MB each)</p>
                  </div>
                  <Input
                    id="photo-upload-input"
                    type="file"
                    accept="image/*,.heic,.heif"
                    className="hidden"
                    onChange={onSelectFile}
                    multiple
                    disabled={isSubmitting}
                  />
                </Label>
              ) : (
                <ScrollArea className="h-48 pr-3">
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {files.map(f => (
                      <div key={f.id} className="relative aspect-square rounded-md overflow-hidden border group">
                        <Image src={f.preview} alt={f.file.name} fill className="object-cover" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          {f.status === 'pending' && <div className="text-white text-xs">Ready</div>}
                          {f.status === 'uploading' && <Loader2 className="h-6 w-6 animate-spin text-white" />}
                          {f.status === 'completed' && <CheckCircle className="h-6 w-6 text-green-500" />}
                          {f.status === 'error' && <AlertCircle className="h-6 w-6 text-destructive" />}
                        </div>
                        {/* Remove button */}
                        <Button
                          size="sm"
                          variant="destructive"
                          className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => setFiles(prev => prev.filter(file => file.id !== f.id))}
                          disabled={isSubmitting}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    {/* Add more files button */}
                    <Label
                      htmlFor="add-more-input"
                      className={cn(
                        "aspect-square rounded-md border-2 border-dashed border-muted-foreground/50 flex items-center justify-center cursor-pointer hover:border-primary hover:bg-muted/50 transition-colors",
                        isSubmitting && "cursor-not-allowed opacity-50"
                      )}
                    >
                      <PlusCircle className="h-8 w-8 text-muted-foreground" />
                      <Input
                        id="add-more-input"
                        type="file"
                        accept="image/*,.heic,.heif"
                        className="hidden"
                        onChange={onSelectFile}
                        multiple
                        disabled={isSubmitting}
                      />
                    </Label>
                  </div>
                </ScrollArea>
              )}
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={categoryId} onValueChange={handleCategoryChange} required disabled={isSubmitting}>
                  <SelectTrigger id="category" disabled={isFetchingCategories}>
                    <SelectValue placeholder={isFetchingCategories ? "Loading categories..." : "Select a category"} />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.catID} value={cat.catID}>{cat.catName}</SelectItem>
                    ))}
                    {categories.length > 0 && <SelectSeparator />}
                    <SelectItem value={CREATE_NEW_CATEGORY_VALUE} className="text-primary-foreground focus:text-primary-foreground">
                      <div className="flex items-center gap-2">
                        <PlusCircle className="h-4 w-4" />
                        Create new category...
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" disabled={isSubmitting}>Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting || files.length === 0}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? 'Submitting...' : `Upload ${files.length} Photo(s)`}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showNewCategoryDialog} onOpenChange={setShowNewCategoryDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Create New Category</AlertDialogTitle>
            <AlertDialogDescription>
              Enter a name for the new photo category.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Input
              placeholder="e.g., Dancing Floor"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setNewCategoryName('')}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleCreateCategory} disabled={isCreatingCategory}>
              {isCreatingCategory && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
