
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
import { Camera, Loader2, PlusCircle, UploadCloud, CheckCircle, XCircle, AlertCircle, RefreshCw, CircleDotDashed } from 'lucide-react';
import type { Photo } from '@/lib/types';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenuItem } from './ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectSeparator } from './ui/select';
import { cn } from '@/lib/utils';
import { ScrollArea } from './ui/scroll-area';
import { Alert, AlertTitle, AlertDescription } from './ui/alert';



interface Category {
  catID: string;
  catName: string;
}

interface UploadDialogProps {
  onPhotoAdd: (photo: Omit<Photo, 'id' | 'timestamp' | 'comments'> & { categoryId: string }) => void;
  isMobile?: boolean;
  trigger?: React.ReactNode;
  initialView?: 'upload' | 'camera';
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

export function UploadDialog({ onPhotoAdd, isMobile, trigger, initialView = 'upload' }: UploadDialogProps) {
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

  // Camera states
  const [view, setView] = React.useState<'upload' | 'camera'>(initialView);
  const [stream, setStream] = React.useState<MediaStream | null>(null);
  const [hasCameraPermission, setHasCameraPermission] = React.useState<boolean | null>(null);
  const [videoDevices, setVideoDevices] = React.useState<MediaDeviceInfo[]>([]);
  const [currentDeviceIndex, setCurrentDeviceIndex] = React.useState(0);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);


  const { toast } = useToast();

  const cleanupStream = React.useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  const resetState = React.useCallback(() => {
    setFiles([]);
    setCategoryId('');
    setIsSubmitting(false);
    setView(initialView);
    cleanupStream();
    setHasCameraPermission(null);
    setVideoDevices([]);
    setCurrentDeviceIndex(0);
  }, [initialView, cleanupStream]);



