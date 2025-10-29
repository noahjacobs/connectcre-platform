'use client';

import Link from "next/link";
import { UserMenu } from "@/components/layout/user-menu";
import { AuthModal } from "@/components/ui/auth-modal";
import { useAuth } from "@/lib/providers/auth-context";
import { Menu, MenuItem, HoveredLink, ProductItem } from "@/components/ui/navbar-menu";
import { useState, useEffect, useRef } from "react";
import { UserCheck, Info, Bolt, BookOpen, SquareArrowOutUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { FeedbackForm } from "@/components/layout/feedback";
import { useOnborda } from "onborda";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { DialogTitle } from "@radix-ui/react-dialog";
import { VercelTabs } from "@/components/ui/vercel-tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { NotificationMenu } from "@/components/layout/notification-menu";

const LoadingSkeleton = () => (
  <div className="flex items-center gap-3">
    <div className="h-8 w-8 rounded-full bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
  </div>
);

// Main navigation tabs
const MAIN_TABS = [
  { id: 'devprojects', label: 'DevProjects' },
  { id: 'messages', label: 'Messages' },
  { id: 'directory', label: 'Directory' },
  { id: 'company', label: 'Company' },
];

type TabType = 'devprojects' | 'messages' | 'directory' | 'company' | null;

export default function Header() {
  const { user, loading } = useAuth();
  const [active, setActive] = useState<string | null>(null);
  const [isClosingFromClick, setIsClosingFromClick] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);
  const [isVideoOpen, setIsVideoOpen] = useState(false);
  const [isHelpPopoverOpen, setIsHelpPopoverOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('devprojects');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isAboutPage = pathname === '/about';
  const headerRef = useRef<HTMLElement>(null);
  const { startOnborda, isOnbordaVisible } = useOnborda();

  // Minimal prefetching - let Next.js handle optimization naturally
  // Only prefetch on hover to respect user intent without impacting LCP
  const handleTabHover = (tabId: string) => {
    const path = tabId === 'devprojects' ? '/' : `/${tabId}`;
    router.prefetch(path);
  };

  // Define valid routes that should have active tabs
  const validRoutes = ['/', '/messages', '/directory', '/company', '/dashboard', '/admin'];
  const isValidRoute = validRoutes.some(route => 
    route === '/' ? pathname === '/' : pathname.startsWith(route)
  );

  // Determine active tab from pathname and search params
  useEffect(() => {
    if (pathname === '/') {
      setActiveTab('devprojects');
    } else if (pathname === '/about') {
      setActiveTab(null);
    } else if (pathname.startsWith('/messages')) {
      setActiveTab('messages');
    } else if (pathname.startsWith('/directory')) {
      setActiveTab('directory');
    } else if (pathname.startsWith('/company')) {
      setActiveTab('company');
    } else if (pathname.startsWith('/dashboard')) {
      // Keep dashboard for backwards compatibility
      setActiveTab('devprojects');
    } else if (!isValidRoute) {
      // For any route not in our valid routes (like 404 pages), show no active tab
      setActiveTab(null);
    } else {
      setActiveTab('devprojects');
    }
  }, [pathname, searchParams, isValidRoute]);

  useEffect(() => {
    const handleScroll = () => {
      setHasScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Ensure header position is always restored correctly
  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
          const position = header.style.position;
          // Only restore to sticky if position was cleared (empty string)
          // This allows other components to explicitly set different positions
          if (position === '') {
            header.style.position = isAboutPage ? 'fixed' : 'sticky';
          }
        }
      });
    });

    observer.observe(header, { attributes: true });
    return () => observer.disconnect();
  }, [isAboutPage]);

  const handleSetActive = (item: string | null) => {    
    if (item === null && !isClosingFromClick) {
      setActive(null);
    } else {
      setActive(item);
      setIsClosingFromClick(false);
    }
  };

  const handleItemClick = async () => {
    setIsClosingFromClick(true);
    setActive(null);
    
    // Navigate to home if not already there
    if (pathname !== '/') {
      router.push('/');
      // Wait for navigation to complete
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  };

  const handleTabChange = (tabId: string) => {
    const newTab = tabId as TabType;
    setActiveTab(newTab);
    
    // Optimized navigation: replace for tab switches, but preserve deep links
    const targetPath = newTab === 'devprojects' ? '/' : `/${newTab}`;
    
    // Only navigate if we're not already on the target path
    if (pathname !== targetPath) {
      // Use replace to prevent tab history pollution
      router.replace(targetPath);
    }
  };

  const handleHelpLinkClick = () => {
    setIsHelpPopoverOpen(false);
  };

  return (
    <header
      ref={headerRef}
      className={cn(
        'left-0 right-0 transition-all duration-300 top-0',
        isAboutPage ? 'fixed z-50' : `sticky w-full ${!isOnbordaVisible ? 'border-b border-zinc-200 dark:border-zinc-800 z-50' : ''} bg-background`,
        hasScrolled
          ? `bg-white/90 dark:bg-black/90 backdrop-blur-sm ${!isOnbordaVisible ? 'border-b border-zinc-200 dark:border-zinc-800 z-50' : ''}`
          : 'bg-linear-to-b from-zinc-50 via-zinc-50/80 to-transparent dark:from-zinc-900 dark:via-zinc-900/80 dark:to-transparent'
      )}
    >
      <div className="px-3 sm:px-6 flex items-center justify-between h-12 gap-2">
        <div className="relative z-10 flex items-center space-x-2 sm:space-x-3 font-sora group flex-shrink-0" aria-label="Home page" id="tour-welcome">
          <Link href="/" className="relative">
            <Bolt className="w-5 h-5 sm:w-6 sm:h-6 text-black dark:text-white group-hover:scale-110 transition-transform duration-200" />
            <div className="absolute -inset-1 bg-linear-to-r from-indigo-500/20 via-blue-500/20 to-cyan-400/20 rounded-lg blur-sm group-hover:blur-md transition-all duration-300 opacity-0 group-hover:opacity-100"></div>
          </Link>
          <div className="flex flex-1 justify-center min-w-0">
            <VercelTabs
              tabs={MAIN_TABS}
              activeTab={activeTab}
              onTabChange={handleTabChange}
              onTabHover={handleTabHover}
              className="w-full"
              tabProps={{
                directory: { id: "tour-marketplace" }
              }}
            />
          </div>
        </div>

        {/* Right side menu */}
        <div className="flex items-center relative z-10 flex-shrink-0">
          <div className="hidden md:flex items-center gap-1.5 sm:gap-2">
            <FeedbackForm title="Feedback" key={pathname} />
            <NotificationMenu onAuthRequired={() => setIsAuthModalOpen(true)} />
            <Popover open={isHelpPopoverOpen} onOpenChange={setIsHelpPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  className="rounded-full h-8 w-8 sm:h-9 sm:w-9 p-0"
                  variant="outline"
                  size="icon"
                >
                  <BookOpen className="w-4 h-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-[220px] p-0">
                <div className="flex flex-col">                  
                  {/* Menu Items */}
                  <div className="p-2">
                    <Link
                      href="/" onClick={() => { handleItemClick(); startOnborda("howItWorks"); handleHelpLinkClick(); }}
                      className="flex items-center gap-3 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                      <div className="flex-1">
                        <div className="font-medium">Walkthrough</div>
                        <div className="text-xs text-zinc-500">How to use DevProjects</div>
                      </div>
                      <Info className="w-4 h-4 text-zinc-400" />
                    </Link>
                    
                    <Link
                      href="mailto:info@devprojects.ai"
                      onClick={handleHelpLinkClick}
                      className="flex items-center gap-3 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                      <div className="flex-1">
                        <div className="font-medium">Help</div>
                        <div className="text-xs text-zinc-500">Get support</div>
                      </div>
                      <SquareArrowOutUpRight className="w-4 h-4 text-zinc-400" />
                    </Link>

                    <Link
                      href="/about"
                      onClick={handleHelpLinkClick}
                      className="flex items-center gap-3 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                      <div className="flex-1">
                        <div className="font-medium">About</div>
                        <div className="text-xs text-zinc-500">Member benefits</div>
                      </div>
                      <UserCheck className="w-4 h-4 text-zinc-400" />
                    </Link>
                    
                    {/* <Link
                      href="#"
                      className="flex items-center gap-3 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                      <div className="flex-1">
                        <div className="font-medium">Docs</div>
                        <div className="text-xs text-zinc-500">Documentation</div>
                      </div>
                      <SquareArrowOutUpRight className="w-4 h-4 text-zinc-400" />
                    </Link> */}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            {/* <Menu setActive={handleSetActive}>
              <MenuItem setActive={handleSetActive} active={active} item="About">
                <div className="flex flex-col font-medium space-y-4 text-sm min-w-40">
                  <HoveredLink href="/" onClick={() => { handleItemClick(); startOnborda("howItWorks"); }} className="flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    How It Works
                  </HoveredLink>
                  <HoveredLink href="#" onClick={() => { handleItemClick(); setIsVideoOpen(true); }} className="flex items-center gap-2 cursor-pointer">
                    <Play className="w-4 h-4" />
                    Video Demo
                  </HoveredLink>
                  <HoveredLink href="/about" onClick={handleItemClick} className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4" />
                    Member Benefits
                  </HoveredLink>
                </div>
              </MenuItem>
            </Menu> */}
          </div>
          <div className="flex items-center ml-1.5 sm:ml-3">
            {loading ? <LoadingSkeleton /> : (user ? <UserMenu /> : <AuthModal open={isAuthModalOpen} onOpenChange={setIsAuthModalOpen} />)}
          </div>
        </div>
      </div>

      <Dialog open={isVideoOpen} onOpenChange={setIsVideoOpen}>
        <DialogContent className="max-w-3xl p-0">
          <VisuallyHidden>
            <DialogTitle>DevProjects Demo Video</DialogTitle>
          </VisuallyHidden>
          <div className="aspect-video">
            <iframe
              className="w-full h-full rounded-2xl"
              src="https://www.youtube.com/embed/IjV60dY1tgA?si=jXVZcdzD4LRpzFqV?vq=hd2160"
              title="DevProjects Demo Video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            ></iframe>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}