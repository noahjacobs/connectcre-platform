"use client";

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useState, useEffect } from 'react';
import { Company } from '@/components/companies';
import { Building2, ExternalLink, Sparkles, Target, X, Loader2, ChevronDown, Award, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useSupabase } from "@/lib/providers/supabase-context";
import { useAuth } from '@/lib/providers/auth-context';
import { useUserCompanies, type UserCompany } from '@/hooks/use-user-companies';
import { toast } from 'sonner';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useSubscription } from '@/lib/providers/subscription-context';
import { PricingDialog } from '@/components/ui/pricing-dialog';
import { AuthModal } from '@/components/ui/auth-modal';
import { loadStripe } from '@stripe/stripe-js';
import { CompanyDialog, type Company as DialogCompanyType } from '@/components/companies';

// Load Stripe outside component to avoid recreating on render
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface CompanySpotlightProps {
  projectSlug: string;
  userCompanies?: UserCompany[];
}

// Update the type to match the direct company data
type SpotlightCompany = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo_url?: string;
  uploaded_logo_url?: string;
};

export default function CompanySpotlight({ projectSlug, userCompanies = [] }: CompanySpotlightProps) {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const { hasMembershipAccess } = useSubscription();
  const [showPricingDialog, setShowPricingDialog] = useState(false);
  const [spotlightCompanies, setSpotlightCompanies] = useState<SpotlightCompany[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showCompanyDialog, setShowCompanyDialog] = useState(false);
  const [selectedCompanyForDialog, setSelectedCompanyForDialog] = useState<DialogCompanyType | null>(null);
  const [isFetchingCompanyDetails, setIsFetchingCompanyDetails] = useState(false);
  const { supabase } = useSupabase();

  // State for purchase flow
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const fetchSpotlights = async () => {
    setIsLoading(true);
    setError(null);
    if (!supabase) return;

    try {
      const { data, error: rpcError } = await supabase.rpc('get_active_spotlight_companies', {
        p_project_slug: projectSlug,
      });

      if (rpcError) {
        throw rpcError;
      }

      // // Duplicate the company for testing if there's only one
      // if (data && data.length === 1) {
      //   const company = data[0];
      //   const duplicates = Array(5).fill(0).map((_, index) => ({
      //     ...company,
      //     id: `${company.id}-dup-${index}` // Create unique IDs for React keys
      //   }));
      //   setSpotlightCompanies([company, ...duplicates]); // 1 original + 9 duplicates = 10 total
      // } else {
      //   // Data is now directly an array of companies
      //   setSpotlightCompanies(data || []);
      // }

      setSpotlightCompanies(data || []);

    } catch (err: any) {
      console.error('Error fetching spotlight companies:', err);
      setError('Failed to load featured companies.');
      setSpotlightCompanies([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (projectSlug) {
      fetchSpotlights();
    }
  }, [projectSlug]);

  // Check for spotlight_success parameter and show toast
  useEffect(() => {
    const spotlightSuccess = searchParams.get('spotlight_success');
    if (spotlightSuccess === 'true') {
      toast.success('Your company has been successfully featured!');
      fetchSpotlights(); // Re-fetch the spotlights
    }
  }, [searchParams]);

  const handlePurchaseClick = async () => {
    if (!selectedCompanyId) {
      toast.error('Please select a company to feature.');
      return;
    }
    setIsPurchasing(true);
    try {
      const response = await fetch('/api/create-spotlight-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ projectSlug, companyId: selectedCompanyId }),
      });

      const { sessionId, error: apiError } = await response.json();

      if (!response.ok || apiError) {
        throw new Error(apiError || 'Failed to create checkout session.');
      }

      if (!sessionId) {
        throw new Error('Missing session ID from server.');
      }

      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error('Stripe.js has not loaded yet.');
      }
      
      const { error: stripeError } = await stripe.redirectToCheckout({ sessionId });

      if (stripeError) {
        console.error('Stripe redirect error:', stripeError);
        toast.error(stripeError.message || 'Failed to redirect to payment.');
      }

    } catch (err: any) {
      console.error('Purchase initiation failed:', err);
      toast.error(err.message || 'Could not initiate purchase. Please try again.');
    } finally {
      setIsPurchasing(false);
    }
  };

  const nextCompany = () => {
    // For an odd number of companies, ensure we can still navigate to the last page
    const maxStartIndex = Math.max(0, spotlightCompanies.length - (spotlightCompanies.length % 2 === 0 ? 2 : 1));
    setCurrentIndex((prev) => Math.min(prev + 2, maxStartIndex));
  };

  const previousCompany = () => {
    setCurrentIndex((prev) => Math.max(prev - 2, 0));
  };

  // Calculate the total number of pages
  const totalPages = Math.ceil(spotlightCompanies.length / 2);
  // Calculate the current page (1-based)
  const currentPage = Math.ceil((currentIndex + 1) / 2);

  // Function to fetch full company details and open dialog
  const handleCompanyClick = async (spotlightCompany: SpotlightCompany) => {
    if (isFetchingCompanyDetails || !supabase) return; // Prevent multiple clicks while fetching

    setIsFetchingCompanyDetails(true);
    setSelectedCompanyForDialog(null); // Clear previous selection immediately
    setShowCompanyDialog(false); // Ensure dialog is closed if it was somehow open

    try {
      const { data: fullCompany, error: fetchError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', spotlightCompany.id)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      if (!fullCompany) {
        throw new Error('Company details not found.');
      }

      // Transform Supabase data to match the DialogCompanyType
      const transformedCompany = {
        // SanityDocument fields
        _id: fullCompany.id, 
        _type: "company",
        _createdAt: fullCompany.created_at,
        _updatedAt: fullCompany.updated_at,
        
        // Base SanityCompany fields
        name: fullCompany.name,
        slug: { _type: "slug", current: fullCompany.slug || '' },
        description: fullCompany.description || undefined,
        logo: undefined,
        website: fullCompany.website_url || undefined,
        
        // Extended fields used by CompanyDialog
        company_id: fullCompany.id,
        uploaded_logo_url: fullCompany.uploaded_logo_url || undefined,
        primaryRole: fullCompany.role || undefined,
        location: fullCompany.address || undefined,
        is_verified: fullCompany.is_verified || false,
        contact: { website: fullCompany.website_url || undefined },

        // Add missing required fields
        rating: fullCompany.rating || null,
        reviewCount: fullCompany.review_count || 0,
        projectCount: fullCompany.project_count || 0,
        activeProjects: [],
        completedProjects: [],
      } as DialogCompanyType;

      setSelectedCompanyForDialog(transformedCompany);
      setShowCompanyDialog(true); // Open the dialog

    } catch (err: any) {
      console.error('Error fetching full company details:', err);
      toast.error('Failed to load company details. Please try again.');
      // Optionally reset selection or keep dialog closed
      setSelectedCompanyForDialog(null);
      setShowCompanyDialog(false);
    } finally {
      setIsFetchingCompanyDetails(false);
    }
  };

  if (isLoading) {
    return (
      <Skeleton className="h-72 bg-zinc-100/70 dark:bg-zinc-800/60 rounded-xl p-6 space-y-4" />
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 p-6">
        <p className="text-red-700 dark:text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <>
    <Dialog open={showPurchaseDialog} onOpenChange={setShowPurchaseDialog}>
      <div className="rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/30 p-6 relative overflow-hidden">
        <div className="absolute top-2 right-2 bg-amber-500 dark:bg-amber-600 text-white px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1">
          <Award className="w-3 h-3" />
          Featured
        </div>
        <h3 className="text-xl font-bold mb-4 text-amber-900 dark:text-amber-200">Company Spotlight</h3>

        {spotlightCompanies.length > 0 ? (
          <div className="space-y-6">
            <div className="relative px-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {spotlightCompanies.slice(currentIndex, Math.min(currentIndex + 2, spotlightCompanies.length)).map((company) => (
                  <div
                    key={company.id}
                    className={cn(
                      "flex flex-col items-center text-center p-6 rounded-lg bg-white dark:bg-zinc-900 shadow-sm cursor-pointer",
                      "transform transition-all duration-200 hover:shadow-md hover:translate-y-[-2px]",
                      "border border-transparent hover:border-amber-200 dark:hover:border-amber-800/50",
                      "relative before:absolute before:inset-0 before:rounded-lg before:bg-linear-to-b before:from-amber-100/30 before:to-transparent before:dark:from-amber-900/10 before:opacity-0 before:transition before:duration-300 hover:before:opacity-100",
                      isFetchingCompanyDetails && "opacity-50"
                    )}
                    onClick={() => !isFetchingCompanyDetails && handleCompanyClick(company)}
                  >
                    <div className="block relative w-24 h-24 rounded-full overflow-hidden border-2 border-amber-300 dark:border-amber-600 hover:border-amber-400 dark:hover:border-amber-500 transition-colors mb-4">
                      <Image
                        src={company.logo_url || company.uploaded_logo_url || '/placeholder-logo.png'}
                        alt={`${company.name} Logo`}
                        layout="fill"
                        objectFit="contain"
                      />
                    </div>
                    <h4 className="text-lg font-semibold text-amber-900 dark:text-amber-200">
                      {company.name}
                    </h4>
                  </div>
                ))}
              </div>
              {spotlightCompanies.length > 2 && (
                <div className="flex flex-col items-center mt-6 gap-2">
                  <div className="flex justify-center items-center gap-3 bg-white dark:bg-zinc-900 py-1.5 px-2 rounded-full shadow-sm">
                    <button
                      onClick={previousCompany}
                      className={cn(
                        "rounded-full p-1.5 flex items-center justify-center",
                        "bg-amber-100 dark:bg-amber-900/30 hover:bg-amber-200 dark:hover:bg-amber-800/50 transition-colors",
                        "focus:outline-none focus:ring-2 focus:ring-amber-500 dark:focus:ring-amber-400",
                        "disabled:opacity-40 disabled:cursor-not-allowed",
                        "disabled:hover:bg-amber-100 dark:disabled:hover:bg-amber-900/30"
                      )}
                      disabled={currentIndex === 0}
                    >
                      <ChevronLeft className="h-4 w-4 text-amber-700 dark:text-amber-300" />
                    </button>
                    <div className="flex items-center px-2 text-xs text-amber-600 dark:text-amber-400 font-medium">
                      <span>{currentPage}</span>
                      <span className="mx-1">/</span>
                      <span>{totalPages}</span>
                    </div>
                    <button
                      onClick={nextCompany}
                      className={cn(
                        "rounded-full p-1.5 flex items-center justify-center",
                        "bg-amber-100 dark:bg-amber-900/30 hover:bg-amber-200 dark:hover:bg-amber-800/50 transition-colors",
                        "focus:outline-none focus:ring-2 focus:ring-amber-500 dark:focus:ring-amber-400",
                        "disabled:opacity-40 disabled:cursor-not-allowed",
                        "disabled:hover:bg-amber-100 dark:disabled:hover:bg-amber-900/30"
                      )}
                      disabled={currentPage >= totalPages}
                    >
                      <ChevronRight className="h-4 w-4 text-amber-700 dark:text-amber-300" />
                    </button>
                  </div>
                  
                  {/* Pagination dots */}
                  <div className="flex gap-2 mt-2">
                    {Array.from({ length: totalPages }).map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentIndex(i * 2)}
                        className={cn(
                          "w-2 h-2 rounded-full transition-all",
                          i * 2 === currentIndex 
                            ? "bg-amber-500 scale-125" 
                            : "bg-amber-200 dark:bg-amber-800 hover:bg-amber-300 dark:hover:bg-amber-700"
                        )}
                        aria-label={`Go to page ${i + 1}`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="text-center mt-6">
              {user && userCompanies && userCompanies.length > 0 ? (
                hasMembershipAccess ? ( // <-- Your new condition here
                  <DialogTrigger asChild>
                    <Button
                      className="bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700 text-white"
                    >
                      Feature Your Company Here
                    </Button>
                  </DialogTrigger>
                ) : (
                  <Button
                    className="bg-blue-500 hover:bg-blue-600 text-white"
                    onClick={() => setShowPricingDialog(true)}
                  >
                    Feature Your Company Here
                  </Button>
                )
              ) : (
                user ? (
                  <Link href="/company?action=create">
                    <Button
                      className="w-full bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700 text-white"
                    >
                      Feature Your Company Here
                    </Button>
                  </Link>
                ) : (
                  <Button
                    className="w-full bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700 text-white"
                    onClick={() => setShowAuthModal(true)}
                  >
                    Sign in to Feature Your Company
                  </Button>
                )
              )}
              {!user && (
                <p className="text-xs text-amber-600 dark:text-amber-500 mt-2">Join DevProjects to purchase a spotlight.</p>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-sm text-amber-700 dark:text-amber-400 mb-3">
              Showcase your company to over 100,000+ CRE professionals interested in this project.
            </p>
            {user && userCompanies && userCompanies.length > 0 ? (
              <DialogTrigger asChild>
                <Button
                  className="w-full bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700 text-white"
                >
                  Feature Your Company Here
                </Button>
              </DialogTrigger>
            ) : (
              user ? (
                <Link href="/company?action=create">
                  <Button
                    className="w-full bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700 text-white"
                  >
                    Feature Your Company Here
                  </Button>
                </Link>
              ) : (
                <Button
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white"
                  onClick={() => setShowAuthModal(true)}
                >
                  Sign in to Feature Your Company
                </Button>
              )
            )}
            {!user && (
              <p className="text-xs text-amber-600 dark:text-amber-500 mt-2">Join DevProjects to purchase a spotlight.</p>
            )}
          </div>
        )}
      </div>

      {/* Purchase Dialog Content */}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Company Spotlight</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <p className="text-sm text-muted-foreground font-bold -my-2">
            Boost your visibility to 100,000+ industry pros.
          </p>
          <p className="text-sm text-muted-foreground">
            Showcase your company's role in this project to 100,000+ readers for just $99. See it across LinkedIn, Instagram and Facebook.
          </p>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="company-select" className="text-right">
              Company
            </Label>
            <Select
              value={selectedCompanyId}
              onValueChange={setSelectedCompanyId}
            >
              <SelectTrigger id="company-select" className="col-span-3">
                <SelectValue placeholder="Select your company" />
              </SelectTrigger>
              <SelectContent className='max-w-[95vw]'>
                {userCompanies.map((company) => {
                  const isFeatured = spotlightCompanies.some(
                    (spotlight) => spotlight.id === company.company_id
                  );
                  return (
                    <SelectItem
                      key={company.company_id}
                      value={company.company_id}
                      disabled={isFeatured}
                      className={isFeatured ? "text-muted-foreground" : ""}
                    >
                      {company.name} {isFeatured && "(Already featured)"}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter className='gap-2'>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isPurchasing}>
              Cancel
            </Button>
          </DialogClose>
          <Button 
            type="button" 
            onClick={handlePurchaseClick} 
            disabled={!selectedCompanyId || isPurchasing}
            className="bg-amber-500 hover:bg-amber-600 text-white"
          >
            {isPurchasing ? <Loader2 className="mr-0.5 h-4 w-4 animate-spin" /> : null}
            {isPurchasing ? 'Processing...' : 'Confirm Purchase ($99)'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    {showCompanyDialog && selectedCompanyForDialog && (
      <CompanyDialog
        company={selectedCompanyForDialog}
        onClose={() => {
          setShowCompanyDialog(false);
          setSelectedCompanyForDialog(null);
        }}
      />
    )}
    <PricingDialog
      isOpen={showPricingDialog}
      onOpenChange={setShowPricingDialog}
    />
    <AuthModal
      open={showAuthModal}
      onOpenChange={setShowAuthModal}
      trigger={<div />}
      returnTo={`/`}
    />
    </>
  );
} 