  const getCamera = React.useCallback(async (deviceId?: string) => {
    cleanupStream(); // Ensure previous stream is stopped

    const constraints: MediaStreamConstraints = {
      video: deviceId ? { deviceId: { exact: deviceId } } : { facingMode: "environment" }
    };

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      setHasCameraPermission(true);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

      // After getting permission, list all video devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter(d => d.kind === 'videoinput');
      setVideoDevices(videoInputs);

      // Update current device index
      const currentDeviceId = mediaStream.getVideoTracks()[0].getSettings().deviceId;
      const index = videoInputs.findIndex(d => d.deviceId === currentDeviceId);
      if (index !== -1) {
        setCurrentDeviceIndex(index);
      }

    } catch (error) {
      console.error('Error accessing camera:', error);
      setHasCameraPermission(false);
      toast({
        variant: 'destructive',
        title: 'Camera Access Denied',
        description: 'Please enable camera permissions in your browser settings to use this feature.',
      });
    }
  }, [cleanupStream, toast]);

  const handleSwitchCamera = () => {
    if (videoDevices.length > 1) {
      const nextIndex = (currentDeviceIndex + 1) % videoDevices.length;
      setCurrentDeviceIndex(nextIndex);
      getCamera(videoDevices[nextIndex].deviceId);
    }
  };

  React.useEffect(() => {
    if (open && view === 'camera' && !stream) {
      getCamera();
    }

    // Cleanup stream on dialog close or view change
    return () => {
      if (!open || view !== 'camera') {
        cleanupStream();
      }
    };
  }, [open, view, stream, getCamera, cleanupStream]);


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
      setView(initialView);
    } else {
      // Reset state when dialog is closed
      setTimeout(resetState, 300);
    }
  }, [open, fetchCategories, initialView, resetState]);


  const processFiles = (selectedFiles: FileList) => {
    const newUploads: UploadableFile[] = Array.from(selectedFiles).map(file => ({
      id: `${file.name}-${file.lastModified}`,
      file,
      preview: URL.createObjectURL(file),
      status: 'pending',
    }));
    setFiles(prev => [...prev, ...newUploads]);
    // After capturing a photo, switch to the upload view so the user can see their captured photo and proceed to upload.
    if (view === 'camera') {
      setView('upload');
    }
  };

  const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
  };

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        canvas.toBlob(blob => {
          if (blob) {
            const fileName = `capture-${new Date().toISOString()}.jpg`;
            const file = new File([blob], fileName, { type: 'image/jpeg' });
            processFiles({ 0: file, length: 1 } as unknown as FileList);
          }
        }, 'image/jpeg');
      }
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

        // Dynamically import heic-to to avoid SSR issues
        const { heicTo, isHeic } = await import('heic-to');

        // First check if the file is actually HEIC
        const isHeicFile = await isHeic(file);
        if (!isHeicFile) {
          console.log(`ℹ️ File ${file.name} has .heic extension but is not actually HEIC, skipping conversion`);
          return file;
        }

        // Convert HEIC directly to WebP to avoid double conversion
        const convertedBlob = await heicTo({
          blob: file,
          type: 'image/webp',
          quality: 0.65, // Lower quality for better compression
        });

        const convertedFile = new File([convertedBlob], file.name.replace(/\.(heic|heif)$/i, '.webp'), {
          type: 'image/webp',
          lastModified: file.lastModified,
        });

        console.log(`✅ HEIC conversion complete: ${file.name} → ${convertedFile.name}`);
        return convertedFile;
      } catch (error: any) {
        console.error(`❌ HEIC conversion failed for ${file.name}:`, error);

        // Try to handle the file as a regular image if heic-to fails
        console.log(`🔄 Attempting to process ${file.name} as regular image despite HEIC extension`);

        // Check if the file can be loaded as an image directly
        try {
          const testImg = new (window as any).Image();
          const testUrl = URL.createObjectURL(file);

          await new Promise((resolve, reject) => {
            testImg.onload = () => {
              URL.revokeObjectURL(testUrl);
              console.log(`✅ File ${file.name} can be processed as regular image despite HEIC extension`);
              resolve(true);
            };
            testImg.onerror = () => {
              URL.revokeObjectURL(testUrl);
              reject(new Error('Cannot load as image'));
            };
            testImg.src = testUrl;
          });

          // If we get here, the file can be processed as a regular image
          return file;
        } catch (imgError) {
          console.error(`❌ File ${file.name} cannot be processed as image:`, imgError);
          throw new Error(`HEIC file ${file.name} is not supported. Please convert it to JPEG, PNG, or WebP format before uploading.`);
        }
      }
    }

    // For other formats, return as-is (will be handled by the compression function)
    return file;
  };

  // Simple function to return file as-is (no compression)
  const processImageAsIs = async (file: File): Promise<string> => {
    const originalSizeKB = Math.round(file.size / 1024);
    console.log(`📤 Uploaded image: ${file.name} (${originalSizeKB}KB)`);
    console.log(`✅ Using original file without any compression`);

    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
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
      // Step 1: Compress all pending files with progress updates
      const pendingFiles = files.filter(f => f.status === 'pending');
      const totalFiles = pendingFiles.length;

      // Update all files to uploading status
      setFiles(prev => prev.map(f =>
        f.status === 'pending' ? { ...f, status: 'uploading' } : f
      ));

      const compressionPromises = pendingFiles.map(async (f, index) => {
        try {
          // Check file size (20MB limit)
          const fileSizeMB = f.file.size / (1024 * 1024);
          if (fileSizeMB > 20) {
            throw new Error('File size exceeds 20MB limit.');
          }

          console.log(`🖼️ Processing image ${index + 1}/${totalFiles}: ${f.file.name}`);

          // Step 1: Convert HEIC and other formats to browser-compatible format
          const convertedFile = await convertImageFormat(f.file);

          // Step 2: Compress to WebP with size validation
          let compressedImage: string;
          const convertedFileSizeMB = convertedFile.size / (1024 * 1024);

          // Skip files that are too large
          if (convertedFileSizeMB > 8) {
            throw new Error(`File ${convertedFile.name} is too large (${convertedFileSizeMB.toFixed(1)}MB). Please use a smaller image.`);
          }

          // Use original file without any compression
          console.log(`📁 Processing file: ${convertedFile.name} (${convertedFileSizeMB.toFixed(1)}MB)`);
          compressedImage = await processImageAsIs(convertedFile);

          // Log final results
          const originalSize = f.file.size;
          const finalSize = Math.round((compressedImage.length * 3) / 4);
          const format = compressedImage.includes('data:image/webp') ? 'WebP' : 'JPEG';

          console.log(`📤 Final image for S3: ${f.file.name} (${Math.round(finalSize / 1024)}KB, ${format})`);

          return { id: f.id, compressedImage, fileName: f.file.name };
        } catch (error) {
          console.error(`Compression failed for ${f.file.name}:`, error);
          return { id: f.id, error: (error as Error).message };
        }
      });

      const compressionResults = await Promise.all(compressionPromises);
      const validCompressions = compressionResults.filter((r: any) => r && !r.error);
      const failedCompressions = compressionResults.filter((r: any) => r && r.error);

      // Update state with compression results
      setFiles(prev => prev.map(f => {
        const successful = validCompressions.find((c: any) => c?.id === f.id);
        if (successful && 'compressedImage' in successful) {
          return { ...f, status: 'completed', s3Url: successful.compressedImage };
        }
        const failed = failedCompressions.find((c: any) => c?.id === f.id);
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

      // Step 2: Upload compressed images to S3 in chunks
      const imagesToUpload = validCompressions.map((vc: any) => ({
        image: vc?.compressedImage || '',
        fileName: vc?.fileName || ''
      }));

      console.log(`🚀 Uploading ${imagesToUpload.length} compressed images to S3 in chunks...`);

      // Upload in chunks of 1 image to avoid timeout
      const chunkSize = 1;
      const chunks = [];
      for (let i = 0; i < imagesToUpload.length; i += chunkSize) {
        chunks.push(imagesToUpload.slice(i, i + chunkSize));
      }

      const allUrls: string[] = [];
      let totalSuccess = 0;
      let totalFailed = 0;

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        console.log(`📤 Uploading chunk ${i + 1}/${chunks.length} (${chunk.length} images)...`);

        // Update progress in UI
        toast({
          title: "Uploading...",
          description: `Uploading chunk ${i + 1} of ${chunks.length} (${chunk.length} images)`,
        });

        let retryCount = 0;
        const maxRetries = 3;
        let uploadSuccess = false;

        while (retryCount < maxRetries && !uploadSuccess) {
          try {
            console.log(`📤 Attempting upload chunk ${i + 1} (attempt ${retryCount + 1}/${maxRetries})...`);

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

            const uploadResponse = await fetch('/api/user/upload', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ images: chunk }),
              signal: controller.signal,
            });

            clearTimeout(timeoutId);

            const uploadData = await uploadResponse.json();

            if (!uploadResponse.ok || !uploadData.urls || uploadData.urls.length === 0) {
              throw new Error(uploadData.issue || `Failed to upload chunk ${i + 1}.`);
            }

            allUrls.push(...uploadData.urls);
            totalSuccess += uploadData.totalSuccess || uploadData.urls.length;
            totalFailed += uploadData.totalFailed || 0;

            console.log(`✅ Chunk ${i + 1} uploaded successfully: ${uploadData.urls.length} images`);
            uploadSuccess = true;
          } catch (error) {
            retryCount++;
            console.error(`❌ Failed to upload chunk ${i + 1} (attempt ${retryCount}/${maxRetries}):`, error);

            if (retryCount >= maxRetries) {
              totalFailed += chunk.length;
              throw new Error(`Failed to upload chunk ${i + 1} after ${maxRetries} attempts: ${(error as Error).message}`);
            }

            // Wait before retry (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
          }
        }
      }

      console.log(`✅ Successfully uploaded ${totalSuccess} images to S3`);

      if (totalFailed > 0) {
        toast({
          variant: "destructive",
          title: "Partial Upload Failed",
          description: `${totalFailed} image(s) could not be uploaded to S3.`
        });
      }

      // Step 3: Submit URLs to backend
      console.log(`📤 Sending ${allUrls.length} image URLs to backend...`);

      const addImagesResponse = await fetch('/api/wedding/images/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageURLs: allUrls, catID: categoryId }),
      });

      if (!addImagesResponse.ok) {
        const errorData = await addImagesResponse.json();
        throw new Error(errorData.issue || 'Failed to save images to the gallery.');
      }

      const backendData = await addImagesResponse.json();
      console.log(`✅ Successfully added ${backendData.totalCreated || allUrls.length} images to gallery`);

      toast({
        title: 'Upload Complete!',
        description: `Image has been uploaded. Will be shown in gallery pending Approval from Admin`,
      });

      onPhotoAdd({
        url: '', // These are not used since we don't redirect
        author: '',
        description: '',
        category: '',
        categoryId: categoryId,
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


  const renderUploadView = () => (
    <>
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
    </>
  );

  const renderCameraView = () => (
    <div className="flex flex-col items-center gap-4">
      <div className="w-full relative aspect-[9/16] max-h-[40vh] bg-black rounded-lg overflow-hidden">
        <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
        <canvas ref={canvasRef} className="hidden" />

        {hasCameraPermission === null && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-black/50">
            <Loader2 className="h-8 w-8 animate-spin mb-2" />
            <p>Starting camera...</p>
          </div>
        )}
        {hasCameraPermission === false && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Alert variant="destructive" className="m-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Camera Access Denied</AlertTitle>
              <AlertDescription>
                Please allow camera access in your browser settings to use this feature.
              </AlertDescription>
            </Alert>
          </div>
        )}
      </div>
      <div className="flex items-center justify-center gap-4">
        <Button onClick={handleCapture} size="lg" className="rounded-full h-16 w-16 p-0" disabled={!hasCameraPermission || isSubmitting}>
          <CircleDotDashed className="h-10 w-10" />
          <span className="sr-only">Capture Photo</span>
        </Button>
        {videoDevices.length > 1 && (
          <Button onClick={handleSwitchCamera} variant="outline" size="icon" className="rounded-full h-12 w-12" disabled={isSubmitting}>
            <RefreshCw className="h-6 w-6" />
            <span className="sr-only">Switch Camera</span>
          </Button>
        )}
      </div>
    </div>
  );

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
          hideCloseButton={isSubmitting}
        >
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Upload Your Memories</DialogTitle>
              <DialogDescription>
                Share your memories with us
              </DialogDescription>
            </DialogHeader>

            <div className="relative p-1 bg-muted rounded-full flex items-center my-4">
              <div
                className="absolute top-1 bottom-1 left-1 w-[calc(50%-0.25rem)] bg-background rounded-full shadow-sm transition-transform duration-300 ease-in-out"
                style={{ transform: `translateX(${view === 'camera' ? '100%' : '0%'})` }}
              />
              <button
                type="button"
                onClick={() => setView('upload')}
                className={cn(
                  "flex-1 rounded-full transition-colors z-10 py-1.5 text-sm",
                  view === 'upload' ? "text-foreground" : "text-muted-foreground"
                )}
              >
                Upload
              </button>
              <button
                type="button"
                onClick={() => setView('camera')}
                className={cn(
                  "flex-1 rounded-full transition-colors z-10 py-1.5 text-sm",
                  view === 'camera' ? "text-foreground" : "text-muted-foreground"
                )}
              >
                Camera
              </button>
            </div>

            <div className="flex-1 min-h-0 py-4 grid gap-4">
              {view === 'upload' ? renderUploadView() : renderCameraView()}
            </div>

            {view === 'upload' && (
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline" disabled={isSubmitting}>Cancel</Button>
                </DialogClose>
                <Button type="submit" disabled={isSubmitting || files.length === 0 || !categoryId}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {isSubmitting ? 'Submitting...' : `Upload ${files.length} Photo(s)`}
                </Button>
              </DialogFooter>
            )}
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

