
"use client";

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Home, Images, CheckSquare, LogOut, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { fetchWithCsrf } from '@/lib/fetchWithCsrf';

export default function AdminDashboardPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const response = await fetchWithCsrf('/api/admin/logout', {
        method: 'POST',
      });

      if (response.ok) {
        toast({
          title: 'Logged Out',
          description: 'You have been successfully logged out.',
          duration: 3000,
        });
        router.push('/admin');
        router.refresh();
      } else {
        throw new Error('Logout failed');
      }
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        variant: 'destructive',
        title: 'Logout Failed',
        description: 'Could not log out. Please try again.',
      });
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="py-4 px-4 md:px-8 sticky top-0 bg-background/80 backdrop-blur-sm z-10 border-b">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl md:text-4xl font-headline text-foreground">
            Admin Dashboard
          </h1>
          <Button variant="outline" onClick={handleLogout} disabled={isLoggingOut}>
            {isLoggingOut ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}
            Logout
          </Button>
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
