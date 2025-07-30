
import { PhotoGallery } from "@/components/photo-gallery";
import { photos } from "@/lib/mock-data";

export default function GalleryPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PhotoGallery initialPhotos={photos} />
    </div>
  );
}
