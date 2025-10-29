"use client"

import React from "react";
import va from '@vercel/analytics'; // Import Vercel Analytics
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { cn, getImageUrl, getPostUrl, getCitySlugFromName, getNeighborhoodSlugFromName } from "@/lib/utils";
import {
    MapPin,
    Bolt,
    Users2,
    ChevronLeft,
    Info,
    MessageSquare,
    Home,
    MapPinHouse,
    Share2,
    Bookmark,
    PlusCircle,
    History,
    CalendarClock,
    ChevronDown,
    ChevronUp
} from "lucide-react";
import { useAuth } from "@/lib/providers/auth-context";
import { toast } from "sonner";
import { useSupabase } from "@/lib/providers/supabase-context";
import { GradientPaywall } from './gradient-paywall'
import { Post } from "@/components/posts/types"
import PostHero from "./hero"
// import PortableTextRenderer from "@/components/portable-text-renderer" // Not needed for text content
import Comments from '@/components/posts/components/comments'
import { PostHero as PostHeroComponent } from "./post-hero"
import { Button } from "@/components/ui/button"
import SideCTA from "./side-cta"
import NoProjectCTA from "./no-project-cta";
import ProjectVendors from "./project-vendors"
import { HoveredLink, MenuItem, Menu } from "@/components/ui/breadcrumb-menu"
import { ExpandableTabs, TabItem } from "@/components/ui/expandable-tabs";
import { AuthModal } from "@/components/ui/auth-modal";
import { useRouter } from "next/navigation";
import { type CompanyProjectResponse } from '@/components/projects';
import { invalidatePostAndProjectCache } from '@/components/posts';
import { ContactDevelopers } from "./contact-developers";
import { useUserCompanies } from "@/hooks/use-user-companies";
import Image from "next/image"
import Link from "next/link"
import { ImageGallery } from './image-gallery';
import { GradientButton } from '@/components/ui/gradient-button';
import { useArticleViews } from "@/lib/providers/article-views";
import { useSubscription } from "@/lib/providers/subscription-context";
import { PricingDialog } from "@/components/ui/pricing-dialog";
import { Project, ProjectUpdate, ProjectWithUpdates } from "@/components/projects/types";
import { mergeProjectWithUpdates, generateProjectDiffs } from "@/components/projects/project-updates";
import { EditorControls } from './editor-controls';
import { formatFieldName, formatFieldValue } from '@/components/projects/project-updates';

// Helper hook for logging prop/state changes
// function useWhyDidYouUpdate(name: string, props: Record<string, any>) {
//   const previousProps = useRef<Record<string, any>>(undefined);

//   useEffect(() => {
//     if (previousProps.current) {
//       const allKeys = Object.keys({ ...previousProps.current, ...props });
//       const changesObj: Record<string, any> = {};
//       allKeys.forEach((key) => {
//         if (previousProps.current?.[key] !== props[key]) {
//           changesObj[key] = {
//             from: previousProps.current?.[key],
//             to: props[key],
//           };
//         }
//       });

//       if (Object.keys(changesObj).length) {
//         console.log('[why-did-you-update]', name, changesObj);
//       }
//     }
//     previousProps.current = props;
//   });
// }

interface LayoutProps {
  post: Post;
  project: Project | null;
  projectUpdates?: ProjectUpdate[];
  comments?: any[];
  relatedPosts?: Post[];
  projectCompanies?: CompanyProjectResponse[];
  citySlug: string;
  neighborhoodSlug?: string;
  onCloseModal?: () => void;
  initialHasAccess?: boolean;
  isInitialAccessLoading?: boolean;
  onDataNeedsRefresh?: () => void;
  isModalView?: boolean;
}

