'use client';

import React, { useState, useRef, useEffect, Fragment } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CompanyDialog } from "@/components/companies";
import { Search, Building2, CheckCircle, ArrowRight, ChevronDown, ArrowUpRight, MapPin, ArrowUp, ArrowDown, ArrowUpDown, Star, BadgeCheck, BadgeHelp, Clock, Loader2, Bookmark } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Filter, FilterType, FilterOperator } from "@/components/ui/filters";
import { FilterSelection } from '@/components/ui/filter-selection';
import { useMediaQuery } from "@/hooks/use-media-query";
import { fetchCompanies, Company, invalidateCompanyCache } from '@/components/companies';
import { formatCategoriesForDisplay, getPrimaryCategory, hasCategory } from '@/components/companies/utils';
import { useDebounce } from "@/hooks/use-debounce";
import { useRouter, usePathname } from 'next/navigation';
import { UpgradeBanner } from "@/components/ui/upgrade-banner";
import { useSupabase } from "@/lib/providers/supabase-context";
import { ClaimUpsell } from "@/components/companies";
import { ClaimCompanyFlow } from "@/components/companies";
import { useAuth } from '@/lib/providers/auth-context';
import { AuthModal } from '@/components/ui/auth-modal';
import { navigateToTab } from '@/lib/utils';
import { type UserCompany } from '@/hooks/use-user-companies';
import { toast } from 'sonner';
import { PricingDialog } from '@/components/ui/pricing-dialog';
// Removed messaging imports - now using bookmarking functionality

const PROVIDERS_PER_PAGE = 8;

interface MarketplaceProps {
  userCompanies: UserCompany[];
  searchParams: Readonly<URLSearchParams> | null;
}

