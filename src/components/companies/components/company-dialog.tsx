'use client';

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Building2, MapPin, Star,
  MessageSquare, ChevronDown,
  SquarePen, ArrowRight, Handshake,
  Award,
  Info,
  BadgeCheck,
  Loader2,
  X,
  BadgeHelp,
  Clock,
  User,
  ArrowLeft,
  Link as LinkIcon,
  Edit,
  Share2,
  Briefcase,
  MessagesSquare
} from "lucide-react";
import Image from "next/image";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { Company as SanityCompany } from '@/components/companies';
import { fetchProjectImages } from '@/components/projects';
import { fetchCompanyProjects } from '@/components/companies';
import { ReviewModal } from './review-modal';
import { ReviewsList } from './reviews-list';
import { BookmarkButton } from "@/components/ui/bookmark-button";
import { useAuth } from "@/lib/providers/auth-context";
import Link from "next/link";
import { AuthModal } from '@/components/ui/auth-modal';
import { ClaimCompanyFlow } from "./claim-company-flow";
import { useRouter, usePathname } from "next/navigation";

import { navigateToTab } from '@/lib/utils';
import { Separator } from "@/components/ui/separator";
import { toast } from 'sonner';
import type { Participant } from '@/components/messages/types';
import { startOrNavigateToMessageThread } from '@/components/messages/utils';
import { type UserCompany } from '@/hooks/use-user-companies';
import { EditDescription } from './edit-description';
import { EditProjects } from './edit-projects';
import { PricingDialog } from "@/components/ui/pricing-dialog";
import { useSubscription } from "@/lib/providers/subscription-context";
import { formatCategoriesForDisplay, getPrimaryCategory } from "../utils";

export interface Company extends SanityCompany {
  uploaded_logo_url?: string | null;
  activeProjects?: Array<{
    name: string;
    slug: string;
    city?: string;
    neighborhood?: string;
    status: string;
  }>;
  completedProjects?: Array<{
    name: string;
    slug: string;
    city?: string;
    neighborhood?: string;
    status: string;
    completedDate?: string;
  }>;
  source?: 'sanity' | 'supabase';
}

interface CompanyDialogProps {
  company: Company;
  onClose: () => void;
  initialShowReview?: boolean;
  initialShowClaim?: boolean;
  initialRating?: number | null;
  onBookmarkUpdate?: () => void;
  pendingClaimStatus?: boolean;
  refreshCompany?: (companyId: string) => void;
  userCompanies?: UserCompany[];
}

