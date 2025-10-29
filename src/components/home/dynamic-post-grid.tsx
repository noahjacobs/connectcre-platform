"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PostCard } from "@/components/posts";
import type { Post } from "@/components/posts/types";
import MotionButton from "@/components/ui/motion-button";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ArrowRight, MonitorSmartphone, Star, X } from "lucide-react";
import { useAuth } from "@/lib/providers/auth-context";
import { AuthModal } from "@/components/ui/auth-modal";
import { PricingDialog } from "@/components/ui/pricing-dialog";
import { useSubscription } from "@/lib/providers/subscription-context";
import { getCitySlugFromName } from '@/lib/utils';

// Define a type for the hovered item ID (can be Post _id or Project id) - Copy from parent if needed
type HoveredItemId = string | null;

interface DynamicPostGridProps {
  posts: Post[];
  postsPerPage?: number;
  selectedCity?: string | null;
  canLoadMore: boolean;
  isLoadingMore: boolean;
  isLoading: boolean;
  loadMorePosts: () => Promise<void>;
  setHoveredItemId: (id: HoveredItemId) => void; // <-- Add prop
  viewMode: 'list' | 'split' | 'map'; // <-- Add viewMode prop
  isMobile: boolean;
  isUpsellDismissed: boolean;
  setIsUpsellDismissed: (dismissed: boolean) => void;
  onPostClick: (post: Post) => void; // <-- Add handler prop
  disableMapHover?: boolean; // <-- NEW: Add prop for disabling map hover
}

