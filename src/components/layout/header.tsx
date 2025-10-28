'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton, SignInButton, SignedIn, SignedOut } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Home, Building2, Bookmark, MessageSquare } from 'lucide-react';

const navigation = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Directory', href: '/directory', icon: Building2 },
  { name: 'Bookmarks', href: '/bookmarks', icon: Bookmark },
  { name: 'Messages', href: '/messages', icon: MessageSquare },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <div className="mr-4 flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <span className="font-bold text-lg">ConnectCRE</span>
          </Link>
        </div>

        <nav className="flex items-center gap-6 text-sm">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 transition-colors hover:text-foreground/80',
                  isActive ? 'text-foreground font-medium' : 'text-foreground/60'
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
          <SignedOut>
            <SignInButton mode="modal">
              <Button variant="default" size="sm">
                Sign In
              </Button>
            </SignInButton>
          </SignedOut>
        </div>
      </div>
    </header>
  );
}
