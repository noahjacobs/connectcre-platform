import { useState, useEffect, useRef, useCallback, Suspense, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PricingDialog } from "@/components/ui/pricing-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { AuthModal } from "@/components/ui/auth-modal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Building2, 
  Clock, 
  CheckCircle2, 
  XCircle,
  AlertCircle,
  BadgeCheck,
  TrendingUp,
  ArrowRight,
  Plus,
  Loader2,
  UserCircle2,
  Mail,
  Eye,
  EyeOff,
  RotateCw,
  ChevronDown,
  ChevronUp,
  Info,
  Check,
  Pencil,
  Trash2,
  Users,
  PlusCircle,
  type LucideIcon,
  HandshakeIcon,
  Search
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useSupabase } from "@/lib/providers/supabase-context";
import { useAuth } from "@/lib/providers/auth-context";
import { ClaimUpsell } from '../claim-upsell';
import { ClaimCompanyFlow } from '../claim-company-flow';
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useRouter, useSearchParams } from "next/navigation";
import { type UserCompany } from '@/hooks/use-user-companies';
import { 
  ProjectsSection,
} from './project-section';
import { ProjectDialog, type ProjectSearchResult } from './project-dialog';
import { ProjectSelectionDialog } from './project-selection-dialog';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Briefcase } from 'lucide-react';
import { fetchProjectBySlug } from "@/components/projects";
import { Input } from "@/components/ui/input";
import { Dialog as SearchDialog, DialogContent as SearchDialogContent, DialogHeader as SearchDialogHeader, DialogTitle as SearchDialogTitle, DialogDescription as SearchDialogDescription, DialogFooter as SearchDialogFooter } from "@/components/ui/dialog";
import { loadStripe } from '@stripe/stripe-js';
import { CompanyManagersSection } from './company-managers-section';
import { MEMBERSHIP_PRICES } from "@/lib/utils/stripe-products";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { useSubscription } from "@/lib/providers/subscription-context";

// Define missing types locally
type ClaimStatus = 'pending' | 'approved' | 'rejected';
type ClaimRequest = any; // TODO: Define proper type
type CompanyApprovalData = any; // TODO: Define proper type

interface CompanyProfileTabProps {
  userCompanies: UserCompany[];
  className?: string;
}

// Update EMPTY_STATES to handle onClick
const EMPTY_STATES = {
  company: {
    title: 'Complete Your Profile',
    description: 'Add details about your company to help others understand your business better. A complete profile helps build trust.',
    icons: [UserCircle2, Mail, BadgeCheck],
    action: {
      label: 'Get Discovered',
      onClick: (showAuthModal: () => void) => showAuthModal(),
    },
  },
};

// Define type for company data extracted from approved claims
type ApprovedCompanyData = {
  id: string;
  company_id: string;
  name: string;
  logo_url: string | undefined;
  uploaded_logo_url: string | undefined;
  is_verified: boolean;
  status: string;
  primary_role?: string;
};

// Add interface for simplified project search result
interface SimpleProjectResult {
    id: string;
    title: string;
    address?: string | null;
    city?: string | null;
    state?: string | null;
}

// Add type for Manager with Profile
interface ManagerWithProfile {
  user_id: string;
  role: 'owner' | 'admin' | 'editor';
  full_name: string | null;
  avatar_url: string | null;
}

// Type for company subscription data (owner's data)
interface OwnerSubscriptionData {
  isCompanyOnMembershipPlan: boolean;
  ownerPlanQuantity: number;
}

// Type for owner seat usage data
interface OwnerSeatUsageData {
  totalManagers: number;
  totalPendingInvites: number;
}

// Add type for Pending Invite with essential details
interface PendingInviteDisplayData {
  id: string; // Invite ID
  invited_email: string;
  role: 'admin' | 'editor';
  created_at: string;
  expires_at: string | null;
}

// --- Define Shape for Managed Company Data ---
interface ManagedCompany extends ApprovedCompanyData { // Reuse fields from ApprovedCompanyData
  currentUserRole: 'owner' | 'admin' | 'editor'; // Role of the logged-in user
}

// Define type for Claim History item, including metadata
interface ClaimHistoryItem {
  id: string; 
  status: ClaimStatus;
  submitted_at: string;
  reviewed_at: string | null;
  feedback: string | null;
  // Add metadata to store original claim details
  metadata: {
    claim_request?: {
      email?: string;
      phone?: string;
      website?: string;
      location?: string;
      logo_url?: string;
      user_name?: string;
      primaryRole?: string;
      category?: string[];
    };
  } | null;
  companies: {
      id: string;
      name: string;
      logo_url?: string | null;
      uploaded_logo_url?: string | null;
  } | null;
}

// Type for RPC function return
type OwnerDetailsRPCResult = {
  is_on_membership_plan: boolean;
  plan_quantity: number;
};

// Add a wrapper component that provides the Suspense boundary
export function CompanyProfileTab({ userCompanies, className }: CompanyProfileTabProps) {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-[calc(100vh-16rem)]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <CompanyProfileTabContent userCompanies={userCompanies} className={className} />
    </Suspense>
  );
}

