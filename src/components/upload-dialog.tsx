
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
  onPhotoAdd: (photo: Omit<Photo, 'id' | 'timestamp' | 'comments' | 'voiceNotes'>) => void;
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
        if(response.ok) {
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
        toast({ variant: 'destructive', title: 'Error', description: 'Category name cannot be empty.'});
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

  const uploadFile = async (uploadable: UploadableFile) => {
    setFiles(prev => prev.map(f => f.id === uploadable.id ? { ...f, status: 'uploading' } : f));
    
    // Convert file to base64
    const reader = new FileReader();
    reader.readAsDataURL(uploadable.file);
    reader.onload = async () => {
        try {
            const base64Image = reader.result as string;
            
            const uploadResponse = await fetch('/api/admin/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: base64Image, fileName: uploadable.file.name, path: 'user_images' }),
            });
            const uploadData = await uploadResponse.json();

            if (!uploadResponse.ok || !uploadData.url) {
                throw new Error(uploadData.issue || 'Upload to S3 failed');
            }
            
            setFiles(prev => prev.map(f => f.id === uploadable.id ? { ...f, status: 'completed', s3Url: uploadData.url } : f));

        } catch (error) {
            console.error('Upload error:', error);
            setFiles(prev => prev.map(f => f.id === uploadable.id ? { ...f, status: 'error', error: (error as Error).message } : f));
        }
    };
    reader.onerror = (error) => {
        console.error('File read error:', error);
        setFiles(prev => prev.map(f => f.id === uploadable.id ? { ...f, status: 'error', error: 'Could not read file' } : f));
    };
  }
  
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!categoryId || files.length === 0) {
      toast({ variant: "destructive", title: "Missing Information", description: "Please select a category and at least one photo." });
      return;
    }
    
    setIsSubmitting(true);

    try {
        // Step 1: Upload all pending files to S3
        await Promise.all(files.map(f => f.status === 'pending' ? uploadFile(f) : Promise.resolve()));

        // This is a tricky part: we need to wait for the state to update.
        // A short timeout is a pragmatic way to handle this, but not ideal. A better way would be to use the resolved promises.
        // Let's create an array of promises from the upload function
        const uploadPromises = files.map(f => {
            if (f.status === 'pending') {
                 return new Promise((resolve, reject) => {
                     const reader = new FileReader();
                     reader.readAsDataURL(f.file);
                     reader.onload = async () => {
                        try {
                            const base64Image = reader.result as string;
                             const uploadResponse = await fetch('/api/admin/upload', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ image: base64Image, fileName: f.file.name, path: 'user_images' }),
                            });
                            const uploadData = await uploadResponse.json();
                            if (!uploadResponse.ok || !uploadData.url) throw new Error(uploadData.issue || 'S3 upload failed');
                            resolve({ id: f.id, s3Url: uploadData.url });
                        } catch(e) { reject({id: f.id, error: e}) }
                     }
                     reader.onerror = (e) => reject({id: f.id, error: e})
                 });
            }
            // If already uploaded, resolve with its URL
            if (f.status === 'completed') return Promise.resolve({ id: f.id, s3Url: f.s3Url });
            // If it failed before, it's a rejected promise
            if (f.status === 'error') return Promise.reject({ id: f.id, error: new Error(f.error) });
            return Promise.resolve(null);
        });

        const results = await Promise.allSettled(uploadPromises);
        
        const successfulUploads = results
            .filter(r => r.status === 'fulfilled' && r.value)
            .map(r => (r as PromiseFulfilledResult<{id: string, s3Url?: string}>).value);

        const failedUploads = results.filter(r => r.status === 'rejected');

        // Update state with final results
        setFiles(prev => prev.map(f => {
            const successful = successfulUploads.find(s => s.id === f.id);
            if (successful) return { ...f, status: 'completed', s3Url: successful.s3Url };
            const failed = failedUploads.find(fail => (fail as PromiseRejectedResult).reason.id === f.id);
            if (failed) return { ...f, status: 'error', error: 'Upload failed' };
            return f;
        }));


        if (failedUploads.length > 0) {
            toast({ variant: "destructive", title: "Upload Failed", description: `${failedUploads.length} image(s) could not be uploaded.` });
            setIsSubmitting(false);
            return;
        }

        const uploadedUrls = files.map(f => f.s3Url).filter((url): url is string => !!url);
        
        if (uploadedUrls.length === 0) {
            toast({ variant: "destructive", title: "No Images to Submit", description: "All uploads failed or no images were selected." });
            setIsSubmitting(false);
            return;
        }
        
        // Step 2: Submit URLs to our backend
        const addImagesResponse = await fetch('/api/wedding/images/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageURLs: uploadedUrls, catID: categoryId }),
        });

        if (!addImagesResponse.ok) {
            const errorData = await addImagesResponse.json();
            throw new Error(errorData.issue || 'Failed to save images to the gallery.');
        }

        toast({ title: 'Upload Complete!', description: `${uploadedUrls.length} photos added to the gallery.` });
        
        const selectedCategory = categories.find(c => c.catID === categoryId);
        if (selectedCategory) {
            // This is a bit of a hack. The onPhotoAdd is designed for one photo.
            // We just call it once to trigger a navigation or refresh.
            onPhotoAdd({ url: uploadedUrls[0], author: 'Guest', description: '', category: selectedCategory.catName });
        }

        setOpen(false);

    } catch (error) {
        toast({ variant: "destructive", title: "Submission Error", description: (error as Error).message });
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
        <DialogContent className="sm:max-w-[580px] w-full max-w-[90vw] rounded-lg flex flex-col max-h-[90vh]">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Upload Your Memories</DialogTitle>
              <DialogDescription>
                Share photos from the special day. You can add multiple photos at once.
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
                      <p className="text-xs text-muted-foreground">PNG, JPG, WEBP, etc.</p>
                    </div>
                    <Input id="photo-upload-input" type="file" accept="image/*" className="hidden" onChange={onSelectFile} multiple />
                  </Label>
              ) : (
                <ScrollArea className="h-48 pr-3">
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {files.map(f => (
                      <div key={f.id} className="relative aspect-square rounded-md overflow-hidden border group">
                        <Image src={f.preview} alt={f.file.name} fill className="object-cover" />
                         <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            {f.status === 'uploading' && <Loader2 className="h-6 w-6 animate-spin text-white" />}
                            {f.status === 'completed' && <CheckCircle className="h-6 w-6 text-green-500" />}
                            {f.status === 'error' && <AlertCircle className="h-6 w-6 text-destructive" />}
                         </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
               <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={categoryId} onValueChange={handleCategoryChange} required>
                  <SelectTrigger id="category" disabled={isFetchingCategories}>
                    <SelectValue placeholder={isFetchingCategories ? "Loading categories..." : "Select a category"} />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.catID} value={cat.catID}>{cat.catName}</SelectItem>
                    ))}
                    {categories.length > 0 && <SelectSeparator />}
                     <SelectItem value={CREATE_NEW_CATEGORY_VALUE} className="text-primary-foreground hover:text-primary-foreground focus:text-primary-foreground">
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
              <Button type="submit" disabled={isSubmitting || files.length === 0}>
                {(isSubmitting || hasPendingOrUploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