export function CompanyDialog({ 
  company: initialCompany,
  onClose,
  initialShowReview = false,
  initialShowClaim = false,
  initialRating = null,
  onBookmarkUpdate,
  pendingClaimStatus,
  refreshCompany,
  userCompanies = []
}: CompanyDialogProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [showIdentityOptions, setShowIdentityOptions] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(initialShowReview);
  const [showClaimModal, setShowClaimModal] = useState(initialShowClaim);
  const [reviews, setReviews] = useState<any[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [hoverRatings, setHoverRatings] = useState<Map<string, number>>(new Map());
  const [currentRating, setCurrentRating] = useState<number | null>(initialRating);
  const { user, supabase } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [hasPendingClaim, setHasPendingClaim] = useState(pendingClaimStatus || false);
  const router = useRouter();
  const pathname = usePathname();
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [companyWithProjects, setCompanyWithProjects] = useState<Company>(initialCompany);
  const [showPricingDialog, setShowPricingDialog] = useState(false);
  const { hasMembershipAccess } = useSubscription();

  // Check if the current user manages this company
  const [isUserManager, setIsUserManager] = useState(false);

  // Add state for user's existing review
  const [userReview, setUserReview] = useState<any>(null);
  // Add isUpdatingRating state
  const [isUpdatingRating, setIsUpdatingRating] = useState(false);

  // Add state for project images
  const [projectImagesMap, setProjectImagesMap] = useState<Map<string, any>>(new Map());

  // State for Edit Description Dialog
  const [isEditDescriptionOpen, setIsEditDescriptionOpen] = useState(false);

  // State for Edit Projects Dialog
  const [isEditProjectsOpen, setIsEditProjectsOpen] = useState(false);

  // --- FIX: Declare state for description ---
  const [fetchedDescription, setFetchedDescription] = useState<string | undefined | null>(initialCompany.description);
  const [isLoadingDescription, setIsLoadingDescription] = useState(true);
  // --- End FIX ---

  // --- Determine if user is a manager ---
  useEffect(() => {
    if (user?.id && userCompanies?.length > 0 && initialCompany.company_id) {
      // Find the specific management entry for this company
      const managementEntry = userCompanies.find(uc => uc.company_id === initialCompany.company_id);
      // Check if the entry exists AND if its status indicates approval/verification
      // Assuming 'approved' is the status for a verified manager relationship.
      // Adjust 'approved' if your actual status value is different (e.g., 'verified').
      const isManager = !!managementEntry && managementEntry.status === 'approved'; 
      setIsUserManager(isManager);
    } else {
      setIsUserManager(false);
    }
    // Update pending claim status based on props here too
    setHasPendingClaim(pendingClaimStatus || false);
  }, [user?.id, userCompanies, initialCompany.company_id, pendingClaimStatus]);
  // --- End Determine if user is a manager ---

  // --- Fetch ONLY description on mount/prop change ---
  useEffect(() => {
    const fetchCompanyDescription = async () => {
      // Validate company_id before attempting to fetch
      if (!initialCompany?.company_id || !supabase) {
        console.warn("CompanyDialog: No company_id provided in initial props.");
        setFetchedDescription(initialCompany.description); // Use prop description
        setIsLoadingDescription(false);
        return;
      }

      // Validate that company_id is a proper UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(initialCompany.company_id)) {
        console.warn(`CompanyDialog: Invalid company_id format: ${initialCompany.company_id}. Skipping description fetch.`);
        setFetchedDescription(initialCompany.description); // Use prop description
        setIsLoadingDescription(false);
        return;
      }

      setIsLoadingDescription(true);
      try {
        const { data, error } = await supabase
          .from('companies_view') // Or 'companies' table
          .select('id, description')
          .eq('id', initialCompany.company_id)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
             console.warn(`Description not found for company ID: ${initialCompany.company_id}. Using initial prop description.`);
             setFetchedDescription(initialCompany.description); // Fallback to prop description
          } else {
            throw error;
          }
        } else if (data) {
           setFetchedDescription(data.description); // Update state with fetched description
        } else {
           // Row found but description is null/undefined in DB
           setFetchedDescription(null); // Explicitly set to null if DB has null
        }

      } catch (error: any) {
        setFetchedDescription(initialCompany.description); // Fallback on error
      } finally {
        setIsLoadingDescription(false);
      }
    };

    fetchCompanyDescription();
  }, [initialCompany?.company_id]); // Depend only on the ID
  // --- End Fetch ---

   // --- Keep Project Loading Effect (using companyWithProjects state) ---
   // This remains unchanged for now, fetching projects based on initialCompany data
   useEffect(() => {
    const fetchProjectsAndImages = async () => {
      if (!initialCompany.company_id || showReviewModal) return; // Use initialCompany here

      try {
        setIsLoadingProjects(true);

        // Use initialCompany for existing projects check
        const hasActiveProjects = initialCompany.activeProjects && initialCompany.activeProjects.length > 0;
        const hasCompletedProjects = initialCompany.completedProjects && initialCompany.completedProjects.length > 0;

        let fetchedProjectsResult;

        if (hasActiveProjects && hasCompletedProjects) {
          fetchedProjectsResult = {
            activeProjects: initialCompany.activeProjects,
            completedProjects: initialCompany.completedProjects
          };
          setCompanyWithProjects({ // Update companyWithProjects state
            ...initialCompany,
            projectCount: (initialCompany.activeProjects?.length || 0) + (initialCompany.completedProjects?.length || 0)
          });
        } else {
          fetchedProjectsResult = await fetchCompanyProjects(initialCompany.company_id); // Use initialCompany ID
          setCompanyWithProjects({ // Update companyWithProjects state
            ...initialCompany,
            activeProjects: fetchedProjectsResult.activeProjects,
            completedProjects: fetchedProjectsResult.completedProjects,
            projectCount: (fetchedProjectsResult.activeProjects?.length || 0) + (fetchedProjectsResult.completedProjects?.length || 0)
          });
        }

        const allProjects = [
          ...(fetchedProjectsResult.activeProjects || []),
          ...(fetchedProjectsResult.completedProjects || [])
        ];
        const allSlugs = allProjects.map(p => p.slug).filter(Boolean);

        if (allSlugs.length > 0) {
          try {
            const imagesMap = await fetchProjectImages(allSlugs);
            setProjectImagesMap(imagesMap);
          } catch (imgError) {
            console.error("Error fetching project images:", imgError);
            setProjectImagesMap(new Map());
          }
        } else {
          setProjectImagesMap(new Map());
        }

      } catch (error) {
        console.error('Error in fetchProjectsAndImages:', error);
        setCompanyWithProjects({ // Reset companyWithProjects on error using initialCompany
          ...initialCompany,
          activeProjects: initialCompany.activeProjects || [],
          completedProjects: initialCompany.completedProjects || [],
          projectCount: (initialCompany.activeProjects?.length || 0) + (initialCompany.completedProjects?.length || 0)
        });
        setProjectImagesMap(new Map());
      } finally {
        setIsLoadingProjects(false);
      }
    };

    fetchProjectsAndImages();
  }, [initialCompany?.company_id, initialCompany.activeProjects, initialCompany.completedProjects, showReviewModal]); // Depend on relevant initialCompany fields
   // --- End Project Loading Effect ---

  // Initialize company data and load reviews immediately
  useEffect(() => {
    if (!isLoadingReviews) {
      setCompanyWithProjects(initialCompany);
      
      // Small delay to prevent rapid-fire calls
      const timer = setTimeout(() => {
        loadReviews();
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [initialCompany.company_id, user?.id]);

  // Load reviews when tab changes to reviews (for UI display)
  useEffect(() => {
    if (activeTab === 'reviews') {
      loadReviews();
    }
  }, [activeTab]);

  // Add useEffect to check for pending claims only if status wasn't provided
  useEffect(() => {
    async function checkPendingClaim() {
      if (pendingClaimStatus !== undefined || !user?.id || !initialCompany.company_id || !supabase) return;
      
      type ClaimResult = {
        status: string;
        companies: {
          id: string;
        };
      };

      // Get all pending claims for this user
      const { data: claims } = await supabase
        .from('company_approvals')
        .select(`
          status,
          companies (
            id
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .returns<ClaimResult[]>();

      if (claims) {
        // Check if any of the claims match this company
        const isPending = claims.some((claim: ClaimResult) => claim.companies.id === initialCompany.company_id);
        setHasPendingClaim(isPending);
      }
    }

    checkPendingClaim();
  }, [user?.id, initialCompany.company_id, pendingClaimStatus]);

  // Update currentRating when initialRating changes
  useEffect(() => {
    if (initialRating) {
      setCurrentRating(initialRating);
    }
  }, [initialRating]);

  const loadReviews = async () => {
    try {
      setIsLoadingReviews(true);

      // Validate company_id before attempting to fetch reviews
      if (!initialCompany?.company_id) {
        console.warn("CompanyDialog: No company_id provided for reviews.");
        setReviews([]);
        setUserReview(null);
        setIsLoadingReviews(false);
        return;
      }

      // Validate that company_id is a proper UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(initialCompany.company_id)) {
        console.warn(`CompanyDialog: Invalid company_id format for reviews: ${initialCompany.company_id}. Skipping reviews fetch.`);
        setReviews([]);
        setUserReview(null);
        setIsLoadingReviews(false);
        return;
      }

      // Check if supabase client is available
      if (!supabase) {
        console.warn("CompanyDialog: Supabase client not available for reviews.");
        setReviews([]);
        setUserReview(null);
        setIsLoadingReviews(false);
        return;
      }

      // Fetch reviews using client-side Supabase with profile join
      const { data: reviews, error: reviewsError } = await supabase
        .from('company_reviews')
        .select(`
          id,
          rating,
          content,
          created_at,
          user_id,
          profiles(
            id,
            email,
            full_name,
            avatar_url,
            clerk_id
          )
        `)
        .eq('company_id', initialCompany.company_id)
        .order('created_at', { ascending: false });

      if (reviewsError) {
        console.error(`Error fetching reviews for company ${initialCompany.company_id}:`, reviewsError);
        setReviews([]);
        setUserReview(null);
        setIsLoadingReviews(false);
        return;
      }

      if (!reviews || reviews.length === 0) {
        setReviews([]);
        setUserReview(null);
        setCompanyWithProjects(prev => ({
          ...prev,
          rating: null,
          reviewCount: 0
        }));
        setIsLoadingReviews(false);
        return;
      }

      // Transform the data to match the expected format
      const reviewsWithUsers = reviews
        .map(review => {
          // Handle both array and single object format for profiles
          const profile = Array.isArray(review.profiles) ? review.profiles[0] : review.profiles;
          
          if (!profile) {
            console.warn(`No profile found for review ${review.id}`);
            return null;
          }

          return {
            id: review.id,
            rating: review.rating,
            content: review.content,
            created_at: review.created_at,
            user: {
              id: review.user_id,
              email: profile.email || 'Unknown',
              user_metadata: {
                full_name: profile.full_name,
                avatar_url: profile.avatar_url
              }
            }
          };
        })
        .filter((review): review is NonNullable<typeof review> => review !== null);

      setReviews(reviewsWithUsers || []);
      
      // Find and set the user's review if it exists
      if (user) {
        const existingReview = reviewsWithUsers.find((review) => review.user.id === user.id);
        setUserReview(existingReview || null);
      }

      // Calculate and update the company rating
      if (reviewsWithUsers && reviewsWithUsers.length > 0) {
        const sum = reviewsWithUsers.reduce((acc, review) => acc + review.rating, 0);
        const averageRating = parseFloat((sum / reviewsWithUsers.length).toFixed(1));
        
        setCompanyWithProjects(prev => ({
          ...prev,
          rating: averageRating,
          reviewCount: reviewsWithUsers.length
        }));
      } else {
        // No reviews, make sure rating is null
        setCompanyWithProjects(prev => ({
          ...prev,
          rating: null,
          reviewCount: 0
        }));
      }
    } catch (error) {
      console.error('Error loading reviews:', error);
      setReviews([]);
      setUserReview(null);
    } finally {
      setIsLoadingReviews(false);
    }
  };

  const handleEditReview = (review: any) => {
    setUserReview(review);
    setCurrentRating(review.rating);
    setShowReviewModal(true);
  };

  const handleReviewSubmit = async (submittedRating: number, submittedContent: string) => {
    // Set updating state to true immediately
    setIsUpdatingRating(true);
    
    try {      
      // --- Optimistic Updates ---
      let calculatedAvgRating: number | null = null;
      let updatedReviewCount = companyWithProjects.reviewCount || 0;

      // Create a temporary updated reviews array for calculation
      let tempUpdatedReviews = [...reviews];
      const currentUserReviewIndex = user ? tempUpdatedReviews.findIndex(r => r.user.id === user.id) : -1;

      if (user && currentUserReviewIndex !== -1) {
        // Updating existing review
        tempUpdatedReviews[currentUserReviewIndex] = {
          ...tempUpdatedReviews[currentUserReviewIndex],
          rating: submittedRating,
          content: submittedContent,
        };
      } else if (user) {
        // Adding new review
        const newReview = {
          id: 'temp-' + Date.now(),
          rating: submittedRating,
          content: submittedContent,
          created_at: new Date().toISOString(),
          user: {
            id: user.id,
            email: user.email || '',
            user_metadata: {
              avatar_url: user.avatar_url || undefined,
              full_name: user.full_name || undefined
            }
          }
        };
        tempUpdatedReviews.unshift(newReview);
        updatedReviewCount++;
      }
      
      // Calculate average rating based on temporary updated reviews
      if (tempUpdatedReviews.length > 0) {
        const sum = tempUpdatedReviews.reduce((acc, review) => acc + review.rating, 0);
        calculatedAvgRating = parseFloat((sum / tempUpdatedReviews.length).toFixed(1));
      }

      // Apply optimistic updates to local state
      setReviews(tempUpdatedReviews); // Update reviews list optimistically
      setUserReview(user ? tempUpdatedReviews.find(r => r.user.id === user.id) || null : null); // Update user's specific review state

      setCompanyWithProjects(prev => ({
        ...prev,
        rating: calculatedAvgRating,
        reviewCount: updatedReviewCount
      }));
      
      // --- Background Refresh ---
      // Add small delay to ensure database has been updated
      setTimeout(async () => {
        // Refresh reviews data to get the actual updated content
        await loadReviews();
        
        // Call the refreshCompany prop to update the marketplace
        if (refreshCompany) {
          await refreshCompany(initialCompany.company_id);
        }
      }, 300); // Small delay to ensure database update completes
    } catch (error) {
      console.error('Error handling review submission:', error);
      // Potentially revert optimistic updates here if needed, or show error toast
    } finally {
      // Reset updating state regardless of success or error
      setIsUpdatingRating(false);
    }
  };

  const handleReviewDeleted = async () => {
    // Set updating state to true immediately
    setIsUpdatingRating(true);

    try {
      // --- Optimistic Updates ---
      let calculatedAvgRating: number | null = null;
      let updatedReviewCount = companyWithProjects.reviewCount || 0;
      let tempUpdatedReviews = [...reviews];

      if (user) {
        tempUpdatedReviews = tempUpdatedReviews.filter(r => r.user.id !== user.id);
        updatedReviewCount = Math.max(0, updatedReviewCount - 1);
      }

      // Calculate average rating based on temporary updated reviews
      if (tempUpdatedReviews.length > 0) {
        const sum = tempUpdatedReviews.reduce((acc, review) => acc + review.rating, 0);
        calculatedAvgRating = parseFloat((sum / tempUpdatedReviews.length).toFixed(1));
      } else {
        calculatedAvgRating = null; // No reviews left
      }
      
      // Apply optimistic updates to local state
      setUserReview(null); // Clear user's review
      setReviews(tempUpdatedReviews); // Update reviews list optimistically

      setCompanyWithProjects(prev => ({
        ...prev,
        rating: calculatedAvgRating,
        reviewCount: updatedReviewCount
      }));
      
      // --- Background Refresh ---
      // Add small delay to ensure database has been updated
      setTimeout(async () => {
        // Refresh reviews data to get the actual updated content
        await loadReviews();
        
        // Call the refreshCompany prop to update the marketplace
        if (refreshCompany) {
          await refreshCompany(initialCompany.company_id);
        }
      }, 300); // Small delay to ensure database update completes
    } catch (error) {
      console.error('Error handling review deletion:', error);
      // Potentially revert optimistic updates here if needed, or show error toast
    } finally {
      // Reset updating state regardless of success or error
      setIsUpdatingRating(false);
    }
  };

  // Helper function to calculate average rating based on current reviews
  const calcAverageRating = (excludeCurrentUser = false) => {
    if (!reviews || reviews.length === 0) return null;
    
    const filteredReviews = excludeCurrentUser && user
      ? reviews.filter(r => r.user.id !== user.id)
      : reviews;
      
    if (filteredReviews.length === 0) return null;
    
    const sum = filteredReviews.reduce((acc, review) => acc + review.rating, 0);
    return parseFloat((sum / filteredReviews.length).toFixed(1));
  };

  const handleClaimSubmit = () => {
    onClose(); // Close dialog after successful claim
  };

  const handleClaimButtonClick = () => {
    if (hasPendingClaim) {
      navigateToTab('company', router, pathname, { refresh: 'true' });
      onClose();
      return;
    }
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    setShowClaimModal(true);
  };

  const handleHelpfulClick = async (reviewId: string) => {
    try {
      const response = await fetch(`/api/reviews/${reviewId}/helpful`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to mark review as helpful');
      loadReviews(); // Reload reviews to update helpful count
    } catch (error) {
      console.error('Error marking review as helpful:', error);
    }
  };

  const handleReportClick = async (reviewId: string) => {
    try {
      const response = await fetch(`/api/reviews/${reviewId}/report`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to report review');
      // Show success message or handle as needed
    } catch (error) {
      console.error('Error reporting review:', error);
    }
  };

  // Update the reviews tab content
  const reviewsTabContent = (
    <TabsContent value="reviews" className="mt-0 space-y-6">
      {/* Add Review Button - Show only if user hasn't reviewed yet, and there are reviews */}
      {user && !userReview && !isLoadingReviews && reviews.length > 0 && (
        <div className="flex justify-end">
          <Button
            onClick={() => setShowReviewModal(true)}
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            <Star className="h-4 w-4 mr-0.5" />
            Write a Review
          </Button>
        </div>
      )}

      {isLoadingReviews ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-gray-500 dark:text-zinc-400" />
        </div>
      ) : reviews.length > 0 ? (
        <ReviewsList
          reviews={reviews}
          onReviewDeleted={handleReviewDeleted}
          onEditReview={handleEditReview}
        />
      ) : (
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-zinc-900 flex items-center justify-center">
            <Star className="h-8 w-8 text-gray-500 dark:text-zinc-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No Reviews Yet
          </h3>
          <p className="text-gray-500 dark:text-zinc-400 max-w-md mx-auto mb-4">
            Be the first to review this company and help others make informed decisions.
          </p>
          <Button
            onClick={() => {
              if (!user) {
                setShowAuthModal(true);
                return;
              }
              setShowReviewModal(true);
            }}
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            Write a Review
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}
    </TabsContent>
  );

  // Update the renderIdentityOptions function for message sending
  const renderIdentityOptions = (isMobile: boolean) => {
    if (!showIdentityOptions) return null;

    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={cn(
          isMobile 
            ? "absolute left-4 right-4 mt-2 bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800 shadow-lg z-100"
            : "absolute top-full left-0 mt-1 w-[280px] bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800 shadow-lg z-50"
        )}
      >
        <div className="p-3">
          <div className="mb-2 text-sm font-medium text-gray-500 dark:text-zinc-400">
            Send as:
          </div>
          <div className="space-y-1">
            <Button 
              variant="ghost" 
              className="w-full justify-start h-10 px-3 gap-3 hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-lg"
              onClick={() => {
                setShowIdentityOptions(false);
                handleCompanyContact();
              }}
            >
              <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center overflow-hidden">
                {user?.avatar_url ? (
                  <Image
                    src={user.avatar_url}
                    alt={user.full_name || user.email || 'Personal Profile'}
                    width={24}
                    height={24}
                    className="w-full h-full object-contain rounded-full"
                  />
                ) : (
                  <User className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                )}
              </div>
              <span>{user?.full_name || 'Personal Profile'}</span>
            </Button>
            
            <Separator className="my-2" />
            
            <div className="text-xs text-gray-500 dark:text-zinc-400 px-3 mb-1">
              {userCompanies.length === 1 ? 'Your Company' : 'Your Companies'}
            </div>
            
            {userCompanies.map(company => (
              <Button 
                key={company.id}
                variant="ghost" 
                className="w-full justify-start h-10 px-3 gap-3 hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-lg"
                onClick={() => {
                  setShowIdentityOptions(false);
                  handleCompanyContact(company.id);
                }}
              >
                <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center overflow-hidden">
                  {company.uploaded_logo_url ? (
                    <img
                      src={company.uploaded_logo_url}
                      alt={company.name}
                      className="w-full h-full object-contain rounded-xl"
                    />
                  ) : (
                    <Briefcase className="h-3.5 w-3.5 text-gray-600 dark:text-zinc-400" />
                  )}
                </div>
                <span className="truncate">{company.name}</span>
              </Button>
            ))}
          </div>
          
          <div className="mt-2 flex justify-end">
            <Button 
              variant="ghost" 
              size="sm"
              className="text-xs"
              onClick={() => {
                setShowIdentityOptions(false);
              }}
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
              Back
            </Button>
          </div>
        </div>
      </motion.div>
    );
  };

  const handleCompanyContact = async (asCompanyId?: string) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    if (!initialCompany.company_id) {
      toast.error("Cannot contact company: Missing company ID.");
      return;
    }

    // Determine the participant representing the initiating user/company
    let initiatingParticipant: Participant | null = null;
    if (asCompanyId) {
      console.log('Looking for company with ID:', asCompanyId);
      console.log('Available userCompanies:', userCompanies.map(uc => ({id: uc.id, name: uc.name})));
      const senderCompany = userCompanies.find(uc => uc.id === asCompanyId);
      if (senderCompany) {
        initiatingParticipant = {
            type: 'company',
            id: senderCompany.id,
            name: senderCompany.name,
            logo_url: senderCompany.uploaded_logo_url || senderCompany.logo_url
        };
      } else {
        toast.error(`Selected sending company not found. Looking for ID: ${asCompanyId}`);
        return;
      }
    } else {
      initiatingParticipant = {
          type: 'user',
          id: user.id,
          name: user.full_name || user.email || 'Personal Profile',
          avatar_url: user.avatar_url
      };
    }

    // Determine the participant representing the target company
    const otherParticipant: Participant = {
      type: 'company',
      id: initialCompany.company_id,
      name: initialCompany.name || 'Company',
      logo_url: initialCompany.uploaded_logo_url || initialCompany.logo?.asset?.url
    };

    // Handle message initiation
    try {
      const success = await startOrNavigateToMessageThread(
          supabase,
          user,
          userCompanies,
          initiatingParticipant,
          otherParticipant,
          router,
          pathname
      );
      if (success) {
        onClose(); // Close dialog after successful navigation/creation
      } else {
        // Error handled within startOrNavigateToMessageThread with toasts
        // console.log("Failed to start or navigate to message thread.");
      }
    } catch (error) {
      console.error("Error calling startOrNavigateToMessageThread:", error);
      toast.error("An error occurred while trying to start the conversation.");
    }
  };

  // Updated renderProjects
  const renderProjects = () => (
    <>
      {isLoadingProjects ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <>
          {/* Active Projects */}
          {companyWithProjects.activeProjects && companyWithProjects.activeProjects.length > 0 ? (
            <div className="">
              {/* --- Use Grid Layout --- */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3"> 
                {companyWithProjects.activeProjects.map((project, index) => {
                  const imageUrl = projectImagesMap.get(project.slug)?.url;
                  return (
                    <motion.div
                      key={project.slug}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Link
                        href={`/project/${project.slug}`}
                        // --- Adjust Card Styling/Layout ---
                        className="flex flex-col md:flex-row items-start gap-4 p-4 bg-gray-50 dark:bg-zinc-900 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors group h-full" 
                      >
                        {/* --- Larger Image --- */}
                                                  <div className="w-full md:w-20 h-40 md:h-20 bg-gray-100 dark:bg-zinc-800 rounded-lg flex items-center justify-center shrink-0 overflow-hidden"> 
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={project.name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <Building2 className="h-6 w-6 text-blue-600 dark:text-blue-400" /> // Slightly larger icon
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 dark:text-white break-words">{project.name}</h4> {/* Added break-words */} 
                          {(project.city || project.neighborhood) && (
                            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-zinc-400 mt-1">
                              <MapPin className="h-3.5 w-3.5 shrink-0" /> 
                              <span className="truncate"> 
                                {project.city}
                                {project.neighborhood && ` • ${project.neighborhood}`}
                              </span>
                            </div>
                          )}
                        </div>
                        {/* Optional: Keep Arrow or remove for cleaner grid */}
                        {/* <ArrowUpRight className="h-5 w-5 text-gray-400 dark:text-zinc-500 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors ml-auto shrink-0 mt-1 sm:mt-0" /> */}
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-zinc-900 flex items-center justify-center">
                <Building2 className="h-8 w-8 text-gray-500 dark:text-zinc-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No Active Projects
              </h3>
              <p className="text-gray-500 dark:text-zinc-400 max-w-md mx-auto">
                This company doesn't have any active projects at the moment.
                Check back later for updates.
              </p>
            </div>
          )}
        </>
      )}
    </>
  );

  // Updated renderCompletedProjects
  const renderCompletedProjects = () => (
    <>
      {isLoadingProjects ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <>
          {companyWithProjects.completedProjects && companyWithProjects.completedProjects.length > 0 ? (
            // --- Use Grid Layout ---
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3"> 
              {companyWithProjects.completedProjects.map((project, index) => {
                const imageUrl = projectImagesMap.get(project.slug)?.url;
                return (
                  <motion.div
                    key={project.slug}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Link
                      href={`/project/${project.slug}`}
                      // --- Adjust Card Styling/Layout ---
                      className="flex flex-col md:flex-row items-start gap-4 p-4 bg-gray-50 dark:bg-zinc-900 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors group h-full" 
                    >
                      {/* --- Larger Image --- */}
                                              <div className="w-full md:w-20 h-40 md:h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center shrink-0 overflow-hidden"> 
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={project.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <Award className="h-6 w-6 text-emerald-600 dark:text-emerald-400" /> // Slightly larger icon
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 dark:text-white break-words">{project.name}</h4> {/* Added break-words */} 
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500 dark:text-zinc-400 mt-1"> 
                          {(project.city || project.neighborhood) && (
                            <div className="flex items-center gap-1.5">
                              <MapPin className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate"> 
                                {project.city}
                                {project.neighborhood && ` • ${project.neighborhood}`}
                              </span>
                            </div>
                          )}
                          {project.completedDate && (
                            <Badge variant="secondary" className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 whitespace-nowrap"> 
                              Completed {new Date(project.completedDate).getFullYear()}
                            </Badge>
                          )}
                        </div>
                      </div>
                       {/* Optional: Keep Arrow or remove for cleaner grid */}
                       {/* <ArrowUpRight className="h-5 w-5 text-gray-400 dark:text-zinc-500 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors ml-auto shrink-0 mt-1 sm:mt-0" /> */}
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-zinc-900 flex items-center justify-center">
                <Award className="h-8 w-8 text-gray-500 dark:text-zinc-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No Completed Projects
              </h3>
              <p className="text-gray-500 dark:text-zinc-400 max-w-md mx-auto">
                This company hasn't completed any projects yet.
                Check the Overview tab to see their active projects.
              </p>
            </div>
          )}
        </>
      )}
    </>
  );

  // --- Handler for successful description update ---
  const handleDescriptionUpdate = (newDescription: string) => {
    // Update the specific description state immediately
    setFetchedDescription(newDescription || undefined);
    // Also update the companyWithProjects state if you rely on it elsewhere for description
    setCompanyWithProjects(prev => ({ ...prev, description: newDescription || undefined }));
    // Call the refreshCompany prop to notify the parent list component
    if (refreshCompany && initialCompany.company_id) {
      refreshCompany(initialCompany.company_id);
    }
  };
  // --- End Handler ---

  // --- Define handleProjectsUpdate (as before) ---
  const handleProjectsUpdate = () => {
     if (refreshCompany && initialCompany.company_id) {
       console.log("[CompanyDialog] Projects updated, calling refreshCompany for parent.");
       refreshCompany(initialCompany.company_id);
     }
  };
  // --- End handleProjectsUpdate ---

  // --- Share Button Logic ---
  const handleShareClick = async () => {
    if (!initialCompany.company_id) {
      toast.error("Cannot generate share link: Missing company ID.");
      return;
    }

    // Construct the URL
    const shareUrl = `${window.location.origin}/directory?company=${initialCompany.company_id}`;

    try {
      // Try the modern clipboard API first
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(shareUrl);
        toast.success("Link copied to clipboard!");
      } else {
        // Fallback for older browsers or non-secure contexts
        const textArea = document.createElement("textarea");
        textArea.value = shareUrl;
        // Make the textarea out of viewport
        textArea.style.position = "fixed";
        textArea.style.top = "-9999px";
        textArea.style.left = "-9999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
          document.execCommand('copy');
          toast.success("Link copied to clipboard!");
        } catch (err) {
          console.error('Fallback Copy failed: ', err);
          toast.error("Could not copy link using fallback.");
        } finally {
          document.body.removeChild(textArea);
        }
      }
    } catch (err) {
      console.error('Failed to copy link: ', err);
      toast.error("Could not copy link to clipboard.");
    }
  };
  // --- End Share Button Logic ---

  // Update the review button click handler
  const handleReviewButtonClick = () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    setShowReviewModal(true);
    // Don't set a specific rating when just clicking the general "Add Review" button
    // Let user select in the modal
  };

  return (
    <>
      <Dialog open={true} onOpenChange={() => onClose()}>
        <DialogContent className={cn(
          "fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%]",
          "flex flex-col",
          "w-[calc(100%-1rem)] md:w-[calc(100%-4rem)]",
          "max-w-3xl",
          "h-[calc(100vh-8rem)] md:h-[90vh]",
          "bg-white dark:bg-black p-0",
          "border border-gray-200 dark:border-zinc-800",
          "overflow-hidden rounded-lg"
        )}
        aria-describedby="company-dialog-description"
        >
          <DialogTitle className="sr-only">
            {initialCompany.name} - Company Profile
          </DialogTitle>
          <div id="company-dialog-description" className="sr-only">
            Detailed information about {initialCompany.name}, including company overview, opportunities, past projects, and reviews.
          </div>

          {/* Header */}
          <div className="sticky top-0 z-20 bg-white dark:bg-black">
            {/* Mobile Header */}
            <div className="block md:hidden">
              <div className="p-4 pb-0">
                <div className="flex items-start gap-3">
                  {/* Company Logo */}
                  <div className="relative w-10 h-10 bg-white dark:bg-zinc-900 rounded-md flex items-center justify-center shrink-0">
                    {(initialCompany.uploaded_logo_url || initialCompany.logo?.asset?.url) ? (
                      <img
                        src={initialCompany.uploaded_logo_url || (initialCompany.logo?.asset?.url ?? '')}
                        alt={initialCompany.name}
                        className="w-full h-full object-contain rounded-xl"
                      />
                    ) : (
                      <Building2 className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                        {initialCompany.name}
                      </h2>
                      <div className="flex items-center gap-0.5 -mt-2 -mr-2">
                        <BookmarkButton 
                          companyId={initialCompany.company_id} 
                          onBookmarkUpdate={async () => {
                            if (user) {
                              // Call the parent's onBookmarkUpdate to refresh background list
                              if (onBookmarkUpdate) {
                                onBookmarkUpdate();
                              }
                            }
                          }}
                        />
                        <button
                          onClick={onClose}
                          className="p-2 text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-300"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mt-1.5">
                      {initialCompany.categories && initialCompany.categories.map((category, index) => (
                        <Badge 
                          key={index}
                          variant="secondary" 
                          className="bg-gray-100 dark:bg-zinc-800 text-xs"
                        >
                          <Briefcase className="h-3 w-3 mr-1" />
                          {category}
                        </Badge>
                      ))}
                      {initialCompany.is_verified ? (
                        <Badge variant="secondary" className="bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs">
                          <BadgeCheck className="h-3 w-3 mr-1" />
                          Verified
                        </Badge>
                      ) : hasPendingClaim ? (
                        <Button
                          variant="outline"
                          className="h-5 px-2 text-xs flex items-center gap-1"
                          onClick={handleClaimButtonClick}
                        >
                          <Clock className="h-3! w-3! animate-pulse" />
                          Pending Review
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          className="h-5 px-2 text-xs flex items-center gap-1"
                          onClick={handleClaimButtonClick}
                        >
                          <BadgeHelp className="h-3! w-3!" />
                          Claim this Company
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 mt-4">
                  <div className="flex items-center gap-1.5" role="group" aria-label={companyWithProjects.rating ? `Rating: ${companyWithProjects.rating} out of 5` : 'No reviews yet'}>
                    <div 
                      className={cn(
                        "flex",
                        // Apply pulse animation to the star container
                        isUpdatingRating && "animate-pulse" 
                      )}
                      onMouseLeave={() => setHoverRatings(prev => {
                        const next = new Map(prev);
                        next.delete(initialCompany._id);
                        return next;
                      })}
                    >
                      {Array.from({ length: 5 }).map((_, i) => (
                        <button
                          key={i}
                          type="button"
                          className="p-0.5 hover:scale-110 transition-transform"
                          onMouseEnter={() => setHoverRatings(prev => new Map(prev).set(initialCompany._id, i + 1))}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!user) {
                              setShowAuthModal(true);
                              return;
                            }
                            if (userReview) {
                              // User has existing review, open edit modal
                              handleEditReview(userReview);
                            } else {
                              // User doesn't have review, open create modal
                              setShowReviewModal(true);
                              setCurrentRating(i + 1);
                            }
                          }}
                        >
                          <Star
                            className={cn(
                              "h-4 w-4",
                              (hoverRatings.get(initialCompany._id) && i < hoverRatings.get(initialCompany._id)!) || 
                              (companyWithProjects.rating && i < Math.floor(companyWithProjects.rating))
                                ? "text-yellow-500 fill-yellow-500"
                                : "text-gray-300 dark:text-gray-700",
                              "cursor-pointer"
                            )}
                          />
                        </button>
                      ))}
                    </div>
                    {companyWithProjects.rating ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">
                          ({companyWithProjects.reviewCount} {companyWithProjects.reviewCount === 1 ? 'review' : 'reviews'})
                        </span>
                        {userReview && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs text-blue-600 hover:text-blue-700"
                            onClick={() => handleEditReview(userReview)}
                          >
                            Edit My Review
                          </Button>
                        )}
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs text-gray-500 hover:text-blue-600"
                        onClick={() => setShowReviewModal(true)}
                      >
                        Add Review
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 mt-4 relative">
                  {/* <Button 
                    className="flex-1 bg-blue-600 text-white hover:bg-blue-700 justify-center"
                    onClick={() => {
                      if (!user) {
                        setShowAuthModal(true);
                        return;
                      }
                      if (!hasMembershipAccess) {
                        setShowPricingDialog(true);
                        return;
                      }
                      
                      // If user has companies, show identity selection
                      if (userCompanies.length > 0) {
                        setShowIdentityOptions(!showIdentityOptions);
                      } else {
                        // Direct message for users without companies
                        handleCompanyContact();
                      }
                    }}
                  >
                    Message
                    <MessagesSquare className="h-4 w-4" />
                    {userCompanies.length > 0 && (
                      <ChevronDown className={cn(
                        "h-4 w-4 transition-transform",
                        showIdentityOptions && "rotate-180"
                      )} />
                    )}
                  </Button> */}
                  {initialCompany.contact?.website && (
                    <Link 
                      href={initialCompany.contact.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1"
                    >
                      <Button 
                        className="w-full"
                        variant="outline"
                      >
                        Website
                        <LinkIcon className="h-4 w-4" />
                      </Button>
                    </Link>
                  )}
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={handleShareClick}
                    aria-label="Share company link"
                  >
                    Share
                    <Share2 className="h-4 w-4" />
                  </Button>
                  {/* --- End Share Button (Mobile) --- */}
                </div>

                {renderIdentityOptions(true)}
              </div>
            </div>

            {/* Desktop Header - Preserve Existing */}
            <div className="hidden md:block">
                              <div className="p-4 pb-0 md:p-6 md:pb-0">
                  <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-6">
                {/* Company Logo */}
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="relative w-16 md:w-20 h-16 md:h-20 bg-gray-50 dark:bg-zinc-900 rounded-xl flex items-center justify-center shadow-sm mx-auto md:mx-0"
                  role="img"
                  aria-label={`${initialCompany.name} logo`}
                >
                  {initialCompany.uploaded_logo_url || initialCompany.logo?.asset?.url ? (
                    <Image
                      src={initialCompany.uploaded_logo_url || (initialCompany.logo?.asset?.url ?? '')}
                      alt={initialCompany.name}
                      width={80}
                      height={80}
                      className="rounded-xl"
                    />
                  ) : (
                    <Briefcase className="h-10 w-10 text-gray-400 dark:text-zinc-500" />
                  )}
                  {/* <div className="absolute -bottom-1 -right-1 bg-white dark:bg-black rounded-lg p-1 shadow-sm border border-gray-200 dark:border-zinc-800">
                    <Badge variant="secondary" className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5">
                      <Briefcase className="h-3 w-3" aria-hidden="true" />
                    </Badge>
                  </div> */}
                </motion.div>

                {/* Company Info */}
                  <div className="flex-1 min-w-0 text-center md:text-left">
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h1 className="text-xl font-bold text-gray-900 dark:text-white truncate" id="dialog-company-name">
                        {initialCompany.name}
                      </h1>
                      <div className="flex items-center gap-0.5 -mt-2 -mr-2">
                        <BookmarkButton 
                          companyId={initialCompany.company_id} 
                          onBookmarkUpdate={async () => {
                            if (user) {
                              // Call the parent's onBookmarkUpdate to refresh background list
                              if (onBookmarkUpdate) {
                                onBookmarkUpdate();
                              }
                            }
                          }}
                        />
                        <button
                          onClick={onClose}
                          className="p-2 text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-300"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {initialCompany.categories && initialCompany.categories.map((category, index) => (
                        <Badge 
                          key={index}
                          variant="secondary" 
                          className="bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400"
                        >
                          <Briefcase className="h-3 w-3 mr-1" aria-hidden="true" />
                          {category}
                        </Badge>
                      ))}
                      {initialCompany.location && (
                        <Badge variant="secondary" className="bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400">
                          <MapPin className="h-3 w-3 mr-1" aria-hidden="true" />
                          {initialCompany.location}
                        </Badge>
                      )}
                      {initialCompany.is_verified ? (
                        <Badge variant="secondary" className="bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
                          <BadgeCheck className="h-3.5 w-3.5 mr-1" />
                          Verified
                        </Badge>
                      ) : hasPendingClaim ? (
                        <Button
                          variant="outline"
                          className="h-6 px-2.5 text-xs flex items-center gap-2"
                          onClick={handleClaimButtonClick}
                        >
                          <Clock className="h-3! w-3! animate-pulse" />
                          Pending Review
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          className="h-6 px-2.5 text-xs flex items-center gap-2"
                          onClick={handleClaimButtonClick}
                        >
                          <BadgeHelp className="h-3! w-3!" />
                          Claim this Company
                        </Button>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      {companyWithProjects.rating !== null ? (
                        <div className="flex items-center gap-1" role="group" aria-label={`Rating: ${companyWithProjects.rating} out of 5`}>
                          <div 
                            className={cn(
                              "flex",
                              // Apply pulse animation to the star container
                              isUpdatingRating && "animate-pulse" 
                            )}
                            onMouseLeave={() => setHoverRatings(prev => {
                              const next = new Map(prev);
                              next.delete(initialCompany._id);
                              return next;
                            })}
                          >
                            {Array.from({ length: 5 }).map((_, i) => (
                              <button
                                key={i}
                                type="button"
                                className="p-0.5 hover:scale-110 transition-transform"
                                onMouseEnter={() => setHoverRatings(prev => new Map(prev).set(initialCompany._id, i + 1))}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!user) {
                                    setShowAuthModal(true);
                                    return;
                                  }
                                  if (userReview) {
                                    // User has existing review, open edit modal
                                    handleEditReview(userReview);
                                  } else {
                                    // User doesn't have review, open create modal
                                    setShowReviewModal(true);
                                    setCurrentRating(i + 1);
                                  }
                                }}
                              >
                                <Star
                                  className={cn(
                                    "h-4 w-4",
                                    (hoverRatings.get(initialCompany._id) && i < hoverRatings.get(initialCompany._id)!) || 
                                    (companyWithProjects.rating && i < Math.floor(companyWithProjects.rating))
                                      ? "text-yellow-500 fill-yellow-500"
                                      : "text-gray-300 dark:text-gray-700",
                                    "cursor-pointer"
                                  )}
                                  aria-hidden="true"
                                />
                              </button>
                            ))}
                          </div>
                          <span className="font-medium text-gray-900 dark:text-white">{companyWithProjects.rating}</span>
                          {companyWithProjects.reviewCount > 0 && (
                            <span className="text-sm text-gray-500 dark:text-zinc-400 ml-1">
                              ({companyWithProjects.reviewCount} {companyWithProjects.reviewCount === 1 ? 'review' : 'reviews'})
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1" role="group" aria-label="No reviews yet">
                          <div 
                            className={cn(
                              "flex",
                              // Apply pulse animation to the star container
                              isUpdatingRating && "animate-pulse" 
                            )}
                            onMouseLeave={() => setHoverRatings(prev => {
                              const next = new Map(prev);
                              next.delete(initialCompany._id);
                              return next;
                            })}
                          >
                            {Array.from({ length: 5 }).map((_, i) => (
                              <button
                                key={i}
                                type="button"
                                className="p-0.5 hover:scale-110 transition-transform"
                                onMouseEnter={() => setHoverRatings(prev => new Map(prev).set(initialCompany._id, i + 1))}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!user) {
                                    setShowAuthModal(true);
                                    return;
                                  }
                                  if (userReview) {
                                    // User has existing review, open edit modal
                                    handleEditReview(userReview);
                                  } else {
                                    // User doesn't have review, open create modal
                                    setShowReviewModal(true);
                                    setCurrentRating(i + 1);
                                  }
                                }}
                              >
                                <Star
                                  className={cn(
                                    "h-4 w-4",
                                    hoverRatings.get(initialCompany._id) && i < hoverRatings.get(initialCompany._id)!
                                      ? "text-yellow-500 fill-yellow-500"
                                      : "text-gray-300 dark:text-gray-700",
                                    "cursor-pointer"
                                  )}
                                  aria-hidden="true"
                                />
                              </button>
                            ))}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-sm text-gray-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400"
                            onClick={handleReviewButtonClick}
                          >
                            Add first review
                          </Button>
                        </div>
                      )}

                      <div className="flex gap-2 relative">
                        {/* <Button 
                          size="sm"
                          className="bg-blue-600 text-white hover:bg-blue-700"
                          onClick={() => {
                            if (!user) {
                              setShowAuthModal(true);
                              return;
                            }
                            if (!hasMembershipAccess) {
                              setShowPricingDialog(true);
                              return;
                            }
                            
                            // If user has companies, show identity selection
                            if (userCompanies.length > 0) {
                              setShowIdentityOptions(!showIdentityOptions);
                            } else {
                              // Direct message for users without companies
                              handleCompanyContact();
                            }
                          }}
                        >
                          Message
                          <MessagesSquare className="h-4 w-4" />
                          {userCompanies.length > 0 && (
                            <ChevronDown className={cn(
                              "h-4 w-4 transition-transform",
                              showIdentityOptions && "rotate-180"
                            )} />
                          )}
                        </Button> */}
                        {initialCompany.contact?.website && (
                          <Link 
                            href={initialCompany.contact.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1"
                          >
                            <Button 
                              className="w-full"
                              variant="outline"
                              size="sm"
                            >
                              Website
                              <LinkIcon className="h-4 w-4" />
                            </Button>
                          </Link>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleShareClick}
                          aria-label="Share company link"
                        >
                          Share
                          <Share2 className="h-4 w-4" />
                        </Button>
                        {/* --- End Share Button (Desktop) --- */}

                        {renderIdentityOptions(false)}
                      </div>
                    </div>
                  </motion.div>
                </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <Tabs 
            defaultValue="overview" 
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full flex flex-col flex-1 overflow-hidden"
          >
            <TabsList className="w-full bg-transparent dark:bg-transparent h-12 p-0 border-b border-gray-200 dark:border-zinc-800 shrink-0">
              <div className="flex justify-start md:justify-center w-full overflow-x-auto scrollbar-none">
                <div className="flex px-4 md:px-6 gap-2">
                                    <TabsTrigger 
                    value="overview" 
                    className={cn(
                      "flex items-center h-12 px-4 relative text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white gap-2 shrink-0",
                      "after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5",
                      "after:bg-blue-600 dark:after:bg-blue-500 after:transform after:scale-x-0 after:transition-transform",
                      "data-[state=active]:after:scale-x-100 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:font-medium",
                      "shadow-none data-[state=active]:shadow-none border-none data-[state=active]:border-none data-[state=active]:bg-transparent"
                    )}
                  >
                    <Info className="h-4 w-4" />
                    <span>Overview</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="projects" 
                    className={cn(
                      "flex items-center h-12 px-4 relative text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white gap-2 shrink-0",
                      "after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5",
                      "after:bg-blue-600 dark:after:bg-blue-500 after:transform after:scale-x-0 after:transition-transform",
                      "data-[state=active]:after:scale-x-100 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:font-medium",
                      "shadow-none data-[state=active]:shadow-none border-none data-[state=active]:border-none data-[state=active]:bg-transparent"
                    )}
                  >
                    <Handshake className="h-4 w-4" />
                    <span>Completed</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="reviews" 
                    className={cn(
                      "flex items-center h-12 px-4 relative text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white gap-2 shrink-0",
                      "after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5",
                      "after:bg-blue-600 dark:after:bg-blue-500 after:transform after:scale-x-0 after:transition-transform",
                      "data-[state=active]:after:scale-x-100 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:font-medium",
                      "shadow-none data-[state=active]:shadow-none border-none data-[state=active]:border-none data-[state=active]:bg-transparent"
                    )}
                  >
                    <Star className="h-4 w-4" />
                    <span>Reviews</span>
                  </TabsTrigger>
                </div>
              </div>
            </TabsList>

            {/* Tab Content - Single Scrollable Container */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-4 md:p-6">
                <TabsContent value="overview" className="mt-0 space-y-6">
                  {isLoadingProjects ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                    </div>
                  ) : (
                    <>
                      {/* Key Metrics Grid (Revised Layout) */}
                      <section>
                        <h2 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white mb-3">Company Overview</h2>
                        {/* Now a 3-column grid on md screens, but using col-span */} 
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                      {/* Combined Projects Box (spans 1 column on md) */}
                            <motion.div
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="bg-gray-50 dark:bg-zinc-900 rounded-xl p-3 md:p-4 md:col-span-1 max-h-[162px]"
                            >
                              <div className="font-semibold text-lg md:text-xl text-gray-900 dark:text-white mb-2">
                                {(companyWithProjects.activeProjects?.length || 0) + (companyWithProjects.completedProjects?.length || 0)}
                              </div>
                              <div className="text-xs md:text-sm text-gray-500 dark:text-zinc-400 mb-3">Total Projects</div>
                            
                            {/* Divider */} 
                            <Separator className="mb-3 bg-gray-200 dark:bg-zinc-700" />
                            
                                                          {/* Individual Counts */}
                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-xs md:text-sm">
                                  <div className="flex items-center gap-1.5 text-gray-600 dark:text-zinc-300">
                                    <Building2 className="h-3.5 w-3.5" />
                                    <span>Active</span>
                                  </div>
                                  <span className="font-medium text-gray-900 dark:text-white">
                                    {companyWithProjects.activeProjects?.length || 0}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-xs md:text-sm">
                                <div className="flex items-center gap-1.5 text-gray-600 dark:text-zinc-300">
                                  <Award className="h-3.5 w-3.5" />
                                  <span>Completed</span>
                                </div>
                                <span className="font-medium text-gray-900 dark:text-white">
                                  {companyWithProjects.completedProjects?.length || 0}
                                </span>
                              </div>
                            </div>
                          </motion.div>

                          {/* Expanded Description Box (spans 2 columns on md) */}
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }} // Slightly delay this one
                            className="bg-gray-50 dark:bg-zinc-900 rounded-xl px-3.5 py-2 flex flex-col md:col-span-2 relative overflow-y-auto max-h-[162px]" // Added overflow and max-height
                          >
                            {/* FIX: Edit Button condition - Must be manager AND have a description */}
                            {isUserManager && !isLoadingDescription && fetchedDescription && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="absolute top-2 right-2 h-7 w-7 text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-200 z-10" // Ensure button is above content
                                onClick={() => setIsEditDescriptionOpen(true)}
                                aria-label="Edit company description"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                            {/* End FIX */}

                            {/* Description Content Area (logic remains the same) */}
                            {isLoadingDescription ? (
                                <div className="flex items-center justify-center flex-1">
                                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                </div>
                            ) : fetchedDescription ? ( // Use fetchedDescription state
                                <p className="text-sm text-gray-600 dark:text-gray-300 flex-1 pr-8">
                                    {fetchedDescription} {/* Render fetchedDescription */}
                                </p>
                            ) : (
                                <div className="text-sm text-gray-500 dark:text-zinc-400 flex-1 flex flex-col items-center justify-center text-center p-4 border border-dashed border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800/50">
                                    {/* Add/Claim logic - Add button shows here if isUserManager is true and fetchedDescription is falsey */}
                                    {isUserManager ? (
                                        <>
                                          <p className="mb-2">Showcase your company by adding a description.</p>
                                          <Button
                                            variant="default"
                                            size="sm"
                                            className="bg-blue-600 hover:bg-blue-700 text-white h-8 px-3"
                                            // This button correctly reuses the same dialog trigger
                                            onClick={() => setIsEditDescriptionOpen(true)}
                                          >
                                            <SquarePen className="h-4 w-4 mr-1.5" />
                                            Add Description
                                          </Button>
                                        </>
                                    ) : !initialCompany.is_verified ? (
                                        // ... Claim Button Logic ...
                                        <>
                                          <p className="mb-1 font-medium text-gray-700 dark:text-zinc-200">Is this your company?</p>
                                          <p className="text-xs text-gray-500 dark:text-zinc-400 mb-2 lg:mb-3">Claim to add a description, manage projects, and respond to bids.</p>
                                          <Button
                                            variant="default" // Make it prominent
                                            size="sm"
                                            className="bg-blue-600 hover:bg-blue-700 text-white h-8 px-3"
                                            onClick={handleClaimButtonClick} // Reuse existing handler
                                          >
                                            <BadgeHelp className="h-4 w-4" />
                                            Claim this Company
                                          </Button>
                                        </>
                                    ) : (
                                        <span>No description provided yet.</span>
                                    )}
                                </div>
                            )}
                             {/* --- End Description Content Area --- */}
                          </motion.div>
                        </div>
                      </section>

                      {/* Active Projects Section (with Edit Button) */}
                      <section>
                        {/* Container for Title and Button */}
                        <div className="flex justify-between items-center mb-3">
                          <h2 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white">
                            {(companyWithProjects.activeProjects?.length || 0) === 1 ? 'Active Project' : 'Active Projects'}
                          </h2>
                          {isUserManager && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs h-7 px-2.5" // Smaller button
                              onClick={() => {
                                setIsEditProjectsOpen(true);
                              }}
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              Edit Projects
                            </Button>
                          )}
                        </div>
                        {renderProjects()}
                      </section>
                    </>
                  )}
                </TabsContent>

                <TabsContent value="projects" className="mt-0">
                   {/* Container for Title and potentially Edit Button */}
                   <div className="flex justify-between items-center mb-3">
                    <h2 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white">Completed Projects</h2>
                    {/* Optionally add edit button here too if needed */}
                    {isUserManager && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-7 px-2.5" // Smaller button
                        onClick={() => {
                          setIsEditProjectsOpen(true);
                        }}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit Projects
                      </Button>
                    )}
                  </div>
                  {renderCompletedProjects()}
                </TabsContent>

                {reviewsTabContent}
              </div>
            </div>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Modals */}
      <ReviewModal
        companyId={initialCompany.company_id}
        companyName={initialCompany.name}
        companySlug={initialCompany.slug.current}
        isOpen={showReviewModal}
        onClose={() => {
          setShowReviewModal(false);
          setCurrentRating(null); // Reset rating on close
        }}
        onSubmit={handleReviewSubmit}
        existingReview={userReview ? {
          id: userReview.id,
          rating: userReview.rating,
          content: userReview.content
        } : currentRating ? {
          rating: currentRating,
          content: ''
        } : null}
      />

      <ClaimCompanyFlow
        isOpen={showClaimModal}
        onClose={() => setShowClaimModal(false)}
        onSubmit={handleClaimSubmit}
        company={initialCompany}
        isNew={false}
      />

      <AuthModal 
        open={showAuthModal}
        onOpenChange={setShowAuthModal}
        trigger={<div />}
        returnTo={`/directory`}
      />

      <PricingDialog
        isOpen={showPricingDialog}
        onOpenChange={setShowPricingDialog}
      />

      {/* Add Edit Description Dialog Instance */}
      {initialCompany.company_id && ( // Use prop ID here
          <EditDescription
            isOpen={isEditDescriptionOpen}
            onClose={() => setIsEditDescriptionOpen(false)}
            companyId={initialCompany.company_id} // Use prop ID
            // Pass the description that is currently displayed (fetched or fallback)
            currentDescription={isLoadingDescription ? initialCompany.description : fetchedDescription}
            onSuccess={handleDescriptionUpdate}
          />
      )}

      {/* Add Edit Projects Dialog Instance */}
       {initialCompany.company_id && isUserManager && ( // Only show for managers
          <EditProjects
            isOpen={isEditProjectsOpen}
            onClose={() => setIsEditProjectsOpen(false)}
            companyId={initialCompany.company_id} // Use prop ID
            companyName={initialCompany.name} // Use prop name
            onSuccess={handleProjectsUpdate} // Refresh projects on success
          />
       )}
    </>
  );
}