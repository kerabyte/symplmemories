
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Camera, Loader2, Sparkles, PlusCircle } from 'lucide-react';
import type { Photo } from '@/lib/types';
import { generatePhotoCaption } from '@/ai/flows/generate-photo-caption';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenuItem } from './ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectSeparator } from './ui/select';
import { cn } from '@/lib/utils';

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

export function UploadDialog({ onPhotoAdd, isMobile, trigger }: UploadDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [author, setAuthor] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [categoryId, setCategoryId] = React.useState<string>('');
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [isFetchingCategories, setIsFetchingCategories] = React.useState(false);

  const [photoFile, setPhotoFile] = React.useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = React.useState<string | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [isGenerating, setIsGenerating] = React.useState(false);
  
  const [newCategoryName, setNewCategoryName] = React.useState('');
  const [isCreatingCategory, setIsCreatingCategory] = React.useState(false);
  const [showNewCategoryDialog, setShowNewCategoryDialog] = React.useState(false);
  
  const { toast } = useToast();

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
    }
  }, [open, fetchCategories]);


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerateCaption = async () => {
    if (!photoPreview) {
      toast({
        variant: "destructive",
        title: "No Photo Selected",
        description: "Please select a photo before generating a caption.",
      });
      return;
    }
    setIsGenerating(true);
    try {
      const result = await generatePhotoCaption({
        photoDataUri: photoPreview,
        description: description || 'A wedding photo.',
      });
      if (result.caption) {
        setDescription(result.caption);
      }
    } catch (error) {
      console.error('Error generating caption:', error);
       toast({
        variant: "destructive",
        title: "Caption Generation Failed",
        description: "Could not generate a caption. Please try again.",
      });
    } finally {
      setIsGenerating(false);
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
  
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const selectedCategory = categories.find(c => c.catID === categoryId);
    if (photoPreview && author && selectedCategory) {
      setIsUploading(true);
      // Simulate upload delay
      setTimeout(() => {
        onPhotoAdd({ url: photoPreview, author, description, category: selectedCategory.catName, categoryId: selectedCategory.catID });
        setIsUploading(false);
        setOpen(false);
        // Reset form
        setAuthor('');
        setDescription('');
        setCategoryId('');
        setPhotoFile(null);
        setPhotoPreview(null);
      }, 1000);
    } else {
       toast({
        variant: "destructive",
        title: "Incomplete Form",
        description: "Please provide a photo, your name, and a category.",
      });
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

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {Trigger}
        </DialogTrigger>
        <DialogContent className="sm:max-w-[480px] w-full max-w-[90vw] rounded-lg">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Upload Your Memory</DialogTitle>
              <DialogDescription>
                Share a photo from the special day for everyone to enjoy.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="photo">Photo</Label>
                <Input id="photo" type="file" accept="image/*" onChange={handleFileChange} required />
              </div>
              {photoPreview && (
                 <div className="relative w-full aspect-video rounded-md overflow-hidden border">
                   <Image src={photoPreview} alt="Selected preview" fill className="object-contain" />
                 </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="author">Your Name</Label>
                <Input id="author" value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="e.g., Jane Doe" required />
              </div>
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
                    <SelectItem value={CREATE_NEW_CATEGORY_VALUE} className="text-primary-foreground">
                        <div className="flex items-center gap-2">
                            <PlusCircle className="h-4 w-4" />
                            Create new category...
                        </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                  <div className="flex justify-between items-center">
                      <Label htmlFor="description">Description / Caption</Label>
                      <Button type="button" variant="ghost" size="sm" onClick={handleGenerateCaption} disabled={isGenerating || !photoPreview}>
                          {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                          Smart Caption
                      </Button>
                  </div>
                <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="A lovely moment..." />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isUploading}>
                {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Upload
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