// Define the component function separately
const DynamicPostGridComponent: React.FC<DynamicPostGridProps> = ({
  posts,
  postsPerPage = 12,
  selectedCity,
  canLoadMore,
  isLoadingMore,
  isLoading,
  loadMorePosts,
  setHoveredItemId, // <-- Destructure prop
  viewMode, // <-- Destructure viewMode
  isMobile,
  isUpsellDismissed,
  setIsUpsellDismissed,
  onPostClick, // <-- Destructure handler prop
  disableMapHover // <-- NEW: Destructure disableMapHover
}) => {
  const { hasMembershipAccess, isLoading: isSubscriptionLoading } = useSubscription();
  const { user, loading: isAuthLoading } = useAuth();
  const renderCount = useRef(0);

  // Add effect to scroll parent to top when posts change
  // useEffect(() => {
  //   // Find the scrollable parent container
  //   const scrollableParent = document.querySelector('[class*="md:overflow-y-auto"]');
  //   if (scrollableParent) {
  //     scrollableParent.scrollTop = 0;
  //   }
  // }, [posts]); // Only run when posts array changes

  // New state for delayed "No results found" message
  const [allowNoResultsDisplay, setAllowNoResultsDisplay] = useState(false);
  const noResultsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    renderCount.current += 1;
  });

  // Conditional grid class based on viewMode
  const gridColsClass = cn({
    "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3": viewMode === 'list',
    "grid-cols-1 sm:grid-cols-2": viewMode === 'split',
    // No specific class needed for 'map' view as the grid container is hidden
  });

  const [isMobileMessageDismissed, setIsMobileMessageDismissed] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showPricingDialog, setShowPricingDialog] = useState(false);

  useEffect(() => {
      const dismissed = localStorage.getItem('mobileMapMessageDismissed');
      if (dismissed === 'true') {
          setIsMobileMessageDismissed(true);
      }
  }, []);

  // Effect to manage the "No results found" display delay
  useEffect(() => {
    // Always clear previous timer on new run of effect
    if (noResultsTimerRef.current) {
      clearTimeout(noResultsTimerRef.current);
      noResultsTimerRef.current = null;
    }

    if (isLoading) {
      setAllowNoResultsDisplay(false); // Reset when loading, skeletons will be shown
    } else { // Not loading
      if (posts?.length === 0) {
        // Not loading and no posts. Wait before allowing "No results" message.
        // Skeletons will be shown during this wait period.
        noResultsTimerRef.current = setTimeout(() => {
          // Re-check conditions after timeout to ensure state hasn't changed unexpectedly
          if (!isLoading && posts?.length === 0) {
            setAllowNoResultsDisplay(true);
          }
        }, 15000); // 15000ms delay
      } else {
        // Not loading and posts exist. No "No results" message needed.
        setAllowNoResultsDisplay(false);
      }
    }

    // Cleanup function to clear timer on unmount or before effect re-runs
    return () => {
      if (noResultsTimerRef.current) {
        clearTimeout(noResultsTimerRef.current);
      }
    };
  }, [isLoading, posts?.length]); // Dependencies for the effect

  const dismissMobileMessage = () => {
      setIsMobileMessageDismissed(true);
      localStorage.setItem('mobileMapMessageDismissed', 'true');
  };

  const dismissUpsell = () => {
    if (!user) {
      setShowAuthModal(true);
    } else {
      setIsUpsellDismissed(true);
    }
  };

  return (
    <div className="space-y-6 relative z-0">
      {isMobile && !isMobileMessageDismissed && (
        <div className="relative flex flex-col items-center justify-center text-center p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <Button 
              variant="ghost"
              size="icon"
              onClick={dismissMobileMessage}
              className="absolute top-1 right-1 text-blue-400 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-300 rounded-full h-7 w-7"
              aria-label="Dismiss notification"
          >
              <X className="h-4 w-4" />
          </Button>
      
          <MonitorSmartphone className="w-8 h-8 mb-2 text-blue-500 dark:text-blue-400" />
          <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-1">Heads up—map view available on desktop</h3>
          <p className="text-xs text-blue-700 dark:text-blue-300 max-w-xs">
            A bigger screen brings more context, more clarity, and more to explore.
            Trust us, it&apos;s worth the real estate.
          </p>
        </div>
      )}
      {!isMobile && !isSubscriptionLoading && !isAuthLoading && !hasMembershipAccess && (!user || !isUpsellDismissed) && (
        <div className="mt-[-6px] relative flex flex-col items-center justify-center text-center p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <Button 
              variant="ghost"
              size="icon"
              onClick={dismissUpsell}
              className="absolute top-1 right-1 text-blue-400 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-300 rounded-full h-7 w-7"
              aria-label="Dismiss notification"
          >
              <X className="h-4 w-4" />
          </Button>

          <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-1">Unlock Full Access to Projects & Leads</h3>
          <p className="text-xs text-blue-700 dark:text-blue-300 max-w-xs mb-3">
            Gain visibility into active developments, connect with decision-makers, and access exclusive market insights.
          </p>
          <Button 
            size="sm" 
            className="w-full max-w-[200px]" 
            onClick={() => { 
              if (!user) {
                setShowAuthModal(true);
              } else {
                setShowPricingDialog(true);
              }
            }}
          >
            See What's Inside
            <ArrowRight className="h-4 w-4" />
          </Button>
      
          {/* <MonitorSmartphone className="w-8 h-8 mb-2 text-blue-500 dark:text-blue-400" />
          <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-1">Heads up—map view available on desktop</h3>
          <p className="text-xs text-blue-700 dark:text-blue-300 max-w-xs">
            A bigger screen brings more context, more clarity, and more to explore.
            Trust us, it&apos;s worth the real estate.
          </p> */}
        </div>
      )}

      {/* --- NEW: No Results Message --- */}
      {!isLoading && posts?.length === 0 && allowNoResultsDisplay && (
        <div className="col-span-full text-center py-10 text-muted-foreground">
          No results found.
          {/* Optionally add more context based on props if needed */}
        </div>
      )}
      {/* --- End No Results Message --- */}

      <motion.div
        className={`grid ${gridColsClass} gap-6 relative z-0`}
        layout
      >
        <AnimatePresence>
          {isLoading || (posts?.length === 0 && !allowNoResultsDisplay) ? (
            // Subtle skeleton loading
            (() => {
              return Array.from({ length: postsPerPage }).map((_, index) => (
                <motion.div
                  key={`skeleton-${index}`}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ position: "relative", zIndex: 1 }}
                  className="z-10 relative"
                >
                  <div className="group rounded-xl border bg-card overflow-hidden">
                    {/* Image skeleton */}
                    <div className="aspect-video relative overflow-hidden bg-muted/30">
                      <div className="w-full h-full bg-muted animate-pulse" />
                    </div>
                    
                    {/* Content skeleton */}
                    <div className="p-4 flex flex-col h-[150px]">
                      <div className="flex-1 flex flex-col">
                        {/* Title skeleton */}
                        <div className="mb-1.5">
                          <div className="h-6 bg-muted animate-pulse rounded mb-1 w-[90%]" />
                          <div className="h-6 bg-muted animate-pulse rounded w-[70%]" />
                        </div>
                        
                        {/* Subtitle skeleton */}
                        <div className="text-muted-foreground text-sm">
                          <div className="h-4 bg-muted animate-pulse rounded mb-1 w-[95%]" />
                          <div className="h-4 bg-muted animate-pulse rounded w-[80%]" />
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ));
            })()
          ) : (
             // Log when posts are shown
            (() => {
              return (posts || []).map((post, index) => {
                const citySlug = post.city_name ? getCitySlugFromName(post.city_name) : undefined;
                const neighborhoodSlug = post.neighborhood_name;
                const postSlug = post.slug;
                const uniquePostId = post.id || `post-${index}-${post.title}`;
                const canOpenPost = citySlug && postSlug;

                return (
                  <motion.div
                    key={uniquePostId}
                    layout
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{
                      duration: 0.4,
                      ease: "easeOut",
                      layout: { duration: 0.4, ease: "easeOut" }
                    }}
                    style={{ position: "relative", zIndex: 1 }}
                    // Use Supabase Project ID for hover if available
                    onMouseEnter={() => {
                      if (!disableMapHover) {
                        setHoveredItemId(post.supabase_project_id || post.id);
                      }
                    }}
                    onMouseLeave={() => {
                      if (!disableMapHover) {
                        setHoveredItemId(null);
                      }
                    }}
                    // Use a button element for click handling
                    className="rounded-lg transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 z-10 relative"
                  >
                    <button 
                      onClick={() => canOpenPost ? onPostClick(post) : console.warn('Missing slug/city for post click:', post.id, post.title)}
                      disabled={!canOpenPost}
                      className="group block h-full w-full text-left cursor-pointer disabled:cursor-not-allowed"
                      aria-label={`View details for ${post.title}`}
                    >
                      <PostCard
                        title={post.title}
                        subtitle={post.subtitle}
                        image={post.images}
                        city={post.city_name ? { name: post.city_name, slug: citySlug || '' } : undefined}
                        neighborhood={post.neighborhood_name ? { name: post.neighborhood_name, slug: neighborhoodSlug || '' } : undefined}
                        // Adjust className if needed for hover effect container
                        className="h-full transform transition-transform group-hover:scale-[1.02] group-focus-visible:scale-[1.02]"
                        isSelectedCity={selectedCity !== null && citySlug === selectedCity}
                      />
                    </button>
                  </motion.div>
                );
              });
            })()
          )}
        </AnimatePresence>
      </motion.div>

      {/* Show only if not initial loading, CAN load more, AND there are posts currently displayed */}
      {!isLoading && canLoadMore && posts && posts?.length > 0 && (
        <div className="flex justify-center">
          <MotionButton
            onLoad={loadMorePosts}
          >
            {/* Show loading text specific to loading more */}
            {isLoadingMore ? "Loading More..." : "Load More"}
          </MotionButton>
        </div>
      )}

      <AuthModal
        open={showAuthModal}
        onOpenChange={setShowAuthModal}
        trigger={<div />}
        returnTo={`/`}
      />
      <PricingDialog
        isOpen={showPricingDialog}
        onOpenChange={setShowPricingDialog}
      />
    </div>
  );
}

