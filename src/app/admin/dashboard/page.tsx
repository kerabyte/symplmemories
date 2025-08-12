import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Home, Images, CheckSquare } from 'lucide-react';

export default function AdminDashboardPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="py-4 px-4 md:px-8 sticky top-0 bg-background/80 backdrop-blur-sm z-10 border-b">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl md:text-4xl font-headline text-foreground">
            Admin Dashboard
          </h1>
           <Link href="/" passHref>
              <Button variant="outline">
                <Home className="mr-2 h-4 w-4" />
                Back to Site
              </Button>
            </Link>
        </div>
      </header>
       <main className="container mx-auto p-4 md:p-8">
         <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Images className="h-6 w-6" />
                  Manage Homepage Carousel
                </CardTitle>
                <CardDescription>Select and reorder the images that appear on the main page background slideshow.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button disabled>Go to Carousel Settings</Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckSquare className="h-6 w-6" />
                  Approve Uploaded Photos
                </CardTitle>
                <CardDescription>Review and approve photos uploaded by guests before they appear in the public gallery.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button disabled>Review Submissions</Button>
              </CardContent>
            </Card>
          </div>
       </main>
    </div>
  );
}
