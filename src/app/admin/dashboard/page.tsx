import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Home } from 'lucide-react';

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
         <Card>
            <CardHeader>
              <CardTitle>Welcome, Admin!</CardTitle>
              <CardDescription>This is your dashboard. You can manage your application from here.</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Future admin controls and content will go here.</p>
            </CardContent>
          </Card>
       </main>
    </div>
  );
}