// Rename the main component to avoid conflicts
function CompanyProfileTabContent({ userCompanies, className }: CompanyProfileTabProps) {
  const [managedCompanies, setManagedCompanies] = useState<ManagedCompany[]>([]);
  const [loadingManagedCompanies, setLoadingManagedCompanies] = useState<'idle' | 'loading' | 'error'>('idle');
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [showCompanyFlow, setShowCompanyFlow] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showEditFlow, setShowEditFlow] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<ManagedCompany | null>(null);
  const [editingClaimId, setEditingClaimId] = useState<string | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [showCompanySelectionDialog, setShowCompanySelectionDialog] = useState(false);
  const [pendingProjectData, setPendingProjectData] = useState<ProjectSearchResult | null>(null);
  const [projectRole, setProjectRole] = useState<string>('');
  const [showProjectDialog, setShowProjectDialog] = useState(false);
  const [selectedProject, setSelectedProject] = useState<{slug: string; title: string; status?: string} | null>(null);
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [showVerificationRequiredDialog, setShowVerificationRequiredDialog] = useState(false);
  const [approvedCompaniesForSelection, setApprovedCompaniesForSelection] = useState<ApprovedCompanyData[]>([]);
  const [showProjectSearchDialog, setShowProjectSearchDialog] = useState(false);
  const [projectSearchTerm, setProjectSearchTerm] = useState("");
  const [projectSearchResults, setProjectSearchResults] = useState<SimpleProjectResult[]>([]);
  const [selectedProjectForSpotlight, setSelectedProjectForSpotlight] = useState<SimpleProjectResult | null>(null);
  const [isSearchingProjects, setIsSearchingProjects] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [companyIdForSpotlight, setCompanyIdForSpotlight] = useState<string | null>(null);
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectJoinHandledRef = useRef(false);
  const dataLoadedRef = useRef(false);
  const refreshHandledRef = useRef(false);
  const createActionHandledRef = useRef(false);
  const [isProcessingSpotlight, setIsProcessingSpotlight] = useState(false);
  const [companyManagersMap, setCompanyManagersMap] = useState<Record<string, ManagerWithProfile[]>>({});
  const [loadingManagersMap, setLoadingManagersMap] = useState<Record<string, boolean>>({});
  const { supabase } = useSupabase();
  // --- UPDATED STATE ---
  // Stores the OWNER's subscription details, keyed by OWNER user_id
  const [ownerSubscriptionMap, setOwnerSubscriptionMap] = useState<Record<string, OwnerSubscriptionData>>({});
  // Stores the OWNER's aggregated seat usage, keyed by OWNER user_id
  const [ownerSeatUsageMap, setOwnerSeatUsageMap] = useState<Record<string, OwnerSeatUsageData>>({});
  // Loading state for owner's data (sub + usage), keyed by OWNER user_id
  const [loadingOwnerDataMap, setLoadingOwnerDataMap] = useState<Record<string, boolean>>({});
  // --- NEW STATE for Pending Invites --- 
  const [companyPendingInvitesMap, setCompanyPendingInvitesMap] = useState<Record<string, PendingInviteDisplayData[]>>({});
  const [loadingPendingInvitesMap, setLoadingPendingInvitesMap] = useState<Record<string, boolean>>({});
  // --- NEW State for triggering reset ---
  const [needsDataReset, setNeedsDataReset] = useState(false);
  // --- NEW State for Claim History --- 
  const [claimHistory, setClaimHistory] = useState<ClaimHistoryItem[]>([]);
  const [loadingClaimHistory, setLoadingClaimHistory] = useState<'idle' | 'loading' | 'error'>('idle');
  const [hasFetchedClaimHistory, setHasFetchedClaimHistory] = useState(false);
  const [accordionValue, setAccordionValue] = useState<string | undefined>(undefined);
  // --- END NEW State ---
  const managerSectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [loadingProjectFromUrl, setLoadingProjectFromUrl] = useState(false);
  // const subscriptionContext = useSubscription();
  const membershipStatus = useSubscription();
  const [showInheritanceWarningDialog, setShowInheritanceWarningDialog] = useState(false);

  // --- Calculate if user is inheriting membership ---
  const shouldShowInheritanceWarning = useMemo(() => {
    // Only calculate when all data is loaded
    if (membershipStatus.isLoading || loadingManagedCompanies === 'loading') return false;
    
    // User must have inherited membership access (not their own subscription)
    if (membershipStatus.isMembershipPlan || !membershipStatus.hasMembershipAccess) return false;
    
    // User must own at least one company (if they don't own any, no conflict)
    const companiesUserOwns = managedCompanies.filter(company => company.currentUserRole === 'owner');
    if (companiesUserOwns.length === 0) return false;
    
    // User must also be a member of companies they don't own
    // (meaning they're getting membership from a company they don't own)
    const companiesUserDoesntOwn = managedCompanies.filter(company => company.currentUserRole !== 'owner');
    
    // Show warning if user owns companies AND gets membership from companies they don't own
    return companiesUserDoesntOwn.length > 0;
  }, [
    membershipStatus.isLoading,
    membershipStatus.isMembershipPlan,
    membershipStatus.hasMembershipAccess,
    loadingManagedCompanies,
    managedCompanies
  ]);
  // --- End Calculation ---

  // --- Fetch Managed Companies Function --- 
  const fetchManagedCompaniesAndRoles = useCallback(async (): Promise<ManagedCompany[]> => {
    if (!user?.id || !supabase) return [];
    setLoadingManagedCompanies('loading');
    try {
        // Define expected shape of the row from Supabase
        type ManagerWithCompany = {
            role: 'owner' | 'admin' | 'editor';
            companies: {
                id: string;
                name: string;
                logo_url: string | null;
                uploaded_logo_url: string | null;
                is_verified: boolean;
                status: string; // Status from companies table
            } | null;
        };

        const { data, error } = await supabase
            .from('company_managers')
            .select('role, companies!inner(id, name, logo_url, uploaded_logo_url, is_verified, status)')
            .eq('user_id', user.id)
            .in('role', ['owner', 'admin', 'editor'])
            .returns<ManagerWithCompany[]>(); // Type the return

        if (error) throw error;

        // Correct Mapping
        const companiesData: ManagedCompany[] = (data || [])
            .filter(item => item.companies != null) // Ensure company data exists
            .map(item => ({
                currentUserRole: item.role,
                id: item.companies!.id, 
                company_id: item.companies!.id,
                name: item.companies!.name,
                logo_url: item.companies!.logo_url ?? undefined,
                uploaded_logo_url: item.companies!.uploaded_logo_url ?? undefined,
                is_verified: item.companies!.is_verified,
                // Cast status here if necessary, or adjust type
                status: item.companies!.status as ClaimStatus, // Assuming companies.status maps to ClaimStatus
                primary_role: '' // Add default or fetch if needed elsewhere
            }));

        // Sort the mapped companies by name alphabetically
        companiesData.sort((a, b) => a.name.localeCompare(b.name));

        setManagedCompanies(companiesData);
        dataLoadedRef.current = true; 
        setLoadingManagedCompanies('idle');
        return companiesData;
    } catch (error) {
        console.error('Error loading managed companies:', error);
        setManagedCompanies([]);
        setLoadingManagedCompanies('error');
        dataLoadedRef.current = true; // Mark as loaded even on error to stop loading state
        return [];
    }
  }, [user?.id]);
  // --- END Fetch Function ---

  // --- Combined useEffect for Initial Load, Refresh, and Project Parameter ---
  useEffect(() => {
    if (user === undefined) {
        projectJoinHandledRef.current = false; // Reset if user logs out
        return;
    }

    const shouldRefresh = searchParams.get('refresh') === 'true';
    const projectSlugFromUrl = searchParams.get('project');
    const action = searchParams.get('action'); // Keep action handling

    const handleProjectParam = async (projectSlug: string, currentCompanies: ManagedCompany[]) => {
      if (projectJoinHandledRef.current) return; // Already handled
      projectJoinHandledRef.current = true; // Mark as handled

      setLoadingProjectFromUrl(true);
      try {
        const projectData = await fetchProjectBySlug(projectSlug);
        if (!projectData) {
          toast.error(`Project with slug "${projectSlug}" not found.`);
                  // Clean up URL even if project not found
        const newParams = new URLSearchParams(searchParams.toString());
        newParams.delete('project');
        const queryString = newParams.toString();
        router.replace(`/company${queryString ? `?${queryString}` : ''}`, { scroll: false });
          setLoadingProjectFromUrl(false);
          return; // Stop processing
        }

        // Convert fetched project data to ProjectSearchResult format if needed
        // Assuming fetchProjectBySlug returns { slug, title, city, neighborhood, status, ... }
        const projectSearchResult: ProjectSearchResult = {
           slug: projectData.slug || '',
           title: projectData.title || 'Untitled Project',
           city: projectData.city_slug || '', // Adjust mapping as needed
           neighborhood: projectData.neighborhood_slug || '', // Adjust mapping as needed
           status: projectData.status || 'unknown', // Add status, default if needed
           // Add other fields if ProjectSearchResult requires them
        };
        setPendingProjectData(projectSearchResult); // Store project data

        // Now, analyze companies based on the *current* managedCompanies state
        const approvedCompanies = currentCompanies.filter(c => c.status === 'approved');

        if (currentCompanies.length === 0) {
            // Case 1: No companies at all
            setShowClaimModal(true);
        } else if (approvedCompanies.length === 0) {
            // Case 2: Companies exist, but none are approved
            setShowVerificationRequiredDialog(true);
        } else if (approvedCompanies.length === 1) {
            // Case 3: Exactly one approved company
            const singleApprovedCompany = approvedCompanies[0];
            setSelectedCompanyId(singleApprovedCompany.id);
            setProjectRole(singleApprovedCompany.primary_role || ''); // Use primary_role
            setShowProjectDialog(true); // Open role confirmation
        } else {
            // Case 4: Multiple approved companies
            setApprovedCompaniesForSelection(approvedCompanies); // Set list for selection
            setShowCompanySelectionDialog(true); // Open company selection
        }

      } catch (error) {
        console.error("Error fetching project by slug:", error);
        toast.error("Failed to load project details.");
      } finally {
        setLoadingProjectFromUrl(false);
        // Always remove the project param after attempting to handle it
        const newParams = new URLSearchParams(searchParams.toString());
        newParams.delete('project');
        const queryString = newParams.toString();
        router.replace(`/company${queryString ? `?${queryString}` : ''}`, { scroll: false });
      }
    };

    const handleActionParam = () => {
       if (action === 'create' && !createActionHandledRef.current) {
            createActionHandledRef.current = true;
            if (user) {
                setShowClaimModal(true);
            } else {
                setShowAuthModal(true);
            }
            const newParams = new URLSearchParams(searchParams.toString());
            newParams.delete('action');
            const queryString = newParams.toString();
            router.replace(`/company${queryString ? `?${queryString}` : ''}`, { scroll: false });
        }
    };

    const loadData = async () => {
      const fetchedCompanies = await fetchManagedCompaniesAndRoles();

      // Only handle project param *after* companies are loaded
      if (projectSlugFromUrl && fetchedCompanies.length >= 0 && !projectJoinHandledRef.current) {
          await handleProjectParam(projectSlugFromUrl, fetchedCompanies);
      }
       // Handle action param after companies are loaded (or even if loading failed)
       handleActionParam();
    };

    if (shouldRefresh) {
        if (!refreshHandledRef.current) {
            refreshHandledRef.current = true;
            projectJoinHandledRef.current = false; // Reset project handling on refresh
            createActionHandledRef.current = false; // Reset action handling
            // Clear state...
            setManagedCompanies([]);
            setCompanyManagersMap({});
            setLoadingManagersMap({});
            setOwnerSubscriptionMap({});
            setOwnerSeatUsageMap({});
            setLoadingOwnerDataMap({});
            setCompanyPendingInvitesMap({});
            setLoadingPendingInvitesMap({});
            setPendingProjectData(null); // Clear pending project
            dataLoadedRef.current = false;

            // Remove refresh param FIRST
            const newParams = new URLSearchParams(searchParams.toString());
            newParams.delete('refresh');
            const queryString = newParams.toString();
            router.replace(`/company${queryString ? `?${queryString}` : ''}`, { scroll: false });

            loadData(); // Reload data
        }
    } else {
        refreshHandledRef.current = false;
        if (user !== null && !dataLoadedRef.current && loadingManagedCompanies !== 'loading') {
             loadData(); // Initial load
        } else if (user !== null && dataLoadedRef.current) {
             // Data already loaded, but check if project/action param needs handling (e.g., navigating back)
             if (projectSlugFromUrl && !projectJoinHandledRef.current) {
                 // Need the current list of companies
                 handleProjectParam(projectSlugFromUrl, managedCompanies);
             }
             handleActionParam(); // Also check action param
        }
    }

  }, [user, searchParams, router, fetchManagedCompaniesAndRoles, loadingManagedCompanies, managedCompanies]); // Add managedCompanies dependency

  const handleClaimSubmit = async () => {
    if (!supabase) return;
    try {
      // Update user's marketplace banner preference
      if (user?.id) {
        await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            has_dismissed_marketplace_banner: true
          });
      }

      setShowCompanyFlow(false);
      dataLoadedRef.current = false; // Force reload of claims
      
      // Reset claim history state to allow refetch
      setLoadingClaimHistory('idle');
      setHasFetchedClaimHistory(false);
      
      // Refresh both managed companies and claim history
      await Promise.all([
        fetchManagedCompaniesAndRoles(),
        fetchClaimHistory()
      ]);
    } catch (error) {
      console.error('Error updating preferences:', error);
      toast.error('Failed to update preferences');
    }
  };

  const handleClaimExisting = (company: any) => {
    setShowClaimModal(false);
    setSelectedCompany({
      ...company,
      isNew: false,
      isEditing: false
    });
    setShowCompanyFlow(true);
    setShowEditFlow(false);
  };

  const handleAddNew = (name: string) => {
    setShowClaimModal(false);
    // Use null for company_id instead of invalid temp string
    // The ClaimCompanyFlow will handle new companies properly
    setSelectedCompany({
      _id: '',
      name,
      projectCount: 0,
      rating: null,
      reviewCount: 0,
      is_verified: false,
      location: null,
      contact: {
        email: null,
        phone: null,
        website: null
      },
      status: 'pending',
      slug: { current: name.toLowerCase().replace(/\s+/g, '-') },
      company_id: null, // Use null instead of invalid temp ID
      isNew: true,
      isEditing: false
    });
    setShowCompanyFlow(true);
    setShowEditFlow(false);
  };

  // Remove VerificationProgress component and simplify the status badges
  const getStatusBadge = (status: ClaimStatus) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="secondary" className="bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 group relative">
            <Clock className="h-3.5 w-3.5 mr-1 animate-pulse" />
            <span>Pending Review</span>
            <TooltipProvider>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Info className="ml-1 h-3 w-3 cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Review typically takes 1-2 business days</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </Badge>
        );
      case 'approved':
        return (
          <Badge variant="secondary" className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
            Verified
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="secondary" className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400">
            <XCircle className="h-3.5 w-3.5 mr-1" />
            Changes Needed
          </Badge>
        );
    }
  };

  // Update empty state action handler
  const handleEmptyStateAction = () => {
    setShowAuthModal(true);
  };

  // --- Update Edit Handler --- 
  const handleEditClaim = async (company: ManagedCompany) => {
    if (!user?.id || !supabase) return; // Need user ID
    setEditingClaimId(company.id); // Indicate loading for this company ID
    try {
        // Fetch the specific approval record for this user and company
        const { data: approvalData, error } = await supabase
            .from('company_approvals')
            .select(`
                id, 
                status, 
                metadata, 
                companies!inner(
                    id, 
                    name, 
                    logo_url, 
                    uploaded_logo_url,
                    is_verified,
                    category
                )
            `)
            .eq('user_id', user.id)       // Match the logged-in user
            .eq('company_id', company.id) // Match the company being edited
            .maybeSingle<CompanyApprovalData>(); // Expect one or zero records

        if (error) throw error;

        if (!approvalData || !approvalData.companies) {
            // Handle case where user doesn't have a direct claim record for this company
            // Maybe they were added directly? Or the record is missing?
            toast.error('Could not find your associated claim record for this company.');
            // TODO: Implement editing live company data directly?
            setEditingClaimId(null);
            return;
        }

        // We found the approval record, map data for the ClaimCompanyFlow
        const claimMetadata = approvalData.metadata?.claim_request || {};
        const fetchedCompany = approvalData.companies;
        const logoUrl = claimMetadata.logo_url || fetchedCompany.logo_url; // Prefer metadata logo if present

        setSelectedCompany({
            // Use data primarily from the approval record and its metadata
            id: fetchedCompany.id,
            company_id: fetchedCompany.id,
            name: fetchedCompany.name,
            logo_url: logoUrl,
            uploaded_logo_url: logoUrl,
            logo: { asset: { url: logoUrl } }, // Mimic Sanity structure if needed by flow
            is_verified: fetchedCompany.is_verified,
            // Get contact/details from metadata
            contact_email: claimMetadata.email,
            contact_phone: claimMetadata.phone,
            website_url: claimMetadata.website,
            address: claimMetadata.location,
            category: claimMetadata.category || fetchedCompany.category || [],
            primaryRole: claimMetadata.primaryRole,
            // Pass editing state and approval details
            isEditing: true,
            isNew: false,
            approval_id: approvalData.id, // Pass the approval ID
            status: approvalData.status // Pass the approval status
        });

        setShowCompanyFlow(true);
        setShowEditFlow(true);
    } catch (error: any) {
        console.error('Error fetching approval data for edit:', error);
        toast.error(`Failed to load company data for editing: ${error.message}`);
    } finally {
        setEditingClaimId(null); // Reset loading state
    }
  };
  // --- End Update ---

  const handleDeleteClick = (company: ManagedCompany) => {
    setCompanyToDelete(company);
  };

  const handleDeleteAssociatedApproval = async (companyId: string) => {
    if (!user?.id || !supabase) return;
    setDeletingItemId(companyId);
    try {
        const { data: approval, error: findError } = await supabase
            .from('company_approvals')
            .select('id')
            .eq('user_id', user.id)
            .eq('company_id', companyId) 
            .maybeSingle();

        if (findError) throw new Error(`Error finding approval record: ${findError.message}`);

        if (!approval) {
            toast.info("No corresponding claim record found to delete.");
            setCompanyToDelete(null);
            setDeletingItemId(null);
            return;
        }

        const { error: deleteError } = await supabase
            .from('company_approvals')
            .delete()
            .eq('id', approval.id);

        if (deleteError) throw deleteError;
        
        setManagedCompanies(prev => prev.filter(c => c.id !== companyId));
        toast.success('Claim record deleted successfully');

    } catch (error: any) {
        console.error('Error deleting claim record:', error);
        toast.error(`Failed to delete claim record: ${error.message}`);
    } finally {
        setDeletingItemId(null);
        setCompanyToDelete(null); 
    }
  };

  const confirmDelete = async () => {
    if (!companyToDelete) return;
    await handleDeleteAssociatedApproval(companyToDelete.id); 
  };

  // Add a handler for when the company flow closes
  const handleCompanyFlowClose = () => {
    setShowCompanyFlow(false);
    setShowEditFlow(false);
  };

  // --- NEW: Function to fetch claim history --- 
  const fetchClaimHistory = useCallback(async () => {
    if (!user?.id || !supabase) {
        return;
    }
    if (loadingClaimHistory === 'loading') {
        return;
    }
    setLoadingClaimHistory('loading');
    setHasFetchedClaimHistory(true); // Mark as attempting fetch
    try {
        type RawHistoryItem = {
            id: string;
            status: string;
            submitted_at: string;
            reviewed_at: string | null;
            feedback: string | null;
            metadata: any | null;
            companies: {
                id: string;
                name: string;
                logo_url: string | null;
                uploaded_logo_url: string | null;
            } | null;
        };

        const { data, error, status } = await supabase
            .from('company_approvals')
            .select('id, status, submitted_at, reviewed_at, feedback, metadata, companies ( id, name, logo_url, uploaded_logo_url )')
            .eq('user_id', user.id)
            .order('submitted_at', { ascending: false })
            .returns<RawHistoryItem[]>();

        if (error) {
            console.error('[fetchClaimHistory] Supabase fetch error:', error);
            
            // Specific error handling for authentication issues
            if (error.message?.includes('JWT')) {
                console.error('[fetchClaimHistory] JWT/Authentication error - check Clerk-Supabase integration');
            } else if (error.code === 'PGRST301') {
                console.error('[fetchClaimHistory] RLS policy violation - user may not have access');
            }
            
            throw error; // Re-throw to be caught by outer catch
        }

        // Correctly map, taking the first company object if the array exists
        const validHistory: ClaimHistoryItem[] = (data || []).map(item => {
            
            return {
                id: item.id,
                status: item.status as ClaimStatus,
                submitted_at: item.submitted_at,
                reviewed_at: item.reviewed_at,
                feedback: item.feedback,
                metadata: item.metadata,
                companies: item.companies
            };
        });

        setClaimHistory(validHistory); 
        setLoadingClaimHistory('idle');
    } catch (error) {
        console.error("Error loading claim history:", error);
        
        // Show user-friendly error message based on error type
        if (error instanceof Error) {
            if (error.message?.includes('JWT')) {
                toast.error('Authentication error. Please sign out and sign back in.');
            } else if (error.message?.includes('fetch')) {
                toast.error('Network error. Please check your connection.');
            } else {
                toast.error(`Database error: ${error.message}`);
            }
        } else {
            toast.error('Failed to load claim history. Please refresh the page.');
        }
        
        setClaimHistory([]); // Clear on error
        setLoadingClaimHistory('error');
    }
  }, [user?.id, loadingClaimHistory]);
  // --- END Fetch History Function ---

  // --- Add Resubmit Handler --- 
  const handleResubmit = async (claim: ClaimHistoryItem) => {
      if (!user?.id || !claim.companies || !supabase) return;
      setEditingClaimId(claim.id);
      try {
          // 1. Reset the approval status in the database
          const { error: updateError } = await supabase
              .from('company_approvals')
              .update({
                  status: 'pending',
                  reviewed_at: null,
                  feedback: null,
                  submitted_at: new Date().toISOString() // Update submitted time
              })
              .eq('id', claim.id)
              .eq('user_id', user.id); // Ensure user owns this claim
              // Note: RLS policy must allow this for non-admins on rejected items
          
          if (updateError) {
            throw updateError;
          }

          // 2. Update local state immediately (ADDED)
          const updatedSubmittedAt = new Date().toISOString();
          setClaimHistory(prevHistory =>
            prevHistory.map(item =>
              item.id === claim.id
                ? { 
                    ...item, 
                    status: 'pending', 
                    reviewed_at: null, 
                    feedback: null,
                    submitted_at: updatedSubmittedAt // Use consistent timestamp
                  }
                : item
            )
          );
          toast.success('Claim status reset to pending.'); // Toast after state update

          // 3. Prepare data and open the edit flow
          const claimMetadata = claim.metadata?.claim_request || {};
          const companyData = claim.companies;

          if (!companyData) {
            console.error('[handleResubmit] No company data found for this claim history item.', claim);
            toast.error("Cannot open submission: Associated company data not found.");
            setEditingClaimId(null);
            return; 
          }
          
          const logoUrl = claimMetadata.logo_url || companyData.logo_url;

          const companyToEdit = {
              id: companyData.id,
              company_id: companyData.id,
              name: companyData.name,
              logo_url: logoUrl,
              uploaded_logo_url: companyData.uploaded_logo_url,
              logo: { asset: { url: logoUrl } }, 
              is_verified: false, // It's pending again
              contact_email: claimMetadata.email,
              contact_phone: claimMetadata.phone,
              website_url: claimMetadata.website,
              address: claimMetadata.location,
              category: claimMetadata.category || [],
              primaryRole: claimMetadata.primaryRole,
              isEditing: true, // Open in editing mode
              isNew: false,
              approval_id: claim.id, 
              status: 'pending' // Reflect new status in modal too
          };

          setSelectedCompany(companyToEdit);
          
          setShowCompanyFlow(true);
          setShowEditFlow(true);
  
      } catch (error: any) { 
          console.error("Error resubmitting claim:", error);
          toast.error(`Failed to resubmit claim: ${error.message}`);
      } finally {
          setEditingClaimId(null); // Clear loading state
      }
  };
  // --- END Resubmit Handler ---

  // --- NEW Handler for Editing Pending Claims ---
  const handleEditPendingClaim = async (claim: ClaimHistoryItem) => {
    if (!user?.id || !claim.companies) return;
    setEditingClaimId(claim.id);
    try {
      // No DB update needed as it's already pending

      // Prepare data and open the edit flow (similar to handleResubmit)
      const claimMetadata = claim.metadata?.claim_request || {};
      const companyData = claim.companies;
      const logoUrl = claimMetadata.logo_url || companyData.logo_url;

      setSelectedCompany({
        id: companyData.id,
        company_id: companyData.id,
        name: companyData.name,
        logo_url: logoUrl,
        uploaded_logo_url: companyData.uploaded_logo_url,
        logo: { asset: { url: logoUrl } }, 
        is_verified: false, // Should still be false if pending
        contact_email: claimMetadata.email,
        contact_phone: claimMetadata.phone,
        website_url: claimMetadata.website,
        address: claimMetadata.location,
        category: claimMetadata.category || [],
        primaryRole: claimMetadata.primaryRole,
        isEditing: true, // Open in editing mode
        isNew: false,
        approval_id: claim.id, 
        status: 'pending' // Reflect current status
      });
      
      setShowCompanyFlow(true);
      setShowEditFlow(true);

    } catch (error: any) {
      console.error("Error opening pending claim for edit:", error);
      toast.error(`Failed to open submission for editing: ${error.message}`);
    } finally {
      setEditingClaimId(null); // Clear loading state
    }
  };
  // --- END Edit Pending Handler ---

  // New function to handle project association (called by ProjectDialog onSubmit)
  const handleProjectAssociationSubmit = async (
    project: ProjectSearchResult, // Receive project object
    role: string
  ) => {
    if (!user?.id || !selectedCompanyId || !supabase) {
      toast.error('Missing user or company information for association');
      return;
    }

    setIsAddingProject(true);

    try {
      const { error } = await supabase
        .from('company_projects')
        .insert({
          company_id: selectedCompanyId,
          project_slug: project.slug,
          project_name: project.title,
          role: role,
          status: 'pending',
          submitted_by: user.id,
          metadata: {
            city: project.city,
            neighborhood: project.neighborhood
          }
        });

      if (error) throw error;

      toast.success('Project association requested');

      // Reset flags to allow fresh data load
      dataLoadedRef.current = false;
      refreshHandledRef.current = false;

      // Close the dialog and reset state
      setShowProjectDialog(false);
      setSelectedProject(null);
      setSelectedCompanyId(null);
      setPendingProjectData(null);

      // Force refresh the page to show the new project
      router.push('/company?refresh=true');

    } catch (error: any) {
      if (error?.code === '23505') {
        toast.info('This company is already associated with this project or a request is pending.');
      } else {
        toast.error(`Failed to add project association: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setIsAddingProject(false);
    }
  };

  // Function to handle company selection from dialog - Use approvedCompaniesForSelection
  const handleCompanySelection = async (companyId: string) => {
      if (!pendingProjectData) return;

      // Find the selected company from the approved list
      const company = approvedCompaniesForSelection.find(c => c.id === companyId);
      if (!company) return;

      // Close company selection dialog
      setShowCompanySelectionDialog(false);

      // Open ProjectDialog with the PRE-SELECTED project
      setSelectedCompanyId(companyId); // Store company ID
      setProjectRole(company.primary_role || ''); // Use primary_role from the selected approved company
      setShowProjectDialog(true); // Open the dialog to ask for project role
  };

  // Renamed and adapted function for spotlight checkout
  const handleSpotlightCheckout = async (companyId: string, projectId: string) => {
    if (!user?.id || !companyId || !projectId) {
      toast.error('Missing required information for spotlight purchase.');
      return;
    }

    setIsProcessingSpotlight(true);
    try {
      const response = await fetch('/api/create-spotlight-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyId,
          projectId,
          // userId is handled server-side based on session
        }),
      });

      const { url, sessionId, error } = await response.json();
      
      if (!response.ok || error) {
        throw new Error(error || 'Failed to create spotlight checkout session.');
      }

      if (url) {
        window.location.href = url;
      } else if (sessionId) {
          // Fallback: Redirect using sessionId if URL isn't provided (less common)
          const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
          if (stripe) {
              await stripe.redirectToCheckout({ sessionId });
          } else {
              throw new Error('Stripe.js failed to load.');
          }
      } else {
          throw new Error('No redirect URL or session ID received from server.');
      }
    } catch (error: any) {
      console.error('Error creating spotlight session:', error);
      toast.error(error.message || 'Failed to start spotlight purchase process');
      // Reset state needed?
      setShowProjectSearchDialog(false);
      setSelectedProjectForSpotlight(null);
      setCompanyIdForSpotlight(null);
    } finally {
      setIsProcessingSpotlight(false);
    }
  };

  // Debounce helper
  const debounce = <F extends (...args: any[]) => any>(func: F, waitFor: number) => {
      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      return (...args: Parameters<F>): Promise<ReturnType<F>> =>
          new Promise(resolve => {
              if (timeoutId) {
                  clearTimeout(timeoutId);
              }
              timeoutId = setTimeout(() => resolve(func(...args)), waitFor);
          });
  };

  // Function to search projects directly using Supabase client
  const searchProjects = useCallback(async (term: string): Promise<SimpleProjectResult[]> => {
    if (term.trim().length < 3 || !supabase) {
      return []; // Don't search for very short terms
    }
    setIsSearchingProjects(true);
    setSearchError(null);
    try {
      // --- Query Supabase projects table directly ---
      const searchTerm = `%${term}%`; // Prepare term for ILIKE

      // Select the columns needed for SimpleProjectResult
      // Search in 'title' and 'address' (or 'normalized_address' if you prefer)
      const { data, error } = await supabase
        .from('projects')
        .select('id, title, address, city_slug, neighborhood_slug') // Adjust column names if needed (e.g., city_slug, state_slug?)
        .or(`title.ilike.${searchTerm},address.ilike.${searchTerm}`) // Search title OR address
        .limit(20); // Limit results to avoid overwhelming UI

      if (error) {
        console.error("Supabase project search error:", error);
        throw new Error(error.message || 'Failed to search projects.');
      }

      // Map the data to SimpleProjectResult, handling potential nulls/differences
      const results: SimpleProjectResult[] = (data || []).map(p => ({
        id: p.id,
        title: p.title || 'Untitled Project',
        address: p.address,
        city: p.city_slug, // Assuming city_slug maps to city name or needs further mapping
        neighborhood: p.neighborhood_slug, // Assuming state_slug maps to state name or needs further mapping
      }));

      return results;
      // --- End Supabase query ---

    } catch (error: any) {
        console.error("Project search error:", error);
        setSearchError(error.message || "Failed to search projects.");
        return [];
    } finally {
        setIsSearchingProjects(false);
    }
  }, []); // Removed supabase dependency as client instance is stable

  // Debounced version of the search function
  const debouncedSearchProjects = useCallback(debounce(searchProjects, 500), [searchProjects]);

  // Handle search input change
  const handleSearchInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const term = event.target.value;
      setProjectSearchTerm(term);
      setSelectedProjectForSpotlight(null); // Clear selection when search term changes
      if (term.trim().length >= 3) {
        const results = await debouncedSearchProjects(term);
        setProjectSearchResults(results);
      } else {
        setProjectSearchResults([]);
      }
  };

  // Handle opening the project search dialog
  const openProjectSearch = (companyId: string) => {
    setCompanyIdForSpotlight(companyId); // Store which company is purchasing
    setShowProjectSearchDialog(true);
    setProjectSearchTerm("");
    setProjectSearchResults([]);
    setSelectedProjectForSpotlight(null);
    setSearchError(null);
  };

  // Handle confirming the spotlight purchase from the dialog
  const confirmSpotlightPurchase = () => {
      if (selectedProjectForSpotlight && companyIdForSpotlight) {
          handleSpotlightCheckout(companyIdForSpotlight, selectedProjectForSpotlight.id);
      }
  };

  // Function to fetch the current user's role for a specific company
  const fetchUserRoleForCompany = useCallback(async (companyId: string) => {
    if (!user?.id || !companyId || !supabase) return null;
    try {
      const { data, error } = await supabase
        .from('company_managers')
        .select('role')
        .eq('company_id', companyId)
        .eq('user_id', user.id)
        .single();

      if (error) {
        // Handle cases where user is not a manager (error or no data) gracefully
        if (error.code !== 'PGRST116') { // PGRST116: Row not found
           console.error(`Error fetching role for user ${user.id} in company ${companyId}:`, error);
        }
        return null;
      }
      return data?.role as 'owner' | 'admin' | 'editor' | null;
    } catch (err) {
      console.error('Unexpected error fetching role:', err);
      return null;
    }
  }, [user?.id]);

  // Scroll handler
  const handleScrollToManagers = (companyId: string) => {
    const element = managerSectionRefs.current[companyId];
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  // --- Simplified useEffect for dependent data fetching --- 
  useEffect(() => {
    const fetchDependentData = async () => {
      if (managedCompanies.length === 0 || !supabase) return; // No companies to fetch for

      // Create maps of data needed for each company
      const companyPromises: Promise<void>[] = managedCompanies.map(async (company) => {
          const companyId = company.id;
          let ownerId = company.currentUserRole === 'owner' ? user!.id : null;

          // 1. Fetch Managers (if needed)
          let companyManagers: ManagerWithProfile[] = [];
          if (!companyManagersMap[companyId] && !loadingManagersMap[companyId]) {
              setLoadingManagersMap(prev => ({ ...prev, [companyId]: true }));
              try {
                  const { data, error } = await supabase.rpc('get_company_managers_with_profiles', { p_company_id: companyId });
                  if (error) throw error;
                  companyManagers = (data as ManagerWithProfile[]) || [];
                  setCompanyManagersMap(prev => ({ ...prev, [companyId]: companyManagers }));
                  // Find owner if current user isn't the owner
                  if (!ownerId) { ownerId = companyManagers.find(m => m.role === 'owner')?.user_id ?? null; }
              } catch (error) { 
                  console.error(`[DEBUG] Error fetching managers for ${companyId}:`, error); 
              }
              finally { setLoadingManagersMap(prev => ({ ...prev, [companyId]: false })); }
          } else {
              companyManagers = companyManagersMap[companyId] || []; // Use existing if available
              if (!ownerId) { ownerId = companyManagers.find(m => m.role === 'owner')?.user_id ?? null; }
          }

          // 2. Fetch Pending Invites (if needed)
          if (!companyPendingInvitesMap[companyId] && !loadingPendingInvitesMap[companyId]) {
              setLoadingPendingInvitesMap(prev => ({ ...prev, [companyId]: true }));
              try {
                  const { data, error } = await supabase.from('company_invites').select('id, invited_email, role, created_at, expires_at').eq('company_id', companyId).eq('status', 'pending');
                  if (error) throw error;
                  setCompanyPendingInvitesMap(prev => ({ ...prev, [companyId]: (data as PendingInviteDisplayData[]) || [] }));
              } catch (error) { console.error(`Error fetching invites for ${companyId}:`, error); }
              finally { setLoadingPendingInvitesMap(prev => ({ ...prev, [companyId]: false })); }
          }

          // 3. Fetch Owner Subscription & Usage (if owner found and data needed)
          if (ownerId && !ownerSubscriptionMap[ownerId] && !ownerSeatUsageMap[ownerId] && !loadingOwnerDataMap[ownerId]) {
              setLoadingOwnerDataMap(prev => ({ ...prev, [ownerId]: true }));
              try {
                  // Call the new function
                  const { data: ownerDetails, error: ownerDetailsError } = await supabase
                      .rpc('get_company_owner_subscription_details', { p_company_id: companyId })
                      .single<OwnerDetailsRPCResult>();

                  if (ownerDetailsError) throw ownerDetailsError;

                  // Process results from the function
                  if (ownerDetails) {
                      const subStateData = { 
                        isCompanyOnMembershipPlan: ownerDetails.is_on_membership_plan, 
                        ownerPlanQuantity: ownerDetails.plan_quantity 
                      };
                      setOwnerSubscriptionMap(prev => ({ ...prev, [ownerId]: subStateData }));

                      // Fetch usage separately if needed, or modify the function to return usage too
                       const { data: usageData, error: usageError } = await supabase
                           .rpc('get_owner_seat_usage', { p_owner_user_id: ownerId }); // Use the ownerId returned by the first function

                       if (usageError) throw usageError;
                       
                       const usageResult = usageData?.[0] || { total_managers: 0, total_pending_invites: 0 };
                       const usageStateData = { 
                           totalManagers: Number(usageResult.total_managers || 0), 
                           totalPendingInvites: Number(usageResult.total_pending_invites || 0) 
                       };
                       setOwnerSeatUsageMap(prev => ({ ...prev, [ownerId]: usageStateData }));

                  } else {
                       // Handle case where function returned no data (e.g., owner not found)
                       setOwnerSubscriptionMap(prev => ({ ...prev, [ownerId]: { isCompanyOnMembershipPlan: false, ownerPlanQuantity: 0 }}));
                       setOwnerSeatUsageMap(prev => ({ ...prev, [ownerId]: { totalManagers: 0, totalPendingInvites: 0 }}));
                  }

              } catch (error) {
                  console.error(`[DEBUG] Error fetching owner details/usage for company ${companyId}, owner ${ownerId}:`, error);
                  // Set defaults on error
                  setOwnerSubscriptionMap(prev => ({ ...prev, [ownerId]: { isCompanyOnMembershipPlan: false, ownerPlanQuantity: 0 }}));
                  setOwnerSeatUsageMap(prev => ({ ...prev, [ownerId]: { totalManagers: 0, totalPendingInvites: 0 }}));
              } finally {
                  setLoadingOwnerDataMap(prev => ({ ...prev, [ownerId]: false }));
              }
          }
      });

      // Execute all fetches concurrently for efficiency
      await Promise.all(companyPromises);
    };

    // Run when managedCompanies data is populated and stable
    if (loadingManagedCompanies === 'idle' && managedCompanies.length > 0) {
      fetchDependentData();
    }
  // Depend primarily on the managedCompanies list changing
  }, [managedCompanies, loadingManagedCompanies, user?.id]); // Removed fetchUserRoleForCompany

  // --- Auto-fetch claim history when user loads ---
  useEffect(() => {
    if (user?.id && !hasFetchedClaimHistory && loadingClaimHistory === 'idle') {
      fetchClaimHistory();
    }
  }, [user?.id, hasFetchedClaimHistory, loadingClaimHistory, fetchClaimHistory]);

  // --- Set accordion open by default if there are pending claims ---
  useEffect(() => {
    if (hasFetchedClaimHistory && claimHistory.length > 0) {
      const hasPendingClaims = claimHistory.some(claim => claim.status === 'pending');
      if (hasPendingClaims && accordionValue === undefined) {
        setAccordionValue('claim-history');
      }
    }
  }, [hasFetchedClaimHistory, claimHistory, accordionValue]);

  // Show loading overlay if fetching project from URL
  if (loadingProjectFromUrl) {
      return (
          <div className={cn("space-y-6 w-full px-4 sm:px-6", className)}>
              {/* Re-use existing header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Company Profile</h2>
                  <p className="text-sm text-gray-500 dark:text-zinc-400">
                    Manage your company and projects
                  </p>
                </div>
                <Button disabled variant="default"> {/* Disable button while loading */}
                  <Plus className="h-4 w-4" />
                  Add Company
                </Button>
              </div>
              <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-500 dark:text-zinc-400" />
                  <p className="ml-2 text-muted-foreground">Loading project details...</p>
              </div>
          </div>
      );
  }

  // Step 3: Show loading state while either user auth or claims are loading
  if (!user || loadingManagedCompanies === 'loading') {
    return (
      <div className={cn("space-y-6 w-full px-4 sm:px-6", className)}>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Company Profile</h2>
            <p className="text-sm text-gray-500 dark:text-zinc-400">
              Manage your company and projects
            </p>
          </div>
          <Button
            onClick={() => user ? setShowClaimModal(true) : setShowAuthModal(true)}
            variant="default"
            className="w-full sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            Add Company
          </Button>
        </div>
        
        {/* Loading state */}
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-gray-500 dark:text-zinc-400" />
        </div>
      </div>
    );
  }

  if (loadingManagedCompanies === 'error') {
    return (
      <div className={cn("space-y-6 w-full px-4 sm:px-6", className)}>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Company Profile</h2>
            <p className="text-sm text-gray-500 dark:text-zinc-400">
              Manage your company and projects
            </p>
          </div>
          <Button
            onClick={() => user ? setShowClaimModal(true) : setShowAuthModal(true)}
            variant="default"
            className="w-full sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            Add Company
          </Button>
        </div>
        
        {/* Error state */}
        <div className="flex flex-col items-center justify-center py-8">
          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mb-4">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <h3 className="text-lg font-medium mb-2">Error Loading Data</h3>
          <p className="text-gray-500 text-center max-w-md mb-4">
            We encountered an error while loading your company data. Please try again.
          </p>
          <Button 
            onClick={() => {
              dataLoadedRef.current = false;
              fetchManagedCompaniesAndRoles();
            }}
            variant="outline"
          >
            <RotateCw className="h-4 w-4" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6 w-full px-4 sm:px-6", className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Company Profile</h2>
          <p className="text-sm text-gray-500 dark:text-zinc-400">
            Manage your company and projects
          </p>
        </div>
        <Button
          onClick={() => user ? setShowClaimModal(true) : setShowAuthModal(true)}
          variant="default"
          className="w-full sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          Add Company
        </Button>
      </div>

      {/* Main Content */}
      <div className="space-y-4">
        {!user ? (
          <div className="flex items-center justify-center pt-4">
            <EmptyState
              {...EMPTY_STATES.company}
              action={{
                ...EMPTY_STATES.company.action,
                onClick: handleEmptyStateAction
              }}
            />
          </div>
        ) : managedCompanies.length === 0 ? (
          <div className="flex items-center justify-center pt-4">
            <EmptyState
              {...EMPTY_STATES.company}
              action={{
                ...EMPTY_STATES.company.action,
                onClick: () => setShowClaimModal(true)
              }}
            />
          </div>
        ) : (
          <div className="space-y-4">
            {managedCompanies.map((company) => {
              const currentUserRole = company.currentUserRole;
              const isCurrentUserAdminOrOwner = currentUserRole === 'admin' || currentUserRole === 'owner';
              const ownerId = company.currentUserRole === 'owner' 
                  ? user!.id 
                  : companyManagersMap[company.id]?.find(m => m.role === 'owner')?.user_id;
              const ownerSubData = ownerId ? ownerSubscriptionMap[ownerId] : undefined;
              const ownerUsageData = ownerId ? ownerSeatUsageMap[ownerId] : undefined;
              const isOwnerDataLoading = ownerId ? (loadingOwnerDataMap[ownerId] ?? true) : true;
              const pendingInvitesForCompany = companyPendingInvitesMap[company.id] || [];
              const isLoadingPendingInvites = loadingPendingInvitesMap[company.id] ?? true;
                      
              return (
                <motion.div
                  key={company.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={cn(
                    "p-4 sm:p-6",
                    "bg-white dark:bg-zinc-900",
                    "border border-gray-200 dark:border-zinc-800",
                    "rounded-xl"
                  )}
                >
                  <div className="space-y-4">
                    {/* Company Header */}
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                      <div className="flex items-start gap-4 w-full sm:w-auto">
                        <div className="relative w-12 h-12 sm:w-14 sm:h-14 bg-white dark:bg-zinc-800 rounded-lg flex items-center justify-center shrink-0 border border-gray-100 dark:border-zinc-700">
                          {(company.uploaded_logo_url || company.logo_url) ? (
                            <img
                              src={company.uploaded_logo_url || company.logo_url || ''}
                              alt={company.name}
                              className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg object-contain"
                            />
                          ) : (
                            <Building2 className="h-6 w-6 sm:h-7 sm:w-7 text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1 sm:mb-0">
                            <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate sm:max-w-xs">
                              {company.name}
                            </h3>
                          </div>
                          {getStatusBadge(company.status as ClaimStatus)}
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto shrink-0">
                        {company.currentUserRole === 'owner' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditClaim(company)}
                            disabled={editingClaimId === company.id}
                            className="w-full sm:w-auto"
                          >
                            {editingClaimId === company.id ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <Pencil className="h-4 w-4 mr-0.5" />
                            )}
                            Edit Profile
                          </Button>
                        )}
                        {company.status === 'approved' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleScrollToManagers(company.id)}
                            className="w-full sm:w-auto"
                          >
                            <Users className="h-4 w-4 mr-0.5" />
                            Manage Members
                          </Button>
                        )}
                        {(company.status === 'pending' || company.status === 'rejected') && (
                           <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteClick(company)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/20 w-full sm:w-auto justify-center sm:justify-start"
                              disabled={deletingItemId === company.id}
                            >
                              {deletingItemId === company.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Trash2 className="h-4 w-4 sm:mr-2" />
                                  <span className="hidden sm:inline">Delete</span>
                                </>
                              )}
                           </Button>
                        )}
                      </div>
                    </div>

                    {/* ProjectsSection */}
                    {company.status === 'approved' && (
                       <ProjectsSection companyId={company.id} />
                    )}

                    {/* ---- Render CompanyManagersSection with new prop ---- */}
                    {company.status === 'approved' && (() => {
                      return (
                        <div
                          ref={(el) => { managerSectionRefs.current[company.id] = el; }}
                          style={{ scrollMarginTop: '49px' }}
                        >
                          <CompanyManagersSection
                            companyId={company.id}
                            isCurrentUserAdminOrOwner={isCurrentUserAdminOrOwner}
                            currentUserRole={currentUserRole}
                            managers={companyManagersMap[company.id] || []}
                            isLoading={loadingManagersMap[company.id] ?? false}
                            isCompanyOnMembershipPlan={ownerSubData?.isCompanyOnMembershipPlan}
                            ownerPlanQuantity={ownerSubData?.ownerPlanQuantity}
                            totalOwnerManagerCount={ownerUsageData?.totalManagers}
                            totalOwnerPendingInvitesCount={ownerUsageData?.totalPendingInvites}
                            isCompanySubLoading={isOwnerDataLoading}
                            pendingInvites={pendingInvitesForCompany}
                            isLoadingPendingInvites={isLoadingPendingInvites}
                            shouldShowInheritanceWarning={shouldShowInheritanceWarning}
                          />
                        </div>
                      );
                    })()}
                    {/* ---- End CompanyManagersSection ---- */}

                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* --- NEW: Claim History Accordion --- */}
      {user && (!hasFetchedClaimHistory || claimHistory.length > 0) && (
        <Accordion 
          type="single" 
          collapsible 
          className="w-full border-t pb-20"
          value={accordionValue}
          onValueChange={setAccordionValue}
        >
          <AccordionItem value="claim-history">
            <AccordionTrigger 
              className="text-base font-medium hover:no-underline"
            >
              View Claim Submission History
            </AccordionTrigger>
            <AccordionContent className="pt-4">
              {loadingClaimHistory === 'loading' && (
                <div className="flex items-center justify-center p-6">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              )}
              {loadingClaimHistory === 'error' && (
                <p className="text-sm text-red-600 text-center p-4">Failed to load claim history.</p>
              )}
              {loadingClaimHistory === 'idle' && !hasFetchedClaimHistory && (
                  <p className="text-sm text-muted-foreground text-center p-4">Loading claim history...</p>
              )}
              {loadingClaimHistory === 'idle' && hasFetchedClaimHistory && claimHistory.length === 0 && (
                <p className="text-sm text-muted-foreground text-center p-4">You haven't submitted any company claims yet.</p>
              )}
              {loadingClaimHistory === 'idle' && hasFetchedClaimHistory && claimHistory.length > 0 && (
                <div className="space-y-3">
                  {claimHistory.map((claim) => (
                    <div key={claim.id} className="p-3 sm:p-4 border rounded-lg bg-background">
                      <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4">
                        {/* Left side: Logo and Company Name/Status */}
                        <div className="flex items-center gap-3 flex-1 min-w-0 w-full">
                          <div className="relative w-10 h-10 bg-muted rounded-md flex items-center justify-center shrink-0 border">
                            {(claim.companies?.uploaded_logo_url || claim.companies?.logo_url) ? (
                              <img
                                src={claim.companies.uploaded_logo_url || claim.companies.logo_url || ''}
                                alt={claim.companies.name}
                                className="w-10 h-10 rounded-md object-contain"
                              />
                            ) : (
                              <Building2 className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{claim.companies?.name ?? 'Unknown Company'}</p>
                            <div className="flex items-center gap-x-2 gap-y-1 flex-wrap mt-1">
                              {getStatusBadge(claim.status)} 
                              <p className="text-xs text-muted-foreground whitespace-nowrap">
                                Submitted {new Date(claim.submitted_at).toLocaleDateString()}
                                {claim.reviewed_at && ` • Reviewed ${new Date(claim.reviewed_at).toLocaleDateString()}`}
                              </p>
                            </div>
                          </div>
                        </div>
                        {/* Right side: Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-end w-full sm:w-auto shrink-0 pt-2 sm:pt-0">
                          {claim.status === 'rejected' && (
                            <Button 
                              variant="outline"
                              size="sm"
                              onClick={() => handleResubmit(claim)}
                              disabled={editingClaimId === claim.id}
                              className="w-full sm:w-auto"
                            >
                              {editingClaimId === claim.id ? 
                                <Loader2 className="h-4 w-4 mr-0.5 animate-spin" /> : 
                                <RotateCw className="h-4 w-4 mr-0.5" />
                              }
                              Resubmit
                            </Button>
                          )}
                          {claim.status === 'pending' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditPendingClaim(claim)}
                              disabled={editingClaimId === claim.id}
                              className="w-full sm:w-auto"
                            >
                              {editingClaimId === claim.id ? 
                                <Loader2 className="h-4 w-4 mr-0.5 animate-spin" /> : 
                                <Pencil className="h-4 w-4 mr-0.5" />
                              }
                              Edit Submission
                            </Button>
                          )}
                        </div>
                      </div>
                      {/* Rejection Feedback (if rejected) */}
                      {claim.status === 'rejected' && claim.feedback && (
                        <div className="mt-3 pt-3 border-t border-dashed">
                          <p className="text-sm font-medium text-red-700 dark:text-red-500 mb-1">Rejection Feedback:</p>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{claim.feedback}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
      {/* --- END Accordion --- */}

      {/* Modals */}
      <ClaimUpsell
        isOpen={showClaimModal}
        onClose={() => setShowClaimModal(false)}
        onClaimExisting={handleClaimExisting}
        onAddNew={handleAddNew}
      />

      <ClaimCompanyFlow
        isOpen={showCompanyFlow}
        onClose={handleCompanyFlowClose}
        onSubmit={handleClaimSubmit}
        company={selectedCompany}
        isNew={selectedCompany?._id === ''}
        isEditing={showEditFlow}
      />

      <PricingDialog
        isOpen={showPricingModal}
        onOpenChange={setShowPricingModal}
      />

      <AuthModal
        open={showAuthModal}
        onOpenChange={setShowAuthModal}
        trigger={<div />}
        returnTo="/company"
      />

      {/* Add delete confirmation dialog */}
      <AlertDialog
        open={!!companyToDelete}
        onOpenChange={(open) => {
          if (!open && !deletingItemId) {
            setCompanyToDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Claim Record</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete your claim record for {companyToDelete?.name}? 
              This will remove your association request but may not remove the company listing itself if verified. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!deletingItemId}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={!!deletingItemId}
            >
              {deletingItemId ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                'Delete Claim'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Project Selection Dialog - Use approvedCompaniesForSelection */}
      <ProjectSelectionDialog
        open={showCompanySelectionDialog}
        onOpenChange={setShowCompanySelectionDialog}
        companies={approvedCompaniesForSelection} // Pass filtered list
        onCompanySelect={handleCompanySelection}
        projectName={pendingProjectData?.title || ''} // Pass project name
      />

      {/* ProjectDialog for selecting a project OR confirming for single company */}
      <ProjectDialog
        open={showProjectDialog}
        onOpenChange={setShowProjectDialog}
        onSubmit={handleProjectAssociationSubmit}
        isAddingProject={isAddingProject}
        companyPrimaryRole={projectRole} // Pass potentially fetched primary role
        initialProject={pendingProjectData} // Pass project data from URL/selection
      />

      {/* Verification Required Dialog */}
      <AlertDialog
        open={showVerificationRequiredDialog}
        onOpenChange={setShowVerificationRequiredDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Company Verification Required</AlertDialogTitle>
            <AlertDialogDescription>
              Your company must be verified before you can associate it with a project. Please complete the verification process for one of your claimed companies, or wait for an existing claim to be approved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowVerificationRequiredDialog(false)}>
              Got it
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* --- Project Search Dialog --- */}
       <SearchDialog open={showProjectSearchDialog} onOpenChange={(open) => { if (!open && !isProcessingSpotlight) setShowProjectSearchDialog(false); }}>
          <SearchDialogContent className="sm:max-w-[625px]">
            <SearchDialogHeader>
              <SearchDialogTitle>Feature Company on Project</SearchDialogTitle>
              <SearchDialogDescription>
                Search for the project where you want to feature your company ({managedCompanies.find(c => c.id === companyIdForSpotlight)?.name}).
              </SearchDialogDescription>
            </SearchDialogHeader>
            <div className="py-4 space-y-4">
              <div className="relative">
                 <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                 <Input
                    placeholder="Search by project name or address..."
                    value={projectSearchTerm}
                    onChange={handleSearchInputChange}
                    className="pl-9"
                  />
              </div>

              {/* Search Results / Loading / Error */}
              <div className="min-h-[200px] max-h-[40vh] overflow-y-auto rounded-md border border-dashed p-4">
                {isSearchingProjects ? (
                  <div className="flex justify-center items-center h-full">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : searchError ? (
                  <div className="flex flex-col justify-center items-center h-full text-center text-red-600">
                     <AlertCircle className="w-6 h-6 mb-2"/>
                     <p>Error searching: {searchError}</p>
                  </div>
                ) : projectSearchTerm.length < 3 ? (
                    <div className="flex justify-center items-center h-full text-center text-muted-foreground">
                        <p>Enter at least 3 characters to search.</p>
                    </div>
                ) : projectSearchResults.length > 0 ? (
                    <ul className="space-y-2">
                        {projectSearchResults.map((project) => (
                        <li
                            key={project.id}
                            onClick={() => setSelectedProjectForSpotlight(project)}
                            className={cn(
                                "p-3 rounded-md border cursor-pointer transition-colors",
                                selectedProjectForSpotlight?.id === project.id
                                    ? "bg-amber-100 dark:bg-amber-900/50 border-amber-300 dark:border-amber-700"
                                    : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50 border-transparent hover:border-zinc-200 dark:hover:border-zinc-700"
                            )}
                        >
                            <p className="font-medium">{project.title}</p>
                            <p className="text-xs text-muted-foreground">
                                {project.address || `${project.city}, ${project.state}`}
                            </p>
                        </li>
                        ))}
                    </ul>
                ) : (
                     <div className="flex justify-center items-center h-full text-center text-muted-foreground">
                        <p>No projects found matching "{projectSearchTerm}".</p>
                    </div>
                )}
              </div>
            </div>
            <SearchDialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowProjectSearchDialog(false)}
                disabled={isProcessingSpotlight}
              >
                Cancel
              </Button>
              <Button
                 onClick={confirmSpotlightPurchase}
                 disabled={!selectedProjectForSpotlight || isProcessingSpotlight}
                 className="bg-amber-500 hover:bg-amber-600 text-white"
              >
                {isProcessingSpotlight ? <Loader2 className="mr-0.5 h-4 w-4 animate-spin" /> : null}
                {isProcessingSpotlight ? 'Processing...' : `Purchase Spotlight ($99)`}
              </Button>
            </SearchDialogFooter>
          </SearchDialogContent>
        </SearchDialog>
      {/* --- End Project Search Dialog --- */}

    </div>
  );
} 