// Add this interface before the Marketplace component
interface ExtendedCompany extends Company {
  isNew?: boolean;
  isEditing?: boolean;
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

// Add helper function to get activity level based on active projects count
const getActivityLevel = (provider: Company): string => {
  const activeCount = provider.activeProjects?.length || 0;
  if (activeCount >= 20) return "20+ active projects";
  if (activeCount >= 10) return "10-20 active projects";
  if (activeCount >= 5) return "5-10 active projects";
  return "Under 5 active projects";
};

// Add helper function to get experience level based on completed projects count
const getExperienceLevel = (provider: Company): string => {
  const completedCount = provider.completedProjects?.length || 0;
  if (completedCount >= 20) return "20+ completed";
  if (completedCount >= 10) return "10-20 completed";
  if (completedCount >= 5) return "5-10 completed";
  return "Under 5 completed";
};

// Add helper function to format company logo
const getCompanyLogo = (company: Company): string | null => {
  if (company.uploaded_logo_url) {
    return company.uploaded_logo_url;
  }
  if (company.logo?.asset?.url) {
    return company.logo.asset.url;
  }
  return null;
};

const MarketplaceComponent = React.memo(function Marketplace({ userCompanies, searchParams }: MarketplaceProps) {
  const [providers, setProviders] = useState<Company[]>([]);
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<Company | null>(null);
  const [showInitialReview, setShowInitialReview] = useState(false);
  const [showInitialClaim, setShowInitialClaim] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<Filter[]>([]);
  const [sortBy, setSortBy] = useState<'activity' | 'experience' | 'rating'>('activity');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isLoading, setIsLoading] = useState(true);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [hoverRatings, setHoverRatings] = useState<Map<string, number>>(new Map());
  const [initialRating, setInitialRating] = useState<number | null>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const [showUpgradeBanner, setShowUpgradeBanner] = useState(false);
  const [hasClaimedCompany, setHasClaimedCompany] = useState(false);
  const [hasDismissedBanner, setHasDismissedBanner] = useState(false);
  const [showCompanyFlow, setShowCompanyFlow] = useState(false);
  const [selectedUnclaimedCompany, setSelectedUnclaimedCompany] = useState<ExtendedCompany | null>(null);
  const [showClaimCompany, setShowClaimCompany] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { user } = useAuth();
  const [pendingClaims, setPendingClaims] = useState<Set<string>>(new Set());
  const [showPricingDialog, setShowPricingDialog] = useState(false);
  const [isHeaderSticky, setIsHeaderSticky] = useState(false);
  const [isSavingCompanies, setIsSavingCompanies] = useState(false);
  const [bookmarkedCompanies, setBookmarkedCompanies] = useState<Set<string>>(new Set());
  const { supabase } = useSupabase();

  // Debounce search query
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Add effect to check for company parameter in URL and set initial selected provider
  useEffect(() => {
    if (!searchParams) return; // Don't process URL params if not authenticated
    
    const params = new URLSearchParams(searchParams.toString());
    const companyIdFromUrl = params.get('company'); // Direct company link
    const asCompanyId = params.get('as'); // Check if sending as a company

    // Helper function to fetch and select company
    const fetchAndSelectCompany = async (companyId: string) => {
      setIsLoading(true); 
      let targetCompany: Company | undefined | null = null;

      // 1. Try to find in existing providers
      targetCompany = providers.find(p => p.company_id === companyId || p._id === companyId);

      // 2. If not found, fetch details
      if (!targetCompany && supabase) {
        try {
          const { data: companyData, error: fetchError } = await supabase
            .from('companies_view')
            .select('*')
            .eq('id', companyId) // Match Supabase ID
            .single();

          if (fetchError) {
            console.error('Error fetching company from URL param:', fetchError);
            toast.error('Could not find the specified company.');
            router.replace('/directory'); // Clean URL on error
            setIsLoading(false);
            return;
          }

          console.log(companyData)

          if (companyData) {
             targetCompany = {
               _id: companyData.id, 
               company_id: companyData.id, 
               name: companyData.name || 'Unknown Company',
               logo: companyData.logo_url ? { asset: { url: companyData.logo_url } } : undefined,
               uploaded_logo_url: companyData.uploaded_logo_url,
               is_verified: companyData.is_verified || false,
               categories: companyData.category || [],
               location: companyData.location,
               description: companyData.description || '',
               projectCount: companyData.project_count || 0,
               activeProjects: companyData.active_projects || [],
               completedProjects: companyData.completed_projects || [],
               rating: companyData.rating,
               reviewCount: companyData.review_count || 0,
               slug: { current: companyData.slug || companyData.name?.toLowerCase().replace(/\s+/g, '-') || companyData.id },
               source: 'supabase', 
               contact: companyData.contact || {}, 
               propertyTypes: companyData.property_types || [], 
               services: companyData.services || [], 
               teamSize: companyData.team_size, 
               foundedYear: companyData.founded_year,
               socials: companyData.socials || {}
             } as Company; 

             setProviders(prev => {
               if (!prev.some(p => p.company_id === targetCompany?.company_id)) {
                 return [...prev, targetCompany as Company];
               }
               return prev;
             });
          } else {
             console.warn('Company details not found for ID from URL:', companyId);
             toast.error('Company details not found.');
             router.replace('/directory');
             setIsLoading(false);
             return;
          }
        } catch (error) {
          console.error('Exception fetching company from URL:', error);
          toast.error('Failed to load company details.');
          router.replace('/directory');
          setIsLoading(false);
          return;
        }
      }
      return targetCompany; // Return the found/fetched company
    };

    // Handle direct company link (?company=...)
    if (companyIdFromUrl) {
      fetchAndSelectCompany(companyIdFromUrl).then(targetCompany => {
        if (targetCompany) {
          setSelectedProvider(targetCompany); // Open the dialog directly
          router.replace('/directory'); // Clean URL
        }
        setIsLoading(false);
      });
    }
  }, [searchParams, providers, user, router]); // Keep dependencies

  // Scroll detector for sticky header
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const threshold = 0; // Navbar height
      setIsHeaderSticky(scrollTop > threshold);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    async function loadCompanies() {
      try {
        setIsLoading(true);
        
        // Convert UI Filter objects to API filter format
        const apiFilters: any = {};
        
        // Helper function to map UI operators to API operators
        const mapOperatorToApi = (operator: FilterOperator): "is" | "is not" => {
          switch (operator) {
            case FilterOperator.IS:
            case FilterOperator.IS_ANY_OF:
              return "is";
            case FilterOperator.IS_NOT:
              return "is not";
            default:
              return "is";
          }
        };
        
        for (const filter of filters) {          
          // Map FilterType enum to the expected filter keys in fetchCompanies
          switch (filter.type) {
            case FilterType.CATEGORY:
              apiFilters.category = {
                value: filter.value,
                operator: mapOperatorToApi(filter.operator)
              };
              break;
              
            case FilterType.ACTIVITY:
              apiFilters.activity = {
                value: filter.value,
                operator: mapOperatorToApi(filter.operator)
              };
              break;
              
            case FilterType.LOCATION:
              apiFilters.location = {
                value: filter.value,
                operator: mapOperatorToApi(filter.operator)
              };
              break;
              
            case FilterType.RATING:
              apiFilters.rating = {
                value: filter.value.map(v => {
                  const match = String(v).match(/(\d+)/);
                  return match ? parseInt(match[1]) : 0;
                }),
                operator: mapOperatorToApi(filter.operator)
              };
              break;
              
            case FilterType.EXPERIENCE:
              apiFilters.experience = {
                value: filter.value,
                operator: mapOperatorToApi(filter.operator)
              };
              break;
              
            case FilterType.PROPERTY_TYPE:
              apiFilters.propertyType = {
                value: filter.value.map(v => v.toLowerCase()),
                operator: mapOperatorToApi(filter.operator)
              };
              break;
              
            default:
              console.warn(`Unhandled filter type: ${filter.type}`);
              break;
          }
        }
                
        const result = await fetchCompanies({
          page,
          limit: PROVIDERS_PER_PAGE,
          search: debouncedSearch,
          sort: {
            field: sortBy,
            order: sortOrder
          },
          filters: apiFilters
        });
                
        if (page === 1) {
          setProviders(result.companies);
        } else {
          setProviders(prev => [...prev, ...result.companies]);
        }
        
        setTotal(result.total);
        setHasMore(result.hasMore);
      } catch (error) {
        console.error('Error loading companies:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadCompanies();
  }, [page, debouncedSearch, sortBy, sortOrder, JSON.stringify(filters)]);

  // Reset pagination when search or filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, sortBy, sortOrder, JSON.stringify(filters)]);

  const loadMore = () => {
    if (!isLoading && hasMore) {
      setPage(prev => prev + 1);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsSortOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const rotateProviders = () => {
    setProviders(prev => [...prev.slice(1), prev[0]]);
  };

  // Get current visible providers (always 3)
  const visibleProviders = [...Array(PROVIDERS_PER_PAGE)].map((_, i) => {
    const index = (i + page - 1) % providers.length;
    return { ...providers[index], displayIndex: i };
  });

  const slideVariants = {
    enter: (i: number) => ({
      y: 20,
      opacity: 0,
      transition: {
        duration: 0.2
      }
    }),
    center: (i: number) => ({
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.3,
        ease: "easeOut"
      }
    }),
    exit: (i: number) => ({
      y: -20,
      opacity: 0,
      transition: {
        duration: 0.2
      }
    })
  };

  const handleProviderClick = (provider: Company, showReview = false, showClaim = false) => {
    if (showClaim) {
      if (!user) {
        setShowAuthModal(true);
        return;
      }
      if (pendingClaims.has(provider.company_id)) {
        router.push('/company');
        return;
      }
    }

    if (!provider.company_id) {
      console.error('Provider missing company_id:', provider);
      return;
    }

    // Always set the selected provider immediately
    setSelectedProvider(provider);
    setShowInitialReview(showReview);
    setShowInitialClaim(showClaim);
    
    // Fix the type issue with initialRating
    const rating = hoverRatings.get(provider.company_id);
    setInitialRating(showReview && rating ? rating : null);
  };
  if (!supabase) return null;

  // Function to refresh a company after review updates
  const refreshCompany = async (companyId: string) => {
    try {      
      // First invalidate the company cache to ensure future fetches are fresh
      await invalidateCompanyCache(companyId);
      
      // Get the latest data directly from database
      const { data: updatedCompanyData, error } = await supabase
        .from('companies_view')
        .select('id, rating, review_count, description')
        .eq('id', companyId)
        .single();
        
      if (error) {
        console.error("Error fetching updated company data:", error);
        return;
      }
      
      if (!updatedCompanyData) {
        console.error("No updated company data found");
        return;
      }
            
      // Update providers in the list
      setProviders(prev => prev.map(p => {
        if (p.company_id === companyId) {
          return {
            ...p,
            rating: updatedCompanyData.rating,
            reviewCount: updatedCompanyData.review_count,
            description: updatedCompanyData.description
          };
        }
        return p;
      }));
      
      // If this company is currently selected, update it too
      if (selectedProvider?.company_id === companyId) {
        setSelectedProvider(prev => {
          if (!prev) return null;
          return {
            ...prev,
            rating: updatedCompanyData.rating,
            reviewCount: updatedCompanyData.review_count,
            description: updatedCompanyData.description
          };
        });
      }
    } catch (error) {
      console.error('Error in refreshCompany:', error);
    }
  };

  // Check if user has claimed any company and if banner was dismissed
  useEffect(() => {
    const checkUserPreferences = async () => {
      try {
        if (!user?.id) return;

        const { data: profile, error } = await supabase
          .from('profiles')
          .select('has_dismissed_marketplace_banner')
          .eq('id', user.id)
          .single();

        if (error) throw error;
        
        setHasDismissedBanner(profile?.has_dismissed_marketplace_banner || false);
      } catch (error) {
        // console.error('Error checking user preferences:', error);
      }
    };

    checkUserPreferences();
  }, [user?.id]);

  // Load user's bookmarked companies
  useEffect(() => {
    const loadBookmarkedCompanies = async () => {
      if (!user?.id) return;

      try {
        const { data: bookmarks, error } = await supabase
          .from('saved_companies')
          .select('company_id')
          .eq('user_id', user.id);

        if (error) throw error;

        if (bookmarks) {
          const bookmarkedIds = new Set(bookmarks.map(b => b.company_id));
          setBookmarkedCompanies(bookmarkedIds);
        }
      } catch (error) {
        console.error('Error loading bookmarked companies:', error);
      }
    };

    loadBookmarkedCompanies();
  }, [user?.id]);

  // Show banner after companies load
  useEffect(() => {
    if (!isLoading && providers.length > 0 && !hasClaimedCompany && !hasDismissedBanner) {
      // Delay banner appearance for a smoother sequence
      const timer = setTimeout(() => {
        setShowUpgradeBanner(true);
      }, 800); // Delay after companies finish loading
      
      return () => clearTimeout(timer);
    }
  }, [isLoading, providers.length, hasClaimedCompany, hasDismissedBanner]);

  const handleBannerClose = async () => {
    setShowUpgradeBanner(false);
    try {
      if (!user?.id) return;

      // Update the profile in Supabase
      const { error } = await supabase
        .from('profiles')
        .update({ has_dismissed_marketplace_banner: true })
        .eq('id', user.id);

      if (error) throw error;

      setHasDismissedBanner(true);
    } catch (error) {
      console.error('Error updating banner dismissal:', error);
    }
  };

  const handleBannerClick = () => {
    setShowClaimCompany(true);
  };

  const handleClaimExisting = (company: any) => {
    setShowClaimCompany(false);
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    // Open the claim dialog for the selected company
    setSelectedUnclaimedCompany(company);
    setShowCompanyFlow(true);
  };

  const handleAddNew = (name: string) => {
    setShowClaimCompany(false);
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    // Use null for company_id instead of invalid temp string
    // The ClaimCompanyFlow will handle new companies properly
    setSelectedUnclaimedCompany({
      _id: '',
      name,
      projectCount: 0,
      rating: null,
      reviewCount: 0,
      is_verified: false,
      location: undefined,
      contact: {
        email: undefined,
        phone: undefined,
        website: undefined
      },
      status: 'pending',
      slug: { current: name.toLowerCase().replace(/\s+/g, '-') },
      company_id: null, // Use null instead of invalid temp ID
      isNew: true,
      isEditing: false
    } as ExtendedCompany & { company_id: null });
    setShowCompanyFlow(true);
  };

  // Add effect to check pending claims for displayed companies
  useEffect(() => {
    async function checkPendingClaims() {
      if (!user?.id || !supabase) return;
      
      type ClaimResult = {
        company_id: string;
        companies: {
          id: string;
        };
      };

      // Get all pending claims for the current user
      const { data: claims } = await supabase
        .from('company_approvals')
        .select(`
          company_id,
          companies (
            id
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .returns<ClaimResult[]>();

      if (claims) {
        // Create a set of company IDs
        const pendingIds = new Set(claims.map(claim => claim.companies.id));
        setPendingClaims(pendingIds);
      }
    }

    checkPendingClaims();
  }, [user?.id, providers]);

  const handleClaimSubmit = async (data: { company_id: string }) => {
    // Refresh the pending claims after submission
    if (user?.id) {
      type ClaimResult = {
        company_id: string;
        companies: {
          id: string;
        };
      };

      const { data: claims } = await supabase
        .from('company_approvals')
        .select(`
          company_id,
          companies (
            id
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .returns<ClaimResult[]>();

      if (claims) {
        const pendingIds = new Set(claims.map(claim => claim.companies.id));
        setPendingClaims(pendingIds);
      }
    }
    setShowCompanyFlow(false);
  };

  const handlePendingReviewClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigateToTab('company', router, pathname, { refresh: 'true' });
  };

  // Function to save/bookmark selected companies
  const handleSaveCompanies = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    if (selectedProviders.length === 0) {
      toast.error('Please select at least one company to save.');
      return;
    }

    setIsSavingCompanies(true);

    try {
      const selectedCompanies = providers.filter(p => selectedProviders.includes(p._id));
      let successCount = 0;
      let savedCount = 0;
      let removedCount = 0;

      for (const company of selectedCompanies) {
        try {
          const isCurrentlyBookmarked = bookmarkedCompanies.has(company.company_id);
          
          if (isCurrentlyBookmarked) {
            // Remove from bookmarks
            const { error } = await supabase
              .from('saved_companies')
              .delete()
              .eq('user_id', user.id)
              .eq('company_id', company.company_id);

            if (error) {
              console.error(`Error removing ${company.name}:`, error);
            } else {
              successCount++;
              removedCount++;
              // Remove from local bookmarked state
              setBookmarkedCompanies(prev => {
                const next = new Set(prev);
                next.delete(company.company_id);
                return next;
              });
            }
          } else {
            // Add to bookmarks
            const { error } = await supabase
              .from('saved_companies')
              .insert({
                user_id: user.id,
                company_id: company.company_id
              });

            if (error) {
              console.error(`Error saving ${company.name}:`, error);
            } else {
              successCount++;
              savedCount++;
              // Add to local bookmarked state
              setBookmarkedCompanies(prev => new Set(prev).add(company.company_id));
            }
          }
        } catch (error) {
          console.error(`Error processing ${company.name}:`, error);
        }
      }

      if (successCount > 0) {
        if (savedCount > 0 && removedCount > 0) {
          toast.success(`Updated ${successCount} ${successCount === 1 ? 'company' : 'companies'} in your bookmarks!`);
        } else if (savedCount > 0) {
          toast.success(`Saved ${savedCount} ${savedCount === 1 ? 'company' : 'companies'} to your bookmarks!`);
        } else {
          toast.success(`Removed ${removedCount} ${removedCount === 1 ? 'company' : 'companies'} from your bookmarks!`);
        }
        
        setSelectedProviders([]);
        // Navigate to tracking tab to see saved companies
        navigateToTab('tracking', router, pathname);
      } else {
        toast.error('Failed to update companies. Please try again.');
      }
    } catch (error) {
      console.error('Error saving companies:', error);
      toast.error('Failed to save companies. Please try again.');
    } finally {
      setIsSavingCompanies(false);
    }
  };

  return (
    <div className="flex h-full w-full">
      {/* Main Content */}
      <div className="w-full">
        {/* Search and Filters Bar with fixed height container */}
        <div className="h-[73px] relative">
          <div 
            ref={headerRef}
            className={cn(
              "w-full border-b border-zinc-200 dark:border-zinc-800 bg-background",
              isHeaderSticky ? "fixed left-0 right-0 z-40 shadow-sm" : "relative"
            )}
            style={{
              // Dynamic positioning when nav is sticky
              top: isHeaderSticky ? 49 : 'auto'
            }}
          >
            <div className="container mx-auto">
              <div className="py-4 px-0">
                <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                  {/* Search - grows to fill space */}
                  <div className="relative w-full sm:flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-zinc-400" />
                    <Input
                      type="text"
                      placeholder="Search by company name or project address..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-gray-50 dark:bg-zinc-900 w-full"
                    />
                  </div>

                  {/* Right side controls with consistent gap-2 */}
                  <div className="grid grid-cols-2 gap-2 w-full sm:w-auto sm:flex sm:items-center">
                    <FilterSelection filters={filters} setFilters={setFilters} isMobile={isMobile} />

                    <div ref={dropdownRef} className="relative">
                      <Button
                        variant="outline"
                        className="w-full sm:w-[150px] gap-2 justify-between"
                        onClick={() => setIsSortOpen(!isSortOpen)}
                      >
                        <div className="flex items-center gap-2">
                          <ArrowUpDown className="h-4 w-4" />
                          <span>
                            {sortBy === 'activity' ? 'Activity' : 
                             sortBy.charAt(0).toUpperCase() + sortBy.slice(1)}
                          </span>
                        </div>
                        <ChevronDown className={cn(
                          "h-4 w-4 transition-transform",
                          isSortOpen && "transform rotate-180"
                        )} />
                      </Button>
                      
                      {isSortOpen && (
                        <div className="absolute top-full right-0 mt-1 w-full sm:w-[180px] bg-white dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-zinc-700 shadow-lg z-50">
                          {[
                            { value: 'activity', label: 'Activity' },
                            { value: 'experience', label: 'Experience' },
                            { value: 'rating', label: 'Rating' }
                          ].map((option) => (
                            <button
                              key={option.value}
                              className={cn(
                                "w-full px-4 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-zinc-700",
                                sortBy === option.value && "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                              )}
                              onClick={() => {
                                setSortBy(option.value as any);
                                setIsSortOpen(false);
                              }}
                            >
                              {option.label}
                            </button>
                          ))}
                          <button
                            className="w-full border-t border-gray-200 dark:border-zinc-700 px-4 py-2 flex items-center gap-2 text-sm text-gray-500 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-700"
                            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                          >
                            {sortOrder === 'asc' ? (
                              <>
                                <ArrowUp className="h-4 w-4" />
                                Ascending
                              </>
                            ) : (
                              <>
                                <ArrowDown className="h-4 w-4" />
                                Descending
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Results Area with padding when header is sticky */}
        <div className="pt-10 sm:pt-0">
          <div className="p-4 sm:px-5 sm:pt-2 sm:pb-8">
            <div className="max-w-6xl mx-auto">
              {/* Upgrade Banner */}
              {showUpgradeBanner && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ 
                    opacity: 1,
                    y: 0,
                    transition: {
                      duration: 0.3,
                      ease: [0.4, 0, 0.2, 1]
                    }
                  }}
                  exit={{ 
                    opacity: 0,
                    y: -20,
                    transition: { 
                      duration: 0.2,
                      ease: [0.4, 0, 1, 1]
                    }
                  }}
                  className="mb-3"
                >
                  <UpgradeBanner
                    buttonText="Get Discovered"
                    description="put your company on the map—and see who's looking"
                    onClose={handleBannerClose}
                    onClick={handleBannerClick}
                  />
                </motion.div>
              )}

              <div className="space-y-3">
                {isLoading && page === 1 ? (
                  Array.from({ length: 6 }).map((_, index) => (
                    <div
                      key={`skeleton-${index}`}
                      className={cn(
                        "p-4 sm:p-6",
                        "bg-gray-50 dark:bg-zinc-900",
                        "border border-gray-200 dark:border-zinc-800",
                        "rounded-xl"
                      )}
                    >
                      {/* Mobile Layout */}
                      <div className="block sm:hidden w-full">
                        <div className="flex items-start gap-3">
                          {/* Logo */}
                          <div className="w-10 h-10 bg-gray-200 dark:bg-zinc-800 rounded-md animate-pulse" />
                          
                          {/* Company Info */}
                          <div className="flex-1 min-w-0">
                            <div className="h-5 w-32 bg-gray-200 dark:bg-zinc-800 rounded-md animate-pulse mb-2" />
                            <div className="h-4 w-24 bg-gray-200 dark:bg-zinc-800 rounded-md animate-pulse" />
                          </div>
                        </div>
                        
                        {/* Stats */}
                        <div className="flex items-center gap-2 mt-3">
                          <div className="h-4 w-20 bg-gray-200 dark:bg-zinc-800 rounded-md animate-pulse" />
                          <div className="h-4 w-16 bg-gray-200 dark:bg-zinc-800 rounded-md animate-pulse" />
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="grid grid-cols-2 gap-2 mt-3">
                          <div className="h-8 bg-gray-200 dark:bg-zinc-800 rounded-md animate-pulse" />
                          <div className="h-8 bg-gray-200 dark:bg-zinc-800 rounded-md animate-pulse" />
                        </div>
                      </div>

                      {/* Desktop Layout */}
                      <div className="hidden sm:block">
                        <div className="flex items-start gap-4">
                          {/* Left side with logo and main info */}
                          <div className="flex items-start gap-4 flex-1 min-w-0">
                            {/* Logo */}
                            <div className="w-14 h-14 bg-gray-200 dark:bg-zinc-800 rounded-xl animate-pulse" />
                            
                            {/* Main Info */}
                            <div className="flex-1 min-w-0">
                              <div className="h-6 w-48 bg-gray-200 dark:bg-zinc-800 rounded-lg animate-pulse mb-3" />
                              
                              <div className="flex items-center gap-3 mb-3">
                                <div className="h-5 w-32 bg-gray-200 dark:bg-zinc-800 rounded-md animate-pulse" />
                                <div className="h-5 w-24 bg-gray-200 dark:bg-zinc-800 rounded-md animate-pulse" />
                                <div className="h-5 w-20 bg-gray-200 dark:bg-zinc-800 rounded-md animate-pulse" />
                              </div>

                              {/* Stats Row */}
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1">
                                  <div className="flex gap-0.5">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                      <div key={i} className="w-4 h-4 bg-gray-200 dark:bg-zinc-800 rounded animate-pulse" />
                                    ))}
                                  </div>
                                  <div className="h-4 w-16 bg-gray-200 dark:bg-zinc-800 rounded animate-pulse ml-2" />
                                </div>
                                <div className="h-4 w-24 bg-gray-200 dark:bg-zinc-800 rounded animate-pulse" />
                              </div>
                            </div>
                          </div>

                          {/* Right side actions */}
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-24 bg-gray-200 dark:bg-zinc-800 rounded-md animate-pulse" />
                            <div className="h-8 w-24 bg-gray-200 dark:bg-zinc-800 rounded-md animate-pulse" />
                          </div>
                        </div>

                        {/* Active Projects */}
                        <div className="mt-3 pl-18">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="h-4 w-24 bg-gray-200 dark:bg-zinc-800 rounded animate-pulse" />
                            <div className="h-4 w-4 bg-gray-200 dark:bg-zinc-800 rounded animate-pulse" />
                            <div className="h-4 w-16 bg-gray-200 dark:bg-zinc-800 rounded animate-pulse" />
                          </div>
                          <div className="flex gap-3">
                            {Array.from({ length: 2 }).map((_, i) => (
                              <div 
                                key={i}
                                className="w-[200px] h-[48px] bg-gray-200 dark:bg-zinc-800 rounded-lg animate-pulse"
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : providers.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-16 w-full"
                  >
                    <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gray-100 dark:bg-zinc-900 flex items-center justify-center">
                      <Building2 className="h-8 w-8 text-gray-500 dark:text-zinc-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      No matches found
                    </h3>
                    <p className="text-gray-500 dark:text-zinc-400 max-w-md mx-auto">
                      Try adjusting your filters or search criteria to find more partners.
                    </p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => {
                        setFilters([]);
                        setSearchQuery('');
                      }}
                    >
                      Clear All
                    </Button>
                  </motion.div>
                ) : (
                  <>
                    <div className="relative space-y-3">
                      {providers.map((provider, index) => (
                        <motion.div
                          key={provider._id}
                          initial={{ opacity: 0, y: 15, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{
                            duration: 0.35,
                            delay: Math.min(index * 0.05, 0.3),
                            ease: [0.21, 1.02, 0.73, 0.99],
                          }}
                          className={cn(
                            "group p-4 sm:p-6",
                            "bg-gray-50 dark:bg-zinc-900",
                            "border border-gray-200 dark:border-zinc-800",
                            "rounded-xl transition-colors duration-200",
                            "hover:border-gray-300 dark:hover:border-zinc-700",
                            "hover:bg-gray-100/50 dark:hover:bg-zinc-900/80",
                            "cursor-pointer"
                          )}
                          onClick={(e) => {
                            // Only handle click if it's directly on the card
                            if (e.target === e.currentTarget || e.target instanceof Element && e.currentTarget.contains(e.target) && !e.target.closest('button')) {
                              handleProviderClick(provider);
                            }
                          }}
                        >
                          {/* Mobile Layout */}
                          <div className="block sm:hidden w-full">
                            <div className="flex items-start gap-3">
                              {/* Company Logo */}
                              <div className="relative w-10 h-10 bg-white dark:bg-zinc-800 rounded-md flex items-center justify-center shrink-0">
                                {getCompanyLogo(provider) ? (
                                  // <Image
                                  //   src={getCompanyLogo(provider) as string}
                                  //   alt={provider.name}
                                  //   width={40}
                                  //   height={40}
                                  //   className="rounded-md"
                                  // />
                                  <img
                                    src={getCompanyLogo(provider) as string}
                                    alt={provider.name}
                                    className="w-full h-full object-contain rounded-xl"
                                  />
                                ) : (
                                  <Building2 className="h-5 w-5 text-gray-400" />
                                )}
                              </div>
                              
                              {/* Company Name and Type */}
                              <div className="min-w-0 flex-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleProviderClick(provider);
                                  }}
                                  className="text-base font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left truncate block w-full"
                                >
                                  {provider.name}
                                </button>
                                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                                  <Building2 className="h-3 w-3 shrink-0" />
                                  <span className="truncate">{formatCategoriesForDisplay(provider.categories, 2).displayText || 'Company'}</span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Stats and Badges */}
                            <div className="flex items-center gap-2 mt-3 text-xs">
                              <div className="flex items-center gap-1.5" role="group" aria-label={provider.rating ? `Rating: ${provider.rating} out of 5` : 'No reviews yet'}>
                                <div 
                                  className="flex"
                                  onMouseLeave={() => setHoverRatings(prev => {
                                    const next = new Map(prev);
                                    next.delete(provider._id);
                                    return next;
                                  })}
                                >
                                  {Array.from({ length: 5 }).map((_, i) => (
                                    <button
                                      key={i}
                                      type="button"
                                      className="p-0.5 hover:scale-110 transition-transform"
                                      onMouseEnter={() => setHoverRatings(prev => new Map(prev).set(provider._id, i + 1))}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleProviderClick(provider, true, false);
                                        setInitialRating(i + 1);
                                      }}
                                    >
                                      <Star
                                        className={cn(
                                          "h-3.5 w-3.5",
                                          (hoverRatings.get(provider._id) && i < hoverRatings.get(provider._id)!) || 
                                          (provider.rating && i < Math.floor(provider.rating))
                                            ? "text-yellow-500 fill-yellow-500"
                                            : "text-gray-300 dark:text-gray-600",
                                          "cursor-pointer"
                                        )}
                                      />
                                    </button>
                                  ))}
                                </div>
                                {provider.rating ? (
                                  <span className="text-xs text-gray-500">
                                    ({provider.reviewCount} {provider.reviewCount === 1 ? 'review' : 'reviews'})
                                  </span>
                                ) : (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-1.5 text-xs text-gray-500 hover:text-blue-600"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleProviderClick(provider, true, false);
                                    }}
                                  >
                                    Add Review
                                  </Button>
                                )}
                              </div>
                              {provider.is_verified ? (
                                <Badge variant="secondary" className="bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                  <BadgeCheck className="h-3.5 w-3.5 mr-1" />
                                  Verified
                                </Badge>
                              ) : pendingClaims.has(provider.company_id) ? (
                                <Button
                                  variant="ghost"
                                  className="h-6 px-2.5 text-xs flex items-center gap-2"
                                  onClick={handlePendingReviewClick}
                                >
                                  <Clock className="h-3! w-3! animate-pulse" />
                                  Pending Review
                                </Button>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2 text-xs flex items-center gap-1 text-gray-500 hover:text-blue-600"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleProviderClick(provider, false, true);
                                  }}
                                >
                                  <BadgeHelp className="h-3 w-3" />
                                  Claim Company
                                </Button>
                              )}
                            </div>
                            
                            {/* Action Buttons */}
                            <div className="grid grid-cols-2 gap-2 mt-3">
                              <Button
                                variant="ghost"
                                className="h-8 text-xs text-gray-500"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleProviderClick(provider);
                                }}
                              >
                                View Profile
                                <ArrowUpRight className="h-3 w-3 ml-1" />
                              </Button>
                              <Button
                                variant={
                                  bookmarkedCompanies.has(provider.company_id) ? "secondary" :
                                  selectedProviders.includes(provider._id) ? "secondary" : "outline"
                                }
                                className={cn(
                                  "h-8 text-xs",
                                  bookmarkedCompanies.has(provider.company_id)
                                    ? "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600"
                                    : selectedProviders.includes(provider._id)
                                    ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600"
                                    : "border-gray-200"
                                )}
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  
                                  // Handle saved/unsaved toggle
                                  if (bookmarkedCompanies.has(provider.company_id)) {
                                    // Remove from saved companies
                                    try {
                                      const { error } = await supabase
                                        .from('saved_companies')
                                        .delete()
                                        .eq('user_id', user?.id)
                                        .eq('company_id', provider.company_id);

                                      if (!error) {
                                        setBookmarkedCompanies(prev => {
                                          const next = new Set(prev);
                                          next.delete(provider.company_id);
                                          return next;
                                        });
                                        toast.success(`Removed ${provider.name} from saved companies`);
                                      } else {
                                        console.error('Error removing bookmark:', error);
                                        toast.error('Failed to remove bookmark');
                                      }
                                    } catch (error) {
                                      console.error('Error removing bookmark:', error);
                                      toast.error('Failed to remove bookmark');
                                    }
                                  } else {
                                    // Add to selection list for batch saving
                                    setSelectedProviders(prev => 
                                      prev.includes(provider._id) 
                                        ? prev.filter(id => id !== provider._id)
                                        : [...prev, provider._id]
                                    );
                                  }
                                }}
                              >
                                {bookmarkedCompanies.has(provider.company_id) ? (
                                  <>
                                    <Bookmark className="h-3.5 w-3.5 mr-1.5 fill-current" />
                                    Saved
                                  </>
                                ) : selectedProviders.includes(provider._id) ? (
                                  <>
                                    <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                                    Selected
                                  </>
                                ) : (
                                  'Add to List'
                                )}
                              </Button>
                            </div>
                            
                            {/* Active Projects */}
                            {provider.activeProjects && provider.activeProjects.length > 0 && (
                              <div className="mt-3">
                                <div className="flex items-center gap-2 mb-2">
                                  <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                    Active Projects
                                  </h4>
                                  <span className="text-xs text-gray-500">•</span>
                                  {provider.projectCount > provider.activeProjects.length ? (
                                    <span className="text-xs text-gray-500">
                                      Showing {provider.activeProjects.length} of {provider.projectCount}
                                    </span>
                                  ) : (
                                    <span className="text-xs text-gray-500">{provider.projectCount} total</span>
                                  )}
                                </div>
                                <div className="grid gap-2">
                                  {provider.activeProjects.map((project, idx) => (
                                    <motion.div
                                      key={idx}
                                      whileHover={{ scale: 1.01 }}
                                      whileTap={{ scale: 0.99 }}
                                    >
                                      <Link
                                        href={`/project/${project.slug}`}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                        }}
                                        className={cn(
                                          "w-full px-3 py-2 rounded-lg",
                                          "bg-white dark:bg-zinc-800",
                                          "border border-gray-200 dark:border-zinc-700",
                                          "transition-all duration-200",
                                          "hover:border-gray-300 dark:hover:border-zinc-600",
                                          "text-left block"
                                        )}
                                      >
                                        <div className="flex items-center justify-between">
                                          <div className="min-w-0 flex-1">
                                            <div className="font-medium text-gray-900 dark:text-white text-sm truncate">
                                              {project.name}
                                            </div>
                                            <div className="text-xs text-gray-500 dark:text-zinc-400 truncate">
                                              {project.city && project.neighborhood ? (
                                                <>
                                                  {project.city} • {project.neighborhood}
                                                </>
                                              ) : (
                                                project.address
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      </Link>
                                    </motion.div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Desktop Layout */}
                          <div className="hidden sm:block">
                            <div className="flex items-start gap-4">
                              {/* Left side with logo and main info */}
                              <div className="flex items-start gap-4 flex-1 min-w-0">
                                {/* Logo */}
                                <div 
                                  className="relative w-14 h-14 bg-white dark:bg-zinc-800 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform cursor-pointer shrink-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleProviderClick(provider);
                                  }}
                                >
                                  {getCompanyLogo(provider) ? (
                                    <img
                                      src={getCompanyLogo(provider) as string}
                                      alt={provider.name}
                                      className="w-full h-full object-contain rounded-xl"
                                    />
                                  ) : (
                                    <Building2 className="h-7 w-7 text-gray-500 dark:text-zinc-400" />
                                  )}
                                </div>
                                
                                {/* Main Info */}
                                <div className="flex-1 min-w-0">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleProviderClick(provider);
                                    }}
                                    className="text-base font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left truncate"
                                  >
                                    {provider.name}
                                  </button>
                                  
                                  <div className="flex items-center gap-3 mt-1.5 text-sm">
                                    <span className="flex items-center gap-1.5 text-gray-500 dark:text-zinc-400">
                                      <Building2 className="h-4 w-4 transform-gpu" />
                                      <span className="truncate">{formatCategoriesForDisplay(provider.categories, 2).displayText || 'Company'}</span>
                                    </span>
                                    {provider.location && (
                                      <span className="flex items-center gap-1.5 text-gray-500 dark:text-zinc-400">
                                        <MapPin className="h-4 w-4 transform-gpu" />
                                        <span className="truncate">{provider.location}</span>
                                      </span>
                                    )}
                                    {provider.is_verified ? (
                                      <Badge variant="secondary" className="bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 h-5">
                                        <BadgeCheck className="h-3.5 w-3.5 mr-1 transform-gpu" />
                                        Verified
                                      </Badge>
                                    ) : pendingClaims.has(provider.company_id) ? (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 px-1.5 text-xs flex items-center gap-1 text-gray-500 hover:text-blue-600"
                                        onClick={handlePendingReviewClick}
                                      >
                                        <Clock className="h-3! w-3! animate-pulse transform-gpu" />
                                        Pending Review
                                      </Button>
                                    ) : (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 px-1.5 text-xs flex items-center gap-1 text-gray-500 hover:text-blue-600"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleProviderClick(provider, false, true);
                                        }}
                                      >
                                        <BadgeHelp className="h-3 w-3 transform-gpu" />
                                        Claim Company
                                      </Button>
                                    )}
                                  </div>

                                  {/* Stats Row */}
                                  <div className="flex items-center gap-4 mt-2">
                                    <div className="flex items-center gap-1.5" role="group" aria-label={provider.rating ? `Rating: ${provider.rating} out of 5` : 'No reviews yet'}>
                                      <div 
                                        className="flex"
                                        onMouseLeave={() => setHoverRatings(prev => {
                                          const next = new Map(prev);
                                          next.delete(provider._id);
                                          return next;
                                        })}
                                      >
                                        {Array.from({ length: 5 }).map((_, i) => (
                                          <button
                                            key={i}
                                            type="button"
                                            className="p-0.5 hover:scale-110 transition-transform"
                                            onMouseEnter={() => setHoverRatings(prev => new Map(prev).set(provider._id, i + 1))}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleProviderClick(provider, true, false);
                                              setInitialRating(i + 1);
                                            }}
                                          >
                                            <Star
                                              className={cn(
                                                "h-3.5 w-3.5 transform-gpu",
                                                (hoverRatings.get(provider._id) && i < hoverRatings.get(provider._id)!) || 
                                                (provider.rating && i < Math.floor(provider.rating))
                                                  ? "text-yellow-500 fill-yellow-500"
                                                  : "text-gray-300 dark:text-gray-600",
                                                "cursor-pointer"
                                              )}
                                            />
                                          </button>
                                        ))}
                                      </div>
                                      {provider.rating ? (
                                        <span className="text-xs text-gray-500">
                                          ({provider.reviewCount} {provider.reviewCount === 1 ? 'review' : 'reviews'})
                                        </span>
                                      ) : (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 px-1.5 text-xs text-gray-500 hover:text-blue-600"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleProviderClick(provider, true, false);
                                          }}
                                        >
                                          Add Review
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Right side actions */}
                              <div className="flex flex-col items-end gap-2">
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 text-gray-500"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleProviderClick(provider);
                                    }}
                                  >
                                    View Profile
                                    <ArrowUpRight className="h-3 w-3 ml-1 transform-gpu" />
                                  </Button>
                                  <Button
                                    variant={
                                      bookmarkedCompanies.has(provider.company_id) ? "secondary" :
                                      selectedProviders.includes(provider._id) ? "secondary" : "outline"
                                    }
                                    size="sm"
                                    className={cn(
                                      "h-8",
                                      bookmarkedCompanies.has(provider.company_id)
                                        ? "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400"
                                        : selectedProviders.includes(provider._id)
                                        ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                                        : "border-gray-200 dark:border-zinc-800"
                                    )}
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      
                                      // Handle saved/unsaved toggle
                                      if (bookmarkedCompanies.has(provider.company_id)) {
                                        // Remove from saved companies
                                        try {
                                          const { error } = await supabase
                                            .from('saved_companies')
                                            .delete()
                                            .eq('user_id', user?.id)
                                            .eq('company_id', provider.company_id);

                                          if (!error) {
                                            setBookmarkedCompanies(prev => {
                                              const next = new Set(prev);
                                              next.delete(provider.company_id);
                                              return next;
                                            });
                                            toast.success(`Removed ${provider.name} from saved companies`);
                                          } else {
                                            console.error('Error removing bookmark:', error);
                                            toast.error('Failed to remove bookmark');
                                          }
                                        } catch (error) {
                                          console.error('Error removing bookmark:', error);
                                          toast.error('Failed to remove bookmark');
                                        }
                                      } else {
                                        // Add to selection list for batch saving
                                        setSelectedProviders(prev => 
                                          prev.includes(provider._id) 
                                            ? prev.filter(id => id !== provider._id)
                                            : [...prev, provider._id]
                                        );
                                      }
                                    }}
                                  >
                                    {bookmarkedCompanies.has(provider.company_id) ? (
                                      <>
                                        <Bookmark className="h-4 w-4 mr-1.5 transform-gpu fill-current" />
                                        Saved
                                      </>
                                    ) : selectedProviders.includes(provider._id) ? (
                                      <>
                                        <CheckCircle className="h-4 w-4 mr-1.5 transform-gpu" />
                                        Selected
                                      </>
                                    ) : (
                                      'Add to List'
                                    )}
                                  </Button>
                                </div>
                              </div>
                            </div>

                            {/* Active Projects - More Compact Layout */}
                            {provider.activeProjects && provider.activeProjects.length > 0 && (
                              <div className="mt-3 pl-18">
                                <div className="flex items-center gap-2 mb-2">
                                  <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                    Active Projects
                                  </h4>
                                  <span className="text-xs text-gray-500">•</span>
                                  {provider.projectCount > provider.activeProjects.length ? (
                                    <span className="text-xs text-gray-500">
                                      Showing {provider.activeProjects.length} of {provider.projectCount}
                                    </span>
                                  ) : (
                                    <span className="text-xs text-gray-500">{provider.projectCount} total</span>
                                  )}
                                </div>
                                <div className="flex gap-3 overflow-x-auto pb-1 -mr-6 pr-6 -ml-2 pl-2 scrollbar-none">
                                  {provider.activeProjects.map((project, idx) => (
                                    <motion.div
                                      key={idx}
                                      whileHover={{ scale: 1.01 }}
                                      whileTap={{ scale: 0.99 }}
                                      className="shrink-0"
                                    >
                                      <Link
                                        href={`/project/${project.slug}`}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                        }}
                                        className={cn(
                                          "px-3 py-2 rounded-lg",
                                          "bg-white dark:bg-zinc-800",
                                          "border border-gray-200 dark:border-zinc-700",
                                          "transition-all duration-200",
                                          "hover:border-gray-300 dark:hover:border-zinc-600",
                                          "hover:bg-gray-50 dark:hover:bg-zinc-700/50",
                                          "text-left block"
                                        )}
                                      >
                                        <div className="w-[200px]">
                                          <div className="font-medium text-gray-900 dark:text-white text-sm truncate">
                                            {project.name}
                                          </div>
                                          <div className="text-xs text-gray-500 dark:text-zinc-400 truncate">
                                            {project.city && project.neighborhood ? (
                                              <>
                                                {project.city} • {project.neighborhood}
                                              </>
                                            ) : (
                                              project.address
                                            )}
                                          </div>
                                        </div>
                                      </Link>
                                    </motion.div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    {hasMore && (
                      <motion.button
                        onClick={loadMore}
                        className={cn(
                          "w-full p-3 mt-6",
                          "bg-gray-50 dark:bg-zinc-900",
                          "hover:bg-gray-100 dark:hover:bg-zinc-700",
                          "rounded-xl border border-gray-200 dark:border-zinc-700",
                          "text-sm text-gray-600 dark:text-zinc-300",
                          "transition-colors duration-200",
                          "flex items-center justify-center gap-2",
                          isLoading && "opacity-50 cursor-not-allowed"
                        )}
                        whileHover={{ y: -2 }}
                        whileTap={{ y: 0 }}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <>
                            <span>Loading...</span>
                            <Loader2 className="h-4 w-4 animate-spin" />
                          </>
                        ) : (
                          <>
                            <span>Show More</span>
                            <ChevronDown className="w-4 h-4" />
                          </>
                        )}
                      </motion.button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Selected Providers Action Bar - Fixed at bottom for mobile */}
      {selectedProviders.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className={cn(
            "fixed bottom-0 left-0 right-0 sm:left-auto sm:right-6 sm:bottom-6",
            "bg-white dark:bg-zinc-900",
            "border-t border-gray-200 dark:border-zinc-800 sm:border sm:rounded-xl",
            "p-4 shadow-2xl",
            "z-50"
          )}
        >
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <Badge variant="secondary" className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                {selectedProviders.length} selected
              </Badge>
              <div className="hidden sm:block h-4 w-px bg-gray-200 dark:bg-zinc-800" />
              {/* <div className="text-sm text-gray-500 dark:text-zinc-400">
                Total Project Value: {selectedProviders.length * 50}M+
              </div> */}
            </div>
            <Button 
              className="w-full sm:w-auto bg-blue-600 text-white hover:bg-blue-700"
              onClick={handleSaveCompanies}
              disabled={isSavingCompanies || selectedProviders.length === 0}
            >
              {isSavingCompanies ? (
                <>
                  <Loader2 className="mr-0.5 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  {(() => {
                    const selectedCompanies = providers.filter(p => selectedProviders.includes(p._id));
                    const alreadySavedCount = selectedCompanies.filter(c => bookmarkedCompanies.has(c.company_id)).length;
                    const notSavedCount = selectedCompanies.length - alreadySavedCount;
                    const totalCount = selectedCompanies.length;
                    
                    if (alreadySavedCount > 0 && notSavedCount > 0) {
                      return totalCount === 1 ? "Update Bookmark" : "Update Bookmarks";
                    } else if (alreadySavedCount > 0) {
                      return totalCount === 1 ? "Remove from Saved" : "Remove from Saved";
                    } else {
                      return totalCount === 1 ? "Save Company" : "Save Companies";
                    }
                  })()}
                  <Bookmark className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </motion.div>
      )}

      {/* Provider Details Dialog */}
      {selectedProvider && (
        <CompanyDialog
          company={selectedProvider}
          onClose={() => {
            // Refresh the company data when dialog closes to ensure marketplace is up-to-date
            refreshCompany(selectedProvider.company_id);
            setSelectedProvider(null);
            setShowInitialReview(false);
            setShowInitialClaim(false);
          }}
          initialShowReview={showInitialReview}
          initialShowClaim={showInitialClaim}
          initialRating={initialRating}
          pendingClaimStatus={pendingClaims.has(selectedProvider.company_id)}
          refreshCompany={refreshCompany}
          userCompanies={userCompanies}
        />
      )}

      {/* Upsell Dialog */}
      <ClaimCompanyFlow
        isOpen={showCompanyFlow}
        onClose={() => setShowCompanyFlow(false)}
        onSubmit={handleClaimSubmit}
        company={selectedUnclaimedCompany || undefined}
        isNew={selectedUnclaimedCompany?._id === ''}
      />

      {/* Upsell Claim Modal */}
      <ClaimUpsell
        isOpen={showClaimCompany}
        onClose={() => setShowClaimCompany(false)}
        onClaimExisting={handleClaimExisting}
        onAddNew={handleAddNew}
      />

      <AuthModal 
        open={showAuthModal}
        onOpenChange={setShowAuthModal}
        trigger={<div />}
        returnTo="/directory"
      />

      {/* Add the Pricing Dialog */}
      <PricingDialog
        isOpen={showPricingDialog}
        onOpenChange={setShowPricingDialog}
        // defaultPlan="pro"
      />
    </div>
  );
});

export { MarketplaceComponent as default };