const PostLayoutComponent = ({
  post,
  project,
  projectUpdates = [],
  comments = [],
  relatedPosts = [],
  projectCompanies = [],
  citySlug,
  neighborhoodSlug,
  onCloseModal,
  initialHasAccess,
  isInitialAccessLoading,
  onDataNeedsRefresh,
  isModalView,
}: LayoutProps) => {
  
  // Helper function to capitalize first letter of each word
  const capitalizeWords = (str: string) => {
    if (!str) return "";
    return str.split(/\s+/).map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(" ");
  };

  const { user } = useAuth()
  const { addArticleView, hasReachedLimit, isLoading: isArticleViewsLoading } = useArticleViews()
  const [activeSection, setActiveSection] = useState('overview')
  const [isNavSticky, setIsNavSticky] = useState(false)
  const [activeItem, setActiveItem] = useState<string | null>(null)
  const [commentCount, setCommentCount] = useState(comments.length)
  const [isSaved, setIsSaved] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [mobileTabIndex, setMobileTabIndex] = useState<number | undefined>(0)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const router = useRouter()
  const { hasMembershipAccess, isLoading: isMembershipStatusLoading } = useSubscription();
  const [showPricingDialog, setShowPricingDialog] = useState(false);
  const isScrollingViaClick = useRef(false);
  const { supabase } = useSupabase();
  
  // Get user companies but memoize to prevent reference changes
  const { companies: userCompaniesRaw } = useUserCompanies()
  
  // Stable reference for userCompanies - use a proper deep comparison
  const userCompanies = useMemo(() => {
    if (!userCompaniesRaw) return [];
    return userCompaniesRaw;
  }, [userCompaniesRaw?.length, userCompaniesRaw?.map(uc => uc.id).join(',')]); // Use length and ID string for comparison

  const [refreshStatsCallback, setRefreshStatsCallback] = useState<(() => void) | null>(null);
  const [refreshBidsCallback, setRefreshBidsCallback] = useState<(() => void) | null>(null);

  const [fetchedBody, setFetchedBody] = useState<any | null>(null);
  const [isBodyLoading, setIsBodyLoading] = useState<boolean>(false);
  const [accessDenied, setAccessDenied] = useState<boolean>(false);
  const [isContentExpanded, setIsContentExpanded] = useState<boolean>(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState<number>(0);

  const bodyFetchAttempted = useRef(false);

  // Calculate content height for smooth animation
  useEffect(() => {
    if (contentRef.current && fetchedBody) {
      const height = contentRef.current.scrollHeight;
      setContentHeight(height);
    }
  }, [fetchedBody]);
  const hasTrackedViewRef = useRef(false); // Ref to track if view was logged
  const articleViewTrackedRef = useRef(false); // Ref to track if article view was recorded

  // --- Track View on Page Load (Non-Modal) ---
  useEffect(() => {
    // Only track if it's not a modal view AND we haven't tracked this instance yet
    if (!isModalView && !hasTrackedViewRef.current) {
      if (post?.id) {
        va.track('View Post', {
           postId: post.id,
           postSlug: post.slug,
           citySlug: post.city_name || '',
           ...(post.neighborhood_name && { neighborhoodSlug: post.neighborhood_name }),
        });
        hasTrackedViewRef.current = true; // Mark as tracked
      } else if (project?.id) {
        // Track project view if no post ID but project ID exists
        va.track('View Project', {
           projectId: project.id,
           projectTitle: project.title,
           // Add city/other relevant context if available and needed
           ...(citySlug && { citySlug: citySlug }),
        });
      }
    }
    // Depend on IDs and isModalView. Add others if needed for payload.
  }, [post?.id, post?.slug, post?.city_name, post?.neighborhood_name, project?.id, project?.title, citySlug, isModalView]);

  // --- Ad Logic ---
  // TODO: Implement your actual logic to check if the DTSM campaign is active
  const isDTSMCampaignActive = true; // Placeholder
  const shouldShowAds = useMemo(() => {
    // Only show ads on LA posts and if the specific campaign is active
    const show = citySlug === 'la' && isDTSMCampaignActive;
    return show;
  }, [citySlug, isDTSMCampaignActive]);
  // --- End Ad Logic ---

  const accessState = useMemo(() => {
    let state: 'loading' | 'granted' | 'denied' = 'loading';
    let source = 'unknown';

    if (typeof initialHasAccess === 'boolean') {
      source = "prop";
      if (typeof isInitialAccessLoading === 'boolean' && isInitialAccessLoading) {
        state = 'loading';
      } else {
        state = initialHasAccess ? 'granted' : 'denied';
      }
    }
    else {
      source = "internal_hooks";
      if (isMembershipStatusLoading || isArticleViewsLoading) {
         state = 'loading';
      } else {
         const internalHasAccess = hasMembershipAccess || !hasReachedLimit;
         state = internalHasAccess ? 'granted' : 'denied';
      }
    }
    return state;
  }, [
    initialHasAccess,
    isInitialAccessLoading,
    isMembershipStatusLoading,
    isArticleViewsLoading,
    hasMembershipAccess,
    hasReachedLimit
  ]);

  useEffect(() => {
    if (post?.id && !hasMembershipAccess) {
      if (articleViewTrackedRef.current) {
        return;
      }
      addArticleView(post.id);
      articleViewTrackedRef.current = true;
    }
  }, [addArticleView, post?.id]);

  const setStatsRefreshCallback = useCallback((callback: () => void) => {
    setRefreshStatsCallback(() => callback);
  }, []);

  const setBidsRefreshCallback = useCallback((callback: () => void) => {
    setRefreshBidsCallback(() => callback);
  }, []);

  const [showProjectBidDialog, setShowProjectBidDialog] = useState(false);

  // Merge project with updates and calculate diffs
  const currentProject = useMemo(() => {
    if (!project) return null;
    return mergeProjectWithUpdates(project, projectUpdates);
  }, [project, projectUpdates]);

  const projectDiffs = useMemo(() => {
    if (!project || !projectUpdates || projectUpdates.length === 0) return [];
    return generateProjectDiffs(project, projectUpdates);
  }, [project, projectUpdates]);

  const title = post?.title
  const description = post?.subtitle
  const images = post?.images

  useEffect(() => {
    const fetchSavedState = async () => {
      if (!user || !post?.id || !supabase) return

      try {
        const { data, error } = await supabase
          .from('saved_items_view')
          .select('id')
          .eq('user_id', user.id)
          .eq('item_id', post.id)
          .eq('item_type', 'post')
          .single()

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching saved state:', error)
          return
        }

        setIsSaved(!!data)
      } catch (error) {
        console.error('Error checking saved state:', error)
      }
    }

    fetchSavedState()
  }, [user, post?.id])

  const postUrl = useMemo(() => 
    `${process.env.NEXT_PUBLIC_SITE_URL}${getPostUrl(post?.city_name, post?.neighborhood_name, post?.slug)}`,
    [post?.city_name, post?.neighborhood_name, post?.slug]
  );

  useEffect(() => {
    const mainHeader = document.querySelector('header')
    if (mainHeader) {
      const originalPosition = mainHeader.style.position
      mainHeader.style.position = 'relative'
      return () => {
        if (mainHeader) {
          mainHeader.style.position = originalPosition
        }
      }
    }
  }, [])

  // Cleanup effect to ensure body styles are restored when component unmounts
  useEffect(() => {
    return () => {
      // Force restore body styles when PostLayout unmounts
      // This is critical for when the modal closes due to navigation
      if (isModalView) {
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.classList.remove('paywall-active');
      }
    };
  }, [isModalView])

  // Escape key handler for modal view
  useEffect(() => {
    if (!isModalView || !onCloseModal) return;

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCloseModal();
      }
    };

    document.addEventListener('keydown', handleEscapeKey);

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isModalView, onCloseModal])

  useEffect(() => {
    const setupScrollListener = () => {
      const scrollElement = onCloseModal
        ? document.querySelector('.modal-scroll-container')
        : window;

      if (!scrollElement) {
          if (onCloseModal) {
            console.warn("Modal scroll container not found for listener.");
            // Retry after a short delay if modal container not found
            setTimeout(setupScrollListener, 100);
            return;
          }
          return;
      }

      const handleScroll = (event?: Event) => {
        if (isScrollingViaClick.current) {
          return;
        }

        let scrollTop = 0;
        let containerHeight = 0;

        if (scrollElement === window) {
          scrollTop = window.scrollY;
          containerHeight = window.innerHeight;
        } else if (event?.target && event.target instanceof Element) {
          scrollTop = event.target.scrollTop;
          containerHeight = event.target.clientHeight;
        }

        const currentNavShouldBeSticky = scrollElement === window && scrollTop > 56;
        const calculatedNavHeight = !onCloseModal && currentNavShouldBeSticky ? 56 : 0;
        const baseOffset = 16;
        const scrollOffset = onCloseModal ? (56 + baseOffset) : (calculatedNavHeight + baseOffset);
        const scrollPosition = scrollTop + scrollOffset;

        const getOffsetTop = (ref: React.RefObject<HTMLDivElement | null>): number => {
          return ref.current?.offsetTop ?? Infinity;
        };

        const overviewTop = getOffsetTop(overviewRef);
        const updatedTop = currentProject && updatesRef.current ? getOffsetTop(updatesRef) : Infinity;
        const teamTop = currentProject && teamRef.current ? getOffsetTop(teamRef) : Infinity;
        const commentsTop = commentsRef.current ? getOffsetTop(commentsRef) : Infinity;

        let newActiveSectionCandidate: string;

        if (scrollTop < 50) {
          newActiveSectionCandidate = 'overview';
        } else if (scrollPosition >= commentsTop && commentsTop !== Infinity) {
          newActiveSectionCandidate = 'post-comments';
        } else if (scrollPosition >= teamTop && teamTop !== Infinity) {
          newActiveSectionCandidate = 'team';
        } else if (scrollPosition >= updatedTop && updatedTop !== Infinity) {
          newActiveSectionCandidate = 'updates';
        } else if (scrollPosition >= overviewTop && overviewTop !== Infinity) {
          newActiveSectionCandidate = 'overview';
        } else { 
          newActiveSectionCandidate = 'overview';
        }

        // If scrollTop is 0, we reset as a workaround
        if (activeSection !== newActiveSectionCandidate || scrollTop == 0) {
          setActiveSection(newActiveSectionCandidate);
        }

        if (scrollElement === window) {
          if (scrollTop > 56) {
            setIsNavSticky(true)
          } else {
            setIsNavSticky(false)
          }
        }
      }

      scrollElement.addEventListener('scroll', handleScroll);

      return () => {
        scrollElement.removeEventListener('scroll', handleScroll);
      };
    };

    // Use requestAnimationFrame to ensure DOM is ready
    const cleanup = requestAnimationFrame(setupScrollListener);
    
    return () => {
      cancelAnimationFrame(cleanup);
    };
  }, [!!onCloseModal]); // Use boolean conversion to avoid function reference changes

  useEffect(() => {
    const loadBodyContent = async () => {
      if (!post?.id) {
        return;
      }
      if (fetchedBody || accessDenied) {
        return;
      }
      if (bodyFetchAttempted.current) {
        return;
      }

      switch (accessState) {
        case 'loading':
          setIsBodyLoading(true);
          setAccessDenied(false);
          break;

        case 'denied':
          setAccessDenied(true);
          setIsBodyLoading(false);
          setFetchedBody(null);
          break;

        case 'granted':
          if (!bodyFetchAttempted.current) {
            bodyFetchAttempted.current = true;
            setIsBodyLoading(true);
            setAccessDenied(false);
            try {
              const bodyContent = post.body_ai || null;
              
              if (bodyContent) {
                // Use the body_ai text content directly since it's already a string
                setFetchedBody(bodyContent);
              } else {
                console.warn(`No body content found for post ${post.id}.`);
              }
            } catch (error) {
              console.error("Error loading post body:", error);
              toast.error("Failed to load article content.");
            } finally {
              setIsBodyLoading(false);
            }
          } else {
             if(isBodyLoading) setIsBodyLoading(false);
          }
          break;
      }
    };

    if (post?.id) {
      loadBodyContent();
    }

  }, [
    post?.id,
    accessState,
    fetchedBody,
    accessDenied,
  ]);

  const SidebarContent = (
    <>
      {isBodyLoading && (
          <div className="min-h-[300px] w-full bg-zinc-100 dark:bg-zinc-800 animate-pulse rounded-md"></div>
      )}
      {!isBodyLoading && !accessDenied && (
          currentProject && post.supabase_project_id ? (
          <SideCTA
            project={currentProject}
            setRefreshCallback={setStatsRefreshCallback}
            refreshStatsTrigger={refreshStatsCallback}
            setBidsRefreshCallback={setBidsRefreshCallback}
            userCompanies={userCompanies}
          />
        ) : (
          <NoProjectCTA />
        )
      )}
    </>
  );

  const isEditor = user?.user_type === 'editor' || user?.user_type === 'admin';

  const handleEditorUpdate = async () => {
    if (post?.slug && citySlug) {
      try {
        await invalidatePostAndProjectCache({
            postSlug: post.slug,
            cityName: citySlug,
            projectSlug: project?.slug || undefined
        });
        // console.log("[PostLayout] Invalidated post/project cache for:", post.slug);
      } catch (error) {
        console.error("[PostLayout] Error invalidating post/project cache:", error);
        // Optionally, show a toast error to the user
      }
    }
    onDataNeedsRefresh?.();
    if (!onCloseModal) {
      router.refresh();
    }
  };

  const articleSchema = useMemo(() => {
    if (!post) return null;

    let imageUrl: string | null = null;
    // Use banner image for schema, fallback to first gallery image if no banner
    if (post.bannerImage) {
      imageUrl = getImageUrl(post.bannerImage);
    } else if (post.images?.[0]) {
      imageUrl = getImageUrl(post.images[0]);
    }

    const publishedDate = post.published_at || post.created_at;
    const modifiedDate = post.updated_at || publishedDate;

    return {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": post.title || 'Untitled Post',
      "description": post.subtitle || 'Read the latest update from DevProjects.',
      ...(imageUrl && { "image": imageUrl }),
      "datePublished": publishedDate,
      "dateModified": modifiedDate,
      "author": {
        "@type": "Organization",
        "name": "DevProjects",
        "url": process.env.NEXT_PUBLIC_SITE_URL
      },
      "publisher": {
        "@type": "Organization",
        "name": "DevProjects",
        "url": process.env.NEXT_PUBLIC_SITE_URL,
      },
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": postUrl
      }
    };
  }, [post, postUrl]);

  // --- NEW: Breadcrumb Schema for PostLayout --- 
  const postBreadcrumbSchema = useMemo(() => {
    const items = [];
    let position = 1;

    // 1. Home
    items.push({
      "@type": "ListItem",
      "position": position++,
      "name": "Home",
      "item": `${process.env.NEXT_PUBLIC_SITE_URL}/`
    });

    // 2. City (if available)
    if (post?.city_name) {
      const citySlugFromName = getCitySlugFromName(post.city_name);
      items.push({
        "@type": "ListItem",
        "position": position++,
        "name": post.city_name,
        "item": `${process.env.NEXT_PUBLIC_SITE_URL}/${citySlugFromName}`
      });
    }

    // 3. Neighborhood (if available)
    if (post?.city_name && post?.neighborhood_name) {
       const citySlugFromName = getCitySlugFromName(post.city_name);
       const neighborhoodSlugFromName = getNeighborhoodSlugFromName(post.neighborhood_name);
       // Check if neighborhoodSlug is different from post slug to avoid duplication 
       // (Needed because sometimes post slug is passed as neighborhood slug)
       if (neighborhoodSlugFromName !== post?.slug) {
         items.push({
           "@type": "ListItem",
           "position": position++,
           "name": post.neighborhood_name,
           "item": `${process.env.NEXT_PUBLIC_SITE_URL}/${citySlugFromName}/${neighborhoodSlugFromName}`
         });
       }
    }

    // 4. Current Post (No item URL for the last element)
    if (post?.title) {
      items.push({
        "@type": "ListItem",
        "position": position++,
        "name": post.title
      });
    }

    if (items.length <= 1) return null; // Don't generate schema for just one item

    return {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": items
    };
  }, [post]);
  // --- End Breadcrumb Schema ---

  // *** Add logging hook call ***
  // useWhyDidYouUpdate('PostLayout', { 
  //   post, 
  //   project, 
  //   projectCompanies,
  //   citySlug, 
  //   user,
  //   userCompanies,
  //   activeSection,
  //   isNavSticky,
  //   fetchedBody,
  //   accessState
  // });

  const navigationTabs: TabItem[] = [
     { title: "Overview", icon: Info },
     ...(currentProject ? [{ title: "Updates", icon: History }] : []),
     ...(currentProject
       ? [{ title: "Team", icon: Users2 }]
       : []
     ),
     {
       title: "Comments",
       icon: MessageSquare,
       badge: commentCount > 0 ? commentCount : undefined
     },
     { type: "separator" as const },
     {
       title: isSaved ? "Saved" : "Save",
       icon: Bookmark,
       disabled: isLoading,
       iconClassName: isSaved ? "fill-current" : "fill-none"
     },
   ];

   useEffect(() => {
     if (isScrollingViaClick.current) {
       return; // Don't interfere if a click-initiated scroll is in progress
     }

     const targetIndex = navigationTabs.findIndex(tabItem => {
       if (tabItem.type === "separator" || !tabItem.title) return false;
       const title = tabItem.title.toLowerCase();
       if (activeSection === 'overview' && title === 'overview') return true;
       if (activeSection === 'updates' && title === 'updates') return true;
       if (activeSection === 'team' && title === 'team') return true;
       if (activeSection === 'post-comments' && title === 'comments') return true;
       return false;
     });

     if (targetIndex !== -1 && mobileTabIndex !== targetIndex) {
       setMobileTabIndex(targetIndex);
     }
   }, [activeSection, navigationTabs, mobileTabIndex, isScrollingViaClick]);

   const scrollToSection = (sectionId: string) => {
     const sectionMap: Record<string, React.RefObject<HTMLDivElement | null>> = {
       'overview': overviewRef,
       'updates': updatesRef,
       'team': teamRef,
       'post-comments': commentsRef,
     }

     const ref = sectionMap[sectionId]

     // Determine and set the target mobileTabIndex for this sectionId first
     const targetMobileIndex = navigationTabs.findIndex(tabItem => {
       if (tabItem.type === "separator" || !tabItem.title) return false;
       const title = tabItem.title.toLowerCase();
       if (sectionId === 'overview' && title === 'overview') return true;
       if (sectionId === 'updates' && title === 'updates') return true;
       if (sectionId === 'team' && title === 'team') return true;
       if (sectionId === 'post-comments' && title === 'comments') return true;
       return false;
     });

     if (targetMobileIndex !== -1) {
       setMobileTabIndex(targetMobileIndex); // Set tab active first
     }
     // Set activeSection before scrolling, so if effect runs, it sees the target
     if (activeSection !== sectionId) {
         setActiveSection(sectionId);
     }

     if (ref?.current) {
       isScrollingViaClick.current = true; // Signal that we are programmatically scrolling

       const navHeight = !onCloseModal && isNavSticky ? 56 : 0;
       const baseOffset = 16; // Common offset
       const scrollOffset = onCloseModal ? (56 + baseOffset) : (navHeight + baseOffset);

       if (onCloseModal) {
         const modalScroller = ref.current.closest('.modal-scroll-container');
         if (modalScroller) {
           const elementPosition = ref.current.offsetTop;
           const offsetPosition = elementPosition - scrollOffset;
           modalScroller.scrollTo({
             top: offsetPosition,
             behavior: 'smooth'
           });
         } else {
            console.warn('Modal scroll container not found for scrolling.');
            // Fallback to window scroll if modal scroller not found (though less ideal for modals)
            const elementPosition = ref.current.getBoundingClientRect().top + window.scrollY;
            const offsetPosition = elementPosition - scrollOffset;
             window.scrollTo({
               top: offsetPosition,
               behavior: 'smooth'
             })
         }
       } else {
         const elementPosition = ref.current.getBoundingClientRect().top + window.scrollY;
         const offsetPosition = elementPosition - scrollOffset;

         window.scrollTo({
           top: offsetPosition,
           behavior: 'smooth'
         })
       }

       // After scroll is initiated, reset the flag after a longer delay
       setTimeout(() => {
         isScrollingViaClick.current = false;
       }, 1200);

     } else {
       // If ref is not current, but we still want to set section as active (e.g. no DOM element)
       setActiveSection(sectionId); // Already set above
     }

     if (!onCloseModal && window.location.hash !== `#${sectionId}`) {
       history.pushState(null, '', `#${sectionId}`);
     }
   }

   const handleSaveToggle = async () => {
     if (!user) {
       setShowAuthModal(true);
       return
     }

     setIsLoading(true)
     try {
       if (!supabase) return;
       if (isSaved) {
         const { error } = await supabase
           .from('saved_articles')
           .delete()
           .eq('user_id', user.id)
           .eq('article_id', post?.id)

         if (error) throw error
         setIsSaved(false)
         toast.success('Article removed from saved items')

         if (refreshStatsCallback) {
           refreshStatsCallback();
         }
       } else {
         const { error } = await supabase
           .from('saved_articles')
           .insert({
             user_id: user.id,
             'article_id': post?.id
           })

         if (error) throw error
         setIsSaved(true)
         toast.success('Article saved successfully')

         if (refreshStatsCallback) {
           refreshStatsCallback();
         }
       }
     } catch (error) {
       console.error('Error toggling save:', error)
       toast.error('Error saving item')
     } finally {
       setIsLoading(false)
     }
   }

   const overviewRef = useRef<HTMLDivElement | null>(null)
   const updatesRef = useRef<HTMLDivElement | null>(null)
   const teamRef = useRef<HTMLDivElement | null>(null)
   const commentsRef = useRef<HTMLDivElement | null>(null)
   const navRef = useRef<HTMLDivElement | null>(null)

  return (
    <>
      {/* Add Article Schema Script */}
      {articleSchema && (
        <script type="application/ld+json">
          {JSON.stringify(articleSchema)}
        </script>
      )}
      {/* Add Post Breadcrumb Schema Script */}
      {postBreadcrumbSchema && (
        <script type="application/ld+json">
          {JSON.stringify(postBreadcrumbSchema)}
        </script>
      )}

      <div className="relative">
        <div className="hidden lg:block h-14 relative">
          <div
            ref={navRef}
            className={cn(
              "w-full bg-background",
              "transition-all duration-300 ease-in-out",
              // "border-t border-zinc-200 dark:border-zinc-800",
              onCloseModal
                ? "fixed top-0 left-0 right-0 z-40 shadow-sm"
                : (isNavSticky ? "fixed top-0 left-0 right-0 z-40 shadow-sm" : "relative")
            )}
          >
            <div className="container mx-auto">
              <div className="hidden lg:flex items-center h-14">
                <Menu setActive={setActiveItem}>
                  <MenuItem
                    item={onCloseModal ? "close" : "search"}
                    setActive={setActiveItem}
                    active={activeItem === (onCloseModal ? "close" : "search")}
                    dropdownContent={
                      <div className="flex flex-col min-w-[200px]">
                        <HoveredLink href="/" className="flex items-center gap-2">
                          <Home className="w-4 h-4" />
                          Home
                        </HoveredLink>
                        <>
                          <HoveredLink
                            href={`/${getCitySlugFromName(post?.city_name)}`}
                            className="flex items-center gap-2"
                          >
                            <MapPin className="w-4 h-4" />
                            {post?.city_name}
                          </HoveredLink>
                          {post?.neighborhood_name && (
                            <HoveredLink
                              href={`/${getCitySlugFromName(post?.city_name)}/${getNeighborhoodSlugFromName(post?.neighborhood_name)}`}
                              className="flex items-center gap-2"
                            >
                              <MapPinHouse className="w-4 h-4" />
                              {post.neighborhood_name}
                            </HoveredLink>
                          )}
                        </>
                        <div className="flex items-center gap-2 p-2 text-sm text-primary cursor-default">
                          <Bolt className="w-4 h-4 shrink-0" />
                          <span className="truncate max-w-[200px]">{title}</span>
                        </div>
                      </div>
                    }
                  >
                    {onCloseModal ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-sm rounded-full h-9 text-muted-foreground hover:text-foreground mr-1"
                        onClick={onCloseModal}
                      >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Back
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-sm rounded-full h-9 text-muted-foreground hover:text-foreground mr-1"
                        asChild
                      >
                        <Link href={`/`}>
                          <ChevronLeft className="w-4 h-4 mr-1" />
                          Search
                        </Link>
                      </Button>
                    )}
                  </MenuItem>
                </Menu>

                <div className="flex-1 flex overflow-x-auto scrollbar-none">
                  <div className="flex space-x-2 sm:space-x-4 px-2">
                    <Button
                      variant={activeSection === 'overview' ? "default" : "ghost"}
                      size="sm"
                      onClick={() => scrollToSection('overview')}
                      className={cn(
                        "rounded-full text-sm h-9 whitespace-nowrap",
                        activeSection === 'overview' ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                      )}
                    >
                      <Info className="w-4 h-4 sm:mr-1" />
                      <span className="hidden sm:inline">Overview</span>
                    </Button>

                    {currentProject && (
                      <Button
                        variant={activeSection === 'updates' ? "default" : "ghost"}
                        size="sm"
                        onClick={() => scrollToSection('updates')}
                        className={cn(
                          "rounded-full text-sm h-9 whitespace-nowrap",
                          activeSection === 'updates' ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                        )}
                      >
                        <History className="w-4 h-4 sm:mr-1" />
                        <span className="hidden sm:inline">Updates</span>
                      </Button>
                    )}

                    {currentProject && (
                      <Button
                        variant={activeSection === 'team' ? "default" : "ghost"}
                        size="sm"
                        onClick={() => scrollToSection('team')}
                        className={cn(
                          "rounded-full text-sm h-9 whitespace-nowrap",
                          activeSection === 'team' ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                        )}
                      >
                        <Users2 className="w-4 h-4 sm:mr-1" />
                        <span className="hidden sm:inline">Team</span>
                      </Button>
                    )}

                    <Button
                      variant={activeSection === 'post-comments' ? "default" : "ghost"}
                      size="sm"
                      onClick={() => scrollToSection('post-comments')}
                      className={cn(
                        "rounded-full text-sm h-9 whitespace-nowrap relative group overflow-hidden transition-all duration-300",
                        activeSection === 'post-comments'
                          ? "bg-primary text-primary-foreground hover:bg-primary/90 dark:bg-white dark:text-zinc-950"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent",
                        "after:absolute after:inset-0 after:bg-linear-to-r after:from-transparent after:via-white/5 after:to-transparent after:translate-x-[-200%] hover:after:translate-x-[200%] after:transition-transform after:duration-700"
                      )}
                    >
                      <>
                        <MessageSquare className="w-4 h-4 sm:mr-1" />
                        <div className="hidden sm:flex items-center gap-1.5">
                          <span>Comments</span>
                          {commentCount > 0 && (
                            <div className={cn(
                              "relative rounded-full",
                              activeSection === 'post-comments'
                                ? "bg-white/20 text-white dark:bg-zinc-900/50 dark:text-white"
                                : "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-foreground"
                            )}>
                              <div className={cn(
                                "absolute inset-0 rounded-full blur-[2px]",
                                activeSection === 'post-comments'
                                  ? "bg-white/20 dark:bg-zinc-900/50"
                                  : "bg-primary/10 dark:bg-primary/20"
                              )} />
                              <div className="relative px-2.5 py-0.5 rounded-full text-xs font-semibold">
                                {commentCount}
                              </div>
                            </div>
                          )}
                        </div>
                        {commentCount > 0 && (
                          <div className={cn(
                            "sm:hidden relative rounded-full",
                            activeSection === 'post-comments'
                              ? "bg-white/20 text-white dark:bg-zinc-900/50 dark:text-white"
                              : "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-foreground"
                          )}>
                            <div className={cn(
                              "absolute inset-0 rounded-full blur-[2px]",
                              activeSection === 'post-comments'
                                ? "bg-white/20 dark:bg-zinc-900/50"
                                : "bg-primary/10 dark:bg-primary/20"
                            )} />
                            <div className="relative px-2 py-0.5 rounded-full text-xs font-semibold">
                              {commentCount}
                            </div>
                          </div>
                        )}
                      </>
                    </Button>
                  </div>
                </div>

                <div className={`flex items-center gap-2 ${onCloseModal ? 'mr-6' : ''}`}>
                  <Button
                    variant="outline"
                    onClick={handleSaveToggle}
                    disabled={isLoading}
                    className="flex items-center gap-2"
                  >
                    <Bookmark
                      className={cn(
                        "w-5 h-5",
                        isSaved ? "fill-current" : "fill-none"
                      )}
                    />
                    {isSaved ? 'Saved' : 'Save'}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex items-center gap-2"
                    onClick={async () => {
                      if (navigator.share) {
                        try {
                          await navigator.share({
                            title: title || 'Check out this post',
                            text: description || `Interesting post: ${title}`,
                            url: postUrl,
                          });
                        } catch (err) {
                          if (err instanceof Error && err.name !== 'AbortError') {
                              console.error("Share failed:", err);
                              toast.error("Could not share the post.");
                          }
                        }
                      } else {
                        try {
                          await navigator.clipboard.writeText(postUrl);
                          toast.success("Link copied to clipboard!");
                        } catch (err) {
                          console.error("Failed to copy link:", err);
                          toast.error("Could not copy link to clipboard.");
                        }
                      }
                    }}
                  >
                    <Share2 className="h-5 w-5" />
                    Share
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={cn(
          "lg:hidden fixed bottom-0 left-0 right-0 z-50 pointer-events-none p-4",
          "safe-area-bottom pb-[calc(1rem+env(safe-area-inset-bottom))]"
        )}>
          <div className={cn(
            "mx-auto max-w-fit pointer-events-auto",
          )}>
            <ExpandableTabs
              tabs={navigationTabs}
              activeColor="text-primary"
              activeTab={mobileTabIndex}
              onChange={(index) => {
                if (index !== null) {
                  // Remove immediate setMobileTabIndex here, scrollToSection will handle it for scrollable tabs
                  // setMobileTabIndex(index); 

                  const tab = navigationTabs[index];
                  if (tab && 'title' in tab && tab.type !== 'separator') {
                    const title = tab.title.toLowerCase();
                    let sectionIdToScrollTo: string | undefined;
                    switch (title) {
                      case 'overview':
                        sectionIdToScrollTo = 'overview';
                        break;
                      case 'updates':
                        sectionIdToScrollTo = 'updates';
                        break;
                      case 'team':
                        sectionIdToScrollTo = 'team';
                        break;
                      case 'comments':
                        sectionIdToScrollTo = 'post-comments';
                        break;
                      case 'save':
                      case 'saved':
                        setMobileTabIndex(index); // For non-scrolling tabs, set index directly
                        if (!tab.onClick) { 
                          handleSaveToggle();
                        }
                        return; 
                    }

                    if (sectionIdToScrollTo) {
                      scrollToSection(sectionIdToScrollTo);
                    }
                  }
                }
              }}
            />
          </div>
        </div>

        <section className="pt-0">
          <div ref={overviewRef} className={cn(
            "container py-6",
            "lg:pb-12",
            "pb-24"
          )}>
            {project ? (
              <div className="mb-4 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <h1 className="text-4xl font-semibold leading-tight">{title}</h1>
                {project.address && <p className="text-lg text-muted-foreground">{project.address}</p>}
              </div>
            ) : (
              title && <h1 className="mb-4 text-3xl font-semibold">{title}</h1>
            )}

            <div className="flex lg:hidden gap-3 mb-8">
              <Button
                variant="outline"
                onClick={handleSaveToggle}
                disabled={isLoading}
                className="flex flex-1 items-center gap-2"
              >
                <Bookmark
                  className={cn(
                    "w-5 h-5",
                    isSaved ? "fill-current" : "fill-none"
                  )}
                />
                {isSaved ? 'Saved' : 'Save'}
              </Button>
              <Button
                variant="outline"
                className="flex flex-1 items-center gap-2"
                onClick={async () => {
                  if (navigator.share) {
                    try {
                      await navigator.share({
                        title: title || 'Check out this post',
                        text: description || `Interesting post: ${title}`,
                        url: postUrl,
                      });
                    } catch (err) {
                      if (err instanceof Error && err.name !== 'AbortError') {
                          console.error("Share failed:", err);
                          toast.error("Could not share the post.");
                      }
                    }
                  } else {
                    try {
                      await navigator.clipboard.writeText(postUrl);
                      toast.success("Link copied to clipboard!");
                    } catch (err) {
                      console.error("Failed to copy link:", err);
                      toast.error("Could not copy link to clipboard.");
                    }
                  }
                }}
              >
                <Share2 className="h-5 w-5" />
                Share
              </Button>
            </div>
            
            

            {currentProject && images && images?.length > 0 ? (
              <PostHeroComponent 
                project={currentProject}
                projectCompanies={projectCompanies}
                userCompanies={userCompanies}
                images={images}
                onShowProjectBidDialog={() => setShowProjectBidDialog(true)}
              />
            ) : (
              images && images?.length > 0 && <ImageGallery images={images} />
            )}

            <div className="flex flex-col lg:flex-row gap-8 xl:gap-12">
              <article className="w-full max-w-none lg:max-w-3xl">
                {isEditor && (
                  <EditorControls
                      post={post}
                      project={project}
                      user={user}
                      citySlug={citySlug}
                      neighborhoodSlug={neighborhoodSlug}
                      initialProjectCompanies={projectCompanies}
                      onUpdate={handleEditorUpdate}
                  />
                )}

                <div className="mb-6">

                  {isBodyLoading && (
                    <div className="min-h-[300px] w-full bg-zinc-100 dark:bg-zinc-800 animate-pulse rounded-md mb-6"></div>
                  )}
                  {!isBodyLoading && fetchedBody && !accessDenied && (
                    <>
                      <PostHero
                        created_at={post.created_at}
                        updated_at={post.updated_at}
                        publishedAt={post.published_at}
                      />
                      <div className="relative">
                        {/* Content container with smooth height animation */}
                        <div 
                          className={cn(
                            "overflow-hidden transition-all duration-300 ease-out",
                            "transform-gpu" // Enable hardware acceleration
                          )}
                          style={{
                            height: isContentExpanded ? `${contentHeight}px` : '10rem'
                          }}
                        >
                          <div 
                            ref={contentRef}
                            className={cn(
                              "prose prose-lg max-w-none text-zinc-900 dark:text-zinc-100",
                              "prose-headings:text-zinc-900 dark:prose-headings:text-zinc-100",
                              "prose-p:text-zinc-800 dark:prose-p:text-zinc-200",
                              "prose-a:text-sky-600 dark:prose-a:text-sky-400",
                              "prose-strong:text-zinc-900 dark:prose-strong:text-zinc-100"
                            )}
                            style={{ 
                              whiteSpace: 'pre-wrap'
                            }}
                          >
                            {fetchedBody}
                          </div>
                        </div>
                        
                        {/* Fade overlay */}
                        <div
                          className={cn(
                            "absolute bottom-0 left-0 right-0 transition-all duration-200 ease-out",
                            isContentExpanded ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0",
                            isContentExpanded && "pointer-events-none"
                          )}
                        >
                          {/* Main fade gradient */}
                          <div className="h-24 bg-linear-to-t from-background via-background/60 to-transparent" />
                          
                          {/* Additional blur effect for smoother transition */}
                          <div className="absolute top-0 left-0 right-0 h-16 bg-linear-to-t from-background/98 via-background/90 to-background/20 backdrop-blur-[1px]" />
                        </div>
                        
                        <div className="flex justify-center mt-6">
                          <Button
                            variant="outline"
                            onClick={() => setIsContentExpanded(!isContentExpanded)}
                            className={cn(
                              "group relative overflow-hidden px-8 py-3 rounded-full",
                              "bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm",
                              "border-2 border-zinc-200 dark:border-zinc-700",
                              "hover:border-primary dark:hover:border-primary",
                              "hover:bg-primary/5 dark:hover:bg-primary/10",
                              "transition-all duration-300 ease-in-out",
                              "shadow-lg hover:shadow-xl",
                              "transform hover:scale-105 active:scale-95"
                            )}
                          >
                            <div className="flex items-center gap-2 relative z-10">
                              <span className="font-medium">
                                {isContentExpanded ? 'Show Less' : 'Show More'}
                              </span>
                              <div className={cn(
                                "transition-transform duration-300 ease-in-out",
                                isContentExpanded ? "rotate-180" : "rotate-0"
                              )}>
                                <ChevronDown className="w-4 h-4" />
                              </div>
                            </div>
                            
                            {/* Animated background effect */}
                            <div className="absolute inset-0 bg-linear-to-r from-primary/10 via-primary/5 to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            
                            {/* Shine effect */}
                            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-linear-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 ease-in-out" />
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                  {!isBodyLoading && accessDenied && (
                    <GradientPaywall />
                  )}
                </div>

                <div className="lg:hidden mb-8 space-y-6">
                   {SidebarContent}
                </div>

                {!isBodyLoading && fetchedBody && !accessDenied && currentProject && (
                  <div ref={updatesRef} id="project-updates" className="mb-16">
                    {/* Elegant Section Header */}
                    <div className="mb-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="relative">
                          <div className="w-9 h-9 rounded-xl bg-linear-to-br from-blue-50 to-indigo-100 dark:from-blue-950/50 dark:to-indigo-900/50 flex items-center justify-center border border-blue-200/50 dark:border-blue-800/50">
                            <History className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div className="absolute -inset-1 bg-linear-to-br from-blue-500/20 to-indigo-500/20 rounded-2xl blur-sm opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        </div>
                        <div>
                        <h2 className="text-2xl font-bold bg-linear-to-r from-zinc-900 to-zinc-700 dark:from-zinc-100 dark:to-zinc-300 bg-clip-text text-transparent">
                          Project Updates
                        </h2>
                        </div>
                      </div>
                    </div>
                    
                    {/* Premium Timeline Container */}
                    <div className="relative mt-2">
                      {/* Sophisticated Timeline Spine */}
                      <div className="absolute left-[17.5px] top-0 bottom-0 w-px bg-linear-to-b from-blue-400/40 via-indigo-500/60 to-transparent dark:from-blue-500/30 dark:via-indigo-400/40"></div>
                      
                      <div className="space-y-0">
{(() => {
                          // Create combined timeline with articles and project changes
                          const articles = [post, ...relatedPosts].map(p => ({
                            type: 'article' as const,
                            data: p,
                            date: new Date(p.published_at || p.created_at || '')
                          }));

                          const changes = projectDiffs.map(diff => ({
                            type: 'change' as const,
                            data: diff,
                            date: new Date(diff.update_date || '')
                          }));

                          const timelineItems = [...articles, ...changes]
                            .sort((a, b) => b.date.getTime() - a.date.getTime());
                          
                          // Group consecutive project changes
                          const groupedItems: Array<{
                            type: 'article' | 'change_group';
                            data: any;
                            date: Date;
                            changes?: any[];
                          }> = [];
                          
                          let i = 0;
                          while (i < timelineItems.length) {
                            const currentItem = timelineItems[i];
                            
                            if (currentItem.type === 'article') {
                              groupedItems.push(currentItem as any);
                              i++;
                            } else {
                              // Group consecutive changes
                              const changeGroup = [currentItem];
                              let j = i + 1;
                              while (j < timelineItems.length && timelineItems[j].type === 'change') {
                                changeGroup.push(timelineItems[j] as any);
                                j++;
                              }
                              
                              groupedItems.push({
                                type: 'change_group',
                                data: changeGroup[0].data,
                                date: changeGroup[0].date,
                                changes: changeGroup.map(c => c.data)
                              });
                              i = j;
                            }
                          }
                          
                          return groupedItems.map((item, index) => {
                            if (item.type === 'article') {
                              const timelinePost = item.data;
                              const isCurrentPost = timelinePost.id === post.id;
                              const linkHref = getPostUrl(timelinePost.city_name, timelinePost.neighborhood_name, timelinePost.slug);
                              
                              return (
                                <div key={`article-${timelinePost.id}`} className="relative group">
                                  {/* Timeline Node - ALIGNED WITH SPINE */}
                                  <div className="absolute left-[18px] top-6 z-20 transform -translate-x-1/2">
                                    <div className={cn(
                                      "w-4 h-4 rounded-full border-3 transition-all duration-500 ease-out transform",
                                      isCurrentPost
                                        ? "bg-blue-500 border-white dark:border-zinc-900 shadow-lg shadow-blue-500/40 scale-110"
                                        : "bg-white dark:bg-zinc-900 border-blue-300 dark:border-blue-600 group-hover:border-blue-400 dark:group-hover:border-blue-500 group-hover:scale-105"
                                    )}>
                                      {isCurrentPost && (
                                        <>
                                          <div className="absolute inset-0 rounded-full bg-blue-500 animate-ping opacity-20"></div>
                                          <div className="absolute -inset-1 rounded-full bg-blue-400 animate-pulse opacity-10"></div>
                                        </>
                                      )}
                                    </div>
                                  </div>

                                  {/* Content Container */}
                                  <div className="ml-[50px] pb-4">
                                    {isCurrentPost ? (
                                      <div className={cn(
                                        "relative bg-white dark:bg-zinc-900 rounded-2xl border border-blue-200/50 dark:border-blue-800/50",
                                        "shadow-lg shadow-blue-500/5 dark:shadow-blue-500/10",
                                        "ring-1 ring-blue-500/10 dark:ring-blue-400/20",
                                        "overflow-hidden transition-all duration-300"
                                      )}>
                                        {/* Current Post Glow Effect */}
                                        <div className="absolute inset-0 bg-linear-to-br from-blue-50/50 to-indigo-50/30 dark:from-blue-950/30 dark:to-indigo-950/20"></div>
                                        
                                        {/* Current Post Indicator - MUCH MORE VISIBLE */}
                                        {/* <div className="absolute top-4 -left-[75px] transform -rotate-90 origin-center z-40 pointer-events-none">
                                          <span className="text-xs font-bold text-white bg-blue-600 dark:bg-blue-500 px-3 py-1.5 rounded-md shadow-lg border-2 border-white dark:border-zinc-900 uppercase tracking-wide">
                                            SELECTED
                                          </span>
                                        </div> */}

                                        <div className="relative p-4">
                                          <div className="flex flex-col sm:flex-row gap-4">
                                            {(timelinePost.bannerImage || timelinePost.images?.[0]) && (
                                              <div className="relative w-full h-48 sm:w-48 sm:h-32 rounded-lg overflow-hidden shrink-0 shadow-md">
                                                <Image
                                                  src={getImageUrl(timelinePost.bannerImage || timelinePost.images?.[0]) || ''}
                                                  alt={timelinePost.title || 'Development project update'}
                                                  fill
                                                  className="object-cover"
                                                />
                                                <div className="absolute inset-0 bg-linear-to-t from-black/10 via-transparent to-transparent"></div>
                                              </div>
                                            )}
                                            
                                            <div className="flex-1">
                                              <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2 leading-tight">
                                                {timelinePost.title}
                                              </h3>
                                              {timelinePost.subtitle && (
                                                <p className="text-zinc-600 dark:text-zinc-300 mb-3 leading-relaxed">
                                                  {timelinePost.subtitle}
                                                </p>
                                              )}
                                              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-medium">
                                                <CalendarClock className="w-4 h-4" />
                                                <time className="text-sm">
                                                  {item.date.toLocaleDateString('en-US', {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric'
                                                  })}
                                                </time>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    ) : (
                                      <Link href={linkHref} className="block group/card">
                                        <div className={cn(
                                          "relative bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800",
                                          "shadow-sm hover:shadow-md hover:shadow-zinc-200/10 dark:hover:shadow-zinc-900/20",
                                          "hover:border-blue-300 dark:hover:border-blue-700",
                                          "overflow-hidden transition-all duration-200 ease-out"
                                        )}>
                                          {/* Hover Gradient Overlay */}
                                          <div className="absolute inset-0 bg-linear-to-br from-blue-50/0 to-indigo-50/0 group-hover/card:from-blue-50/20 group-hover/card:to-indigo-50/10 dark:group-hover/card:from-blue-950/10 dark:group-hover/card:to-indigo-950/5 transition-all duration-200"></div>
                                          
                                          <div className="relative p-4">
                                            <div className="flex flex-col sm:flex-row gap-3">
                                              {(timelinePost.bannerImage || timelinePost.images?.[0]) && (
                                                <div className="relative w-full h-48 sm:w-48 sm:h-32 rounded-lg overflow-hidden shrink-0 shadow-sm group-hover/card:shadow-md transition-shadow duration-200">
                                                  <Image
                                                    src={getImageUrl(timelinePost.bannerImage || timelinePost.images?.[0]) || ''}
                                                    alt={timelinePost.title || 'Development project update'}
                                                    fill
                                                    className="object-cover transition-transform duration-200 group-hover/card:scale-105"
                                                  />
                                                </div>
                                              )}
                                              
                                              <div className="flex-1">
                                                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-1 group-hover/card:text-blue-700 dark:group-hover/card:text-blue-300 transition-colors duration-200">
                                                  {timelinePost.title}
                                                </h3>
                                                {timelinePost.subtitle && (
                                                  <p className="text-zinc-600 dark:text-zinc-400 mb-2 text-sm leading-relaxed">
                                                    {timelinePost.subtitle}
                                                  </p>
                                                )}
                                                <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-500 text-sm">
                                                  <CalendarClock className="w-3.5 h-3.5" />
                                                  <time>
                                                    {item.date.toLocaleDateString('en-US', {
                                                      year: 'numeric',
                                                      month: 'long',
                                                      day: 'numeric'
                                                    })}
                                                  </time>
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      </Link>
                                    )}
                                  </div>
                                </div>
                              );
                            } else {
                              // Project change group - COMPACT & SUBTLE
                              const changes = item.changes || [];
                              
                              return (
                                                                 <div key={`changes-${changes[0]?.update_id || Math.random()}`} className="relative group">
                                  {/* Timeline Node - ALIGNED WITH SPINE */}
                                  <div className="absolute left-[18px] top-4 z-20 transform -translate-x-1/2">
                                    <div className="w-4 h-4 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 border-2 border-white dark:border-zinc-900 shadow-md shadow-purple-500/20 transition-all duration-300 group-hover:scale-105">
                                      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 animate-pulse opacity-10"></div>
                                    </div>
                                  </div>

                                  {/* Content Container - COMPACT */}
                                  <div className="ml-[50px] pb-3">
                                    <div className={cn(
                                      "relative bg-gradient-to-br from-purple-50/50 to-indigo-50/30 dark:from-purple-950/20 dark:to-indigo-950/15",
                                      "rounded-xl border border-purple-200/30 dark:border-purple-800/20",
                                      "shadow-sm",
                                      "overflow-hidden transition-all duration-300"
                                    )}>
                                      {/* Subtle Badge */}
                                      <div className="absolute top-2 right-2 z-10">
                                        <div className="flex items-center gap-1 px-2 py-0.5 bg-purple-500/90 text-white rounded-full text-xs font-medium">
                                          <History className="w-3 h-3" />
                                          {changes.length} Change{changes.length !== 1 ? 's' : ''}
                                        </div>
                                      </div>

                                      <div className="relative p-3">
                                        <div className="flex items-start gap-2">
                                          {/* <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/40 dark:to-indigo-900/40 flex items-center justify-center">
                                            <History className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                          </div> */}
                                          
                                          <div className="flex-1 min-w-0">
                                            <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                                              Project Updated
                                            </h4>
                                            
                                                                                                                                      {/* Changes list - Two columns with better spacing */}
                                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                                               {changes.map((change: any, idx) => (
                                                 <div key={idx} className="flex flex-col space-y-1">
                                                   <span className="text-zinc-600 dark:text-zinc-400 font-medium text-sm">
                                                     {formatFieldName(change.field)}
                                                   </span>
                                                   <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-500">
                                                     <span className="line-through text-sm">
                                                       {formatFieldValue(change.field, change.old_value)}
                                                     </span>
                                                     <span className="text-sm">→</span>
                                                     <span className="text-zinc-700 dark:text-zinc-300 font-medium text-sm">
                                                       {formatFieldValue(change.field, change.new_value)}
                                                     </span>
                                                   </div>
                                                 </div>
                                               ))}
                                             </div>
                                            
                                            <div className="flex items-center gap-1 text-purple-600 dark:text-purple-400 font-medium mt-2">
                                              <CalendarClock className="w-3 h-3" />
                                              <time className="text-xs">
                                                {item.date.toLocaleDateString('en-US', {
                                                  year: 'numeric',
                                                  month: 'short',
                                                  day: 'numeric'
                                                })}
                                              </time>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            }
                          });
                        })()}
                        
                        {/* Future Timeline End */}
                        <div className="relative">
                          <div className="absolute left-[18px] top-3 z-20 transform -translate-x-1/2">
                            <div className="w-4 h-4 rounded-full border-2 border-dashed border-zinc-300 dark:border-zinc-600 bg-zinc-100 dark:bg-zinc-800">
                              <div className="absolute inset-0 rounded-full bg-zinc-400 dark:bg-zinc-500 animate-pulse opacity-20"></div>
                            </div>
                          </div>

                          <div className="ml-[50px] pb-0">
                            <div className="bg-linear-to-br from-zinc-50 to-zinc-100/50 dark:from-zinc-800/30 dark:to-zinc-700/20 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-700 p-4">
                              <div className="flex items-center gap-3">
                                <div className="text-lg opacity-60">🔮</div>
                                <div>
                                  <h4 className="font-medium text-zinc-700 dark:text-zinc-300 text-sm">
                                    Future Updates
                                  </h4>
                                  <p className="text-xs text-zinc-500 dark:text-zinc-500">
                                    Upcoming milestones and project updates
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {!isBodyLoading && fetchedBody && !accessDenied && currentProject && (
                  <div ref={teamRef} id="project-team" className="mb-12">
                    <h2 className="text-2xl font-semibold mb-6 flex items-center">
                      <Users2 className="w-6 h-6 mr-2 text-primary" />
                      Project Team
                    </h2>

                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 overflow-x-hidden">
                      {projectCompanies && projectCompanies.length > 0 &&
                        <ProjectVendors project={currentProject} projectCompanies={projectCompanies} userCompanies={userCompanies} />
                      }
                      <div className={cn(
                        "p-1",
                        projectCompanies && projectCompanies.length > 0 ? "pt-4 mt-4 border-t border-zinc-200 dark:border-zinc-800" : "pt-1"
                      )}>
                        <div className="mt-4 bg-linear-to-br from-blue-50 to-blue-50/50 dark:from-blue-900/20 dark:to-blue-900/10 border border-blue-100 dark:border-blue-800/50 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 sm:space-x-4">
                          <div className="grow">
                            <h4 className="font-medium">Join the Project Team</h4>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                              Are you working on this project? Add your company to increase visibility.
                            </p>
                          </div>
                          <Button
                            onClick={() => {
                              if (!user) {
                                setShowAuthModal(true);
                                return;
                              }
                              if (currentProject?.slug) {
                                 router.push(`/company?project=${currentProject.slug}`);
                              } else {
                                console.error("Cannot navigate: Project slug is missing.");
                                toast.error("Could not determine the project to add your company to.")
                              }
                            }}
                            className="bg-linear-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground w-full sm:w-auto shrink-0"
                          >
                            <PlusCircle className="w-4 h-4 mr-2" />
                            Add Your Company
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {!isBodyLoading && fetchedBody && !accessDenied && (
                  <div ref={commentsRef} id="post-comments" className="mb-12 min-h-[700px]">
                    <Comments
                      postId={post?.id}
                      initialComments={comments}
                      onCommentCountChange={setCommentCount}
                    />
                  </div>
                )}

                {isBodyLoading && (
                  <div className="min-h-[600px] w-full bg-zinc-100 dark:bg-zinc-800 animate-pulse rounded-md mb-12"></div>
                )}
              </article>

              <div className="hidden lg:block w-full lg:w-[360px] lg:sticky lg:top-20 lg:self-start space-y-6 lg:shrink-0">
                {SidebarContent}
              </div>
            </div>
          </div>
        </section>

        <AuthModal
          open={showAuthModal}
          onOpenChange={setShowAuthModal}
          trigger={<div />}
          returnTo={typeof window !== 'undefined' ? window.location.pathname : getPostUrl(post?.city_name, post?.neighborhood_name, post?.slug)}
        />

        <PricingDialog
          isOpen={showPricingDialog}
          onOpenChange={setShowPricingDialog}
        />

      </div>
    </>
  )
}

// Export the memoized component
export default React.memo(PostLayoutComponent);