// Wrap the component with React.memo for export with custom comparison
const DynamicPostGrid = React.memo(DynamicPostGridComponent, (prevProps, nextProps) => {
  // Deep comparison for posts array
  if (prevProps.posts?.length !== nextProps.posts?.length) return false;
  if (prevProps.posts?.some((post, index) => post.id !== nextProps.posts?.[index]?.id)) return false;
  
  // Shallow comparison for other props that matter for re-rendering
  return (
    prevProps.postsPerPage === nextProps.postsPerPage &&
    prevProps.selectedCity === nextProps.selectedCity &&
    prevProps.canLoadMore === nextProps.canLoadMore &&
    prevProps.isLoadingMore === nextProps.isLoadingMore &&
    prevProps.isLoading === nextProps.isLoading &&
    prevProps.viewMode === nextProps.viewMode &&
    prevProps.isMobile === nextProps.isMobile &&
    prevProps.isUpsellDismissed === nextProps.isUpsellDismissed &&
    prevProps.disableMapHover === nextProps.disableMapHover
    // Note: Intentionally excluding function props (loadMorePosts, setHoveredItemId, onPostClick, setIsUpsellDismissed)
    // as they are likely recreated on every render and we don't want to re-render for function reference changes
  );
});

export default DynamicPostGrid; 