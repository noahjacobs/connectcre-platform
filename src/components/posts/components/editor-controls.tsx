"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Edit,
    PlusCircle,
    Loader2,
    Link2Off,
    XIcon,
    CheckIcon,
    Building,
    Info as InfoIcon,
    HelpCircle,
    CheckCircle2,
    XCircle,
    AlertTriangle,
} from "lucide-react";
import {
  linkArticleToProject,
  unlinkArticleFromProject
} from '@/components/posts';
import {
  updateSupabaseProject,
  createSupabaseProjectFromPost,
  checkProjectSlugExists,
  fetchProjectCompaniesServerSide,
  fetchCompanyProjectAssociations,
  removeCompanyProject,
  searchCompaniesBasic,
  addCompanyToProject,
  removeCompanyFromProject,
  createCompanyAndAddToProject,
  revalidateProjectCompanies,
  checkProjectExistsByAddress,
  type BasicCompanyInfo,
  type CompanyProjectResponse,
  type Project,
  ProjectStatus
} from '@/components/projects';
import type { Post } from "@/components/posts/types";
import { AuthUser } from "@/lib/providers/auth-context";
import Link from "next/link";

// --- Constants (can be defined outside or passed as props) ---
const projectStatusOptions = [
    { value: 'proposed', label: 'Proposed' },
    { value: 'approved', label: 'Approved' },
    { value: 'under_construction', label: 'Under Construction' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
];

const projectRoleOptions = [
    { value: 'Architect', label: 'Architect' },
    { value: 'Consultant', label: 'Consultant' },
    { value: 'Developer', label: 'Developer' },
    { value: 'Engineer', label: 'Engineer' },
    { value: 'General Contractor', label: 'General Contractor' },
    { value: 'Interior Designer', label: 'Interior Designer' },
    { value: 'Landscape Architect', label: 'Landscape Architect' },
    { value: 'Legal Services', label: 'Legal Services' },
    { value: 'Lender', label: 'Lender' },
    { value: 'Manufacturer', label: 'Manufacturer' },
    { value: 'Property Manager', label: 'Property Manager' },
    // Add other common roles if needed
];

const ownershipTypeOptions = [
    { value: 'private', label: 'Private' },
    { value: 'public', label: 'Public' },
    { value: 'mixed', label: 'Mixed' },
    { value: 'nonprofit', label: 'Non-profit' },
];

const buildingTypeOptions = [
    { value: 'new_construction', label: 'New Construction' },
    { value: 'renovation', label: 'Renovation' },
    { value: 'demolition', label: 'Demolition' },
    { value: 'addition', label: 'Addition' },
    { value: 'alteration', label: 'Alteration' },
    { value: 'repair', label: 'Repair' },
    { value: 'restoration', label: 'Restoration' },
    { value: 'conversion', label: 'Conversion' },
    { value: 'adaptive_reuse', label: 'Adaptive Reuse' },
    { value: 'rehabilitation', label: 'Rehabilitation' },
    { value: 'modernization', label: 'Modernization' },
    { value: 'expansion', label: 'Expansion' },
    { value: 'reconstruction', label: 'Reconstruction' },
    { value: 'redevelopment', label: 'Redevelopment' },
    { value: 'refurbishment', label: 'Refurbishment' },
    { value: 'upgrade', label: 'Upgrade' },
    { value: 'seismic_retrofit', label: 'Seismic Retrofit' },
    { value: 'historic_preservation', label: 'Historic Preservation' },
    { value: 'mixed_development', label: 'Mixed Development' },
    { value: 'phased_construction', label: 'Phased Construction' },
];

// --- Helper Function ---
const formatDateForInput = (dateString: string | Date | null | undefined) => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toISOString().split('T')[0];
    } catch (e) {
      return ''; // Handle invalid date format
    }
};

// --- Component Props ---
interface EditorControlsProps {
    post: Omit<Post, 'body'>; // Use the potentially updated post state from parent
    project: Project | null; // The original project data
    user: AuthUser | null;
    citySlug: string;
    neighborhoodSlug?: string;
    initialProjectCompanies: CompanyProjectResponse[]; // Pass initial companies if project exists
    onUpdate: () => void; // Callback to trigger refresh/update in parent
}

export function EditorControls({
    post,
    project,
    user,
    citySlug,
    neighborhoodSlug,
    initialProjectCompanies,
    onUpdate,
}: EditorControlsProps) {
    const router = useRouter();
    const isEditor = user?.user_type === 'editor' || user?.user_type === 'admin';

    // --- Internal State ---
    const [isEditorModalOpen, setIsEditorModalOpen] = useState(false);
    const [projectFormData, setProjectFormData] = useState<Partial<Project>>({});
    const [isSubmittingProject, setIsSubmittingProject] = useState(false);
    const [isCheckingProject, setIsCheckingProject] = useState(false);
    const [shouldShowLinkConfirmation, setShouldShowLinkConfirmation] = useState(false);
    const [potentialProjectToLink, setPotentialProjectToLink] = useState<Project | null>(null);
    const [isCurrentlyLinked, setIsCurrentlyLinked] = useState(!!post.supabase_project_id);
    const [isUnlinking, setIsUnlinking] = useState(false);
    const [showUnlinkConfirmation, setShowUnlinkConfirmation] = useState(false);
    const [isConfirmingNewProjectDetails, setIsConfirmingNewProjectDetails] = useState(false);
    const [slugToCheck, setSlugToCheck] = useState('');
    const [slugAvailability, setSlugAvailability] = useState<'idle' | 'checking' | 'available' | 'taken' | 'error'>('idle');
    const [slugCheckMessage, setSlugCheckMessage] = useState('');
    const [formMode, setFormMode] = useState<'create' | 'edit'>(project ? 'edit' : 'create');

    // Company Management State
    const [associatedCompanies, setAssociatedCompanies] = useState<CompanyProjectResponse[]>(initialProjectCompanies || []);
    const [isLoadingCompanies, setIsLoadingCompanies] = useState(false);
    const [companySearchQuery, setCompanySearchQuery] = useState('');
    const [companySearchResults, setCompanySearchResults] = useState<BasicCompanyInfo[]>([]);
    const [isSearchingCompanies, setIsSearchingCompanies] = useState(false);
    const [isCreatingCompany, setIsCreatingCompany] = useState(false);
    const [addingCompanyId, setAddingCompanyId] = useState<string | null>(null);
    const [removingAssociationId, setRemovingAssociationId] = useState<string | null>(null);
    const [selectedRoleExisting, setSelectedRoleExisting] = useState<string>('');
    const [selectedRoleNew, setSelectedRoleNew] = useState<string>('');

    const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // --- Effects ---

    // Sync internal linked state with post prop AND form mode initially
    useEffect(() => {
        const linked = !!post.supabase_project_id;
        setIsCurrentlyLinked(linked);
        setFormMode(linked && project ? 'edit' : 'create');
    }, [post.supabase_project_id, project]);

    // Reset state when modal closes
    useEffect(() => {
        if (!isEditorModalOpen) {
            setIsConfirmingNewProjectDetails(false);
            setPotentialProjectToLink(null);
            setSlugToCheck('');
            setSlugAvailability('idle');
            setSlugCheckMessage('');
            if (formMode === 'create') {
                 setProjectFormData({});
            }
            setFormMode(isCurrentlyLinked && project ? 'edit' : 'create');
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isEditorModalOpen]);

    // Populate form data and fetch companies
    useEffect(() => {
        if (isEditorModalOpen) {
            // Reset company search state
            setCompanySearchQuery('');
            setCompanySearchResults([]);
            setSelectedRoleExisting('');
            setSelectedRoleNew('');

            if (isConfirmingNewProjectDetails) {
                 // Confirmation Step: Initialize form with post data for confirmation
                 setProjectFormData({
                    address: post.address || '',
                    slug: post.slug || '',
                    title: post.title || '',
                    city_slug: post.city_name || citySlug,
                    neighborhood_slug: post.neighborhood_name || neighborhoodSlug,
                 });
                 setSlugToCheck(post.slug || '');
                 setAssociatedCompanies([]); // No companies shown here
            } else {
                // Main Form Step (Create or Edit)
                if (formMode === 'edit' && project) {
                    setProjectFormData({
                        title: project.title || post.title || '',
                        slug: project.slug || '',
                        description: project.description || post.subtitle || '',
                        status: project.status || 'proposed',
                        address: project.address || post.address || '',
                        uses: project.uses || [],
                        construction_type: project.construction_type || '',
                        floors: project.floors ?? undefined,
                        height_ft: project.height_ft ?? undefined,
                        apartment_count: project.apartment_count ?? undefined,
                        condo_count: project.condo_count ?? undefined,
                        hotel_count: project.hotel_count ?? undefined,
                        affordable_unit_count: project.affordable_unit_count ?? undefined,
                        retail_space_sf: project.retail_space_sf ?? undefined,
                        office_space_sf: project.office_space_sf ?? undefined,
                        parking_spaces: project.parking_spaces ?? undefined,
                        bike_spaces: project.bike_spaces ?? undefined,
                        start_date: formatDateForInput(project.start_date),
                        construction_start_date: formatDateForInput(project.construction_start_date),
                        completion_date: formatDateForInput(project.completion_date),
                        city_slug: project.city_slug || post.city_name || citySlug,
                        neighborhood_slug: project.neighborhood_slug || post.neighborhood_name || neighborhoodSlug,
                        // Additional fields
                        project_tags: project.project_tags || [],
                        zoning: project.zoning || '',
                        land_use: project.land_use || '',
                        ownership_type: project.ownership_type || 'private',
                        building_type: project.building_type || 'new_construction',
                        energy_certification: project.energy_certification || '',
                        project_cost: project.project_cost ?? undefined,
                        assessed_value: project.assessed_value ?? undefined,
                        lot_area: project.lot_area ?? undefined,
                        building_area: project.building_area ?? undefined,
                        floor_area_ratio: project.floor_area_ratio ?? undefined,
                        primary_image_url: project.primary_image_url || '',
                        sources: project.sources || [],
                    });
                    const fetchCompanies = async () => {
                        if (!project.slug) return;
                        setIsLoadingCompanies(true);
                        try {
                            const companies = await fetchProjectCompaniesServerSide(project.slug);
                            setAssociatedCompanies(companies || []);
                        } catch (error) {
                            console.error("Error fetching associated companies:", error);
                            toast.error("Failed to load project companies.");
                            setAssociatedCompanies([]);
                        } finally {
                            setIsLoadingCompanies(false);
                        }
                    };
                    fetchCompanies();
                } else { // Creating new project
                    setProjectFormData(prevData => ({
                        title: prevData.title || post.title || '',
                        slug: prevData.slug || post.slug || '',
                        description: prevData.description || post.subtitle || '',
                        address: prevData.address || post.address || '',
                        city_slug: prevData.city_slug || post.city_name || citySlug,
                        neighborhood_slug: prevData.neighborhood_slug || post.neighborhood_name || neighborhoodSlug,
                        status: prevData.status || 'proposed',
                        ownership_type: prevData.ownership_type || 'private',
                        building_type: prevData.building_type || 'new_construction',
                    }));
                    setAssociatedCompanies([]); // No companies for new project yet
                }
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        isEditorModalOpen,
        isConfirmingNewProjectDetails,
        formMode,
        project,
        post.title, post.slug, post.subtitle, post.address,
        post.city_name, post.neighborhood_name,
        citySlug, neighborhoodSlug
    ]);

    // Debounced company search
    useEffect(() => {
        if (companySearchQuery.trim().length < 2) {
            setCompanySearchResults([]);
            if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
            if (isSearchingCompanies) setIsSearchingCompanies(false);
            return;
        }

        setIsSearchingCompanies(true);
        if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);

        debounceTimeoutRef.current = setTimeout(async () => {
            if (companySearchQuery.trim().length < 2) {
                 setCompanySearchResults([]);
                 setIsSearchingCompanies(false);
                 return;
            }
            try {
                const results = await searchCompaniesBasic(companySearchQuery);
                setCompanySearchResults(results);
            } catch (error) {
                console.error("Error searching companies:", error);
                toast.error("Company search failed.");
                setCompanySearchResults([]);
            } finally {
                setIsSearchingCompanies(false);
            }
        }, 300);

        return () => {
            if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
        };
    }, [companySearchQuery]);

    // --- Handlers ---

    const handleCheckOrCreateClick = async () => {
        if (!post.id || !post.address || !isEditor) return;

        setIsCheckingProject(true);
        setSlugAvailability('idle');
        setSlugCheckMessage('');
        setSlugToCheck('');
        try {
            const existingProject = await checkProjectExistsByAddress(post.address);
            if (existingProject) {
                setPotentialProjectToLink(existingProject);
                setShouldShowLinkConfirmation(true);
            } else {
                setPotentialProjectToLink(null);
                setIsConfirmingNewProjectDetails(false);
                setFormMode('create');
                setIsEditorModalOpen(true);
            }
        } catch (error) {
            console.error("Error checking for existing project:", error);
            toast.error("Failed to check for existing project.");
            setPotentialProjectToLink(null);
            setFormMode('create');
            setIsConfirmingNewProjectDetails(true);
            setIsEditorModalOpen(true);
        } finally {
            setIsCheckingProject(false);
        }
    };

    const handleLinkConfirmationClose = (open: boolean) => {
        if (!open) {
            setShouldShowLinkConfirmation(false);
        }
    };

    const handleProceedToCreateNew = () => {
        setShouldShowLinkConfirmation(false);
        setIsConfirmingNewProjectDetails(true);
        setFormMode('create');
        setSlugAvailability('idle');
        setSlugCheckMessage('');
        setSlugToCheck(post.slug || '');
        setIsEditorModalOpen(true);
    };

    const handleCheckSlugAvailability = useCallback(async () => {
        if (!slugToCheck || slugAvailability === 'checking') return;

        setSlugAvailability('checking');
        setSlugCheckMessage('');
        try {
            const isTaken = await checkProjectSlugExists(slugToCheck);

            if (isTaken) {
                setSlugAvailability('taken');
                setSlugCheckMessage(`Slug "${slugToCheck}" is already in use. Please choose another.`);
            } else {
                setSlugAvailability('available');
                setSlugCheckMessage(`Slug "${slugToCheck}" is available!`);
                setProjectFormData(prevData => ({
                    ...prevData,
                    slug: slugToCheck,
                }));
            }
        } catch (error) {
            console.error("Error checking slug availability:", error);
            setSlugAvailability('error');
            setSlugCheckMessage("Error checking slug. Please try again.");
            toast.error("Failed to check slug availability.");
        }
    }, [slugToCheck, slugAvailability]);

    const handleSlugInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newSlug = e.target.value;
        setSlugToCheck(newSlug);
        setProjectFormData(prevData => ({ ...prevData, slug: newSlug }));
        if (slugAvailability !== 'idle' && slugAvailability !== 'checking') {
            setSlugAvailability('idle');
            setSlugCheckMessage('');
        }
    };

    const handleContinueToFullForm = () => {
        if (!projectFormData.address?.trim()) {
            toast.error("Address cannot be empty.");
            document.getElementById('confirm-address')?.focus();
            return;
        }
         if (!projectFormData.title?.trim()) {
            toast.error("Title cannot be empty.");
            document.getElementById('confirm-title')?.focus();
            return;
        }

        if (slugAvailability !== 'available') {
            toast.error("Please check and ensure the slug is available before continuing.");
            if (slugAvailability === 'idle' && slugToCheck) {
                handleCheckSlugAvailability();
            }
            return;
        }
        setIsConfirmingNewProjectDetails(false);
    };

    const handleLinkProject = async () => {
        if (!post.id || !potentialProjectToLink?.id || !isEditor) return;

        try {
            const result = await linkArticleToProject(post.id, potentialProjectToLink.id);
            if (result.success) {
                toast.success("Post successfully linked to project!");
                setShouldShowLinkConfirmation(false);
                setPotentialProjectToLink(null);
                setIsCurrentlyLinked(true);
                setFormMode('edit');
                onUpdate();
            } else {
                toast.error(`Failed to link post: ${result.error || 'Unknown error'}`);
            }
        } catch (error: any) {
            console.error("Error linking project:", error);
            toast.error(`An unexpected error occurred: ${error.message}`);
        }
    };

     const handleProjectSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isEditor || isConfirmingNewProjectDetails) return;
        setIsSubmittingProject(true);

        const isCreating = formMode === 'create';

        if (isCreating && (!projectFormData.title || !projectFormData.slug || !projectFormData.address)) {
            toast.error("Please ensure Title, Slug, and Address are provided.");
            setIsSubmittingProject(false);
            return;
        }

        if (isCreating && slugAvailability !== 'available' && projectFormData.slug === slugToCheck) {
            toast.error("Please ensure the project slug is checked and available.");
            setIsSubmittingProject(false);
            return;
        }

        try {
            let result;
            if (!isCreating && project?.id) {
                result = await updateSupabaseProject(project.id, projectFormData);
            } else {
                const dataToCreate = {
                    ...projectFormData,
                    city_slug: projectFormData.city_slug || post.city_name || citySlug,
                    neighborhood_slug: projectFormData.neighborhood_slug || post.neighborhood_name || neighborhoodSlug,
                };
                if (dataToCreate.start_date === null) delete dataToCreate.start_date;
                if (dataToCreate.completion_date === null) delete dataToCreate.completion_date;
                result = await createSupabaseProjectFromPost(post, dataToCreate);
            }

            if (result.success) {
                toast.success(isCreating ? "Project created and linked successfully!" : "Project updated successfully!");
                setIsEditorModalOpen(false);
                onUpdate();
            } else {
                if (isCreating && result.error?.includes('duplicate key value violates unique constraint "projects_slug_key"')) {
                     toast.error(`Error: The slug "${projectFormData.slug}" is already taken. Please choose another.`);
                     setIsConfirmingNewProjectDetails(true);
                     setSlugAvailability('taken');
                     setSlugCheckMessage(`Slug "${projectFormData.slug}" is already in use. Please choose another.`);
                } else {
                    toast.error(`Error: ${result.error || 'Failed to save project.'}`);
                }
            }
        } catch (error: any) {
            toast.error(`An unexpected error occurred: ${error.message}`);
        } finally {
            setIsSubmittingProject(false);
        }
    };

    const handleUnlinkProject = async () => {
        if (!post.id || !isEditor) return;

        setIsUnlinking(true);
        try {
            const result = await unlinkArticleFromProject(post.id);
            if (result.success) {
                toast.success("Project successfully unlinked from this post.");
                setShowUnlinkConfirmation(false);
                setIsEditorModalOpen(false);
                setIsCurrentlyLinked(false);
                setFormMode('create');
                onUpdate();
            } else {
                toast.error(`Failed to unlink project: ${result.error || 'Unknown error'}`);
            }
        } catch (error: any) {
            toast.error(`An unexpected error occurred during unlinking: ${error.message}`);
        } finally {
            setIsUnlinking(false);
        }
    };

    const handleRemoveCompany = async (associationId: string, companyName: string) => {
        if (!project?.slug || removingAssociationId) return;

        setRemovingAssociationId(associationId);
        try {
            const result = await removeCompanyFromProject(associationId);
            if (result.success) {
                toast.success(`Removed ${companyName} from project.`);
                setAssociatedCompanies(prev => prev.filter(assoc => assoc.id !== associationId));
                await revalidateProjectCompanies(project.slug);
            } else {
                toast.error(`Failed to remove ${companyName}: ${result.error}`);
            }
        } catch (error: any) {
            toast.error(`Error removing company: ${error.message}`);
        } finally {
            setRemovingAssociationId(null);
        }
    };

    const handleAddCompany = async (company: BasicCompanyInfo, role: string) => {
        if (!project?.slug || !project?.title || addingCompanyId) return;

        setAddingCompanyId(company.id);
        try {
            const result = await addCompanyToProject(company.id, project.slug, project.title, role);
            if (result.success && result.association) {
                toast.success(`Added ${company.name} as ${role}.`);
                setAssociatedCompanies(prev => [...prev, result.association!]);
                setCompanySearchQuery('');
                setCompanySearchResults([]);
                setSelectedRoleExisting('');
                await revalidateProjectCompanies(project.slug);
            } else {
                toast.error(`Failed to add ${company.name}: ${result.error}`);
            }
        } catch (error: any) {
            toast.error(`Error adding company: ${error.message}`);
        } finally {
            setAddingCompanyId(null);
        }
    };

    const handleCreateAndAddCompany = async (companyNameToCreate: string, role: string) => {
        if (!project?.slug || !project?.title || !companyNameToCreate.trim() || !role || isCreatingCompany) return;

        setIsCreatingCompany(true);
        const tempCompanyName = companyNameToCreate.trim();

        try {
            const result = await createCompanyAndAddToProject(tempCompanyName, project.slug, project.title, role);
            if (result.success && result.association) {
                toast.success(`Created and added ${tempCompanyName} as ${role}.`);
                setAssociatedCompanies(prev => [...prev, result.association!]);
                setCompanySearchQuery('');
                setCompanySearchResults([]);
                setSelectedRoleNew('');
                await revalidateProjectCompanies(project.slug);
            } else {
                toast.error(`Failed to create/add ${tempCompanyName}: ${result.error}`);
            }
        } catch (error: any) {
            toast.error(`Error creating/adding company: ${error.message}`);
        } finally {
            setIsCreatingCompany(false);
        }
    };

    // --- Button Logic ---
    const getEditorButton = () => {
        if (!isEditor) return null;
        const isLinked = isCurrentlyLinked;
        const hasAddress = !!post.address;

        if (isLinked) {
            return (
                <Button variant="outline" size="sm" onClick={() => { setFormMode('edit'); setIsEditorModalOpen(true); }}>
                    <Edit className="w-4 h-4 mr-1" /> Edit Project
                </Button>
            );
        } else if (hasAddress) {
            return (
                <Button variant="outline" size="sm" onClick={handleCheckOrCreateClick} disabled={isCheckingProject}>
                    {isCheckingProject ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <PlusCircle className="w-4 h-4 mr-1" />}
                    {isCheckingProject ? 'Checking...' : 'Link Project'}
                </Button>
            );
        } else {
            return (
                <Button variant="outline" size="sm" onClick={() => { setFormMode('create'); setIsEditorModalOpen(true); }}>
                    <PlusCircle className="w-4 h-4 mr-1" /> Create Project
                </Button>
            );
        }
    };

    if (!isEditor) return null;

    return (
        <div className="mb-4 p-4 border border-dashed border-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-between gap-4">
            <p className="text-sm text-blue-700 dark:text-blue-300">
                {isCurrentlyLinked && project
                    ? "Editor Mode: This post is linked. You can edit the project."
                    : isCurrentlyLinked && !project
                    ? "Editor Mode: Linked project data missing. Unlink or Edit (may overwrite)."
                    : !isCurrentlyLinked && post.address
                    ? "Editor Mode: Verify or create a project at this address."
                    : "Editor Mode: This post is not linked and has no address. You can create a new project."
                }
            </p>
            {getEditorButton()}

            <AlertDialog open={shouldShowLinkConfirmation} onOpenChange={handleLinkConfirmationClose}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Link to Existing Project?</AlertDialogTitle>
                        <AlertDialogDescription>
                            We found an existing project at this post's address:
                            <br />
                            <strong>{potentialProjectToLink?.title || 'Unknown Title'}</strong> ({potentialProjectToLink?.slug || 'no slug'}).
                            <br />
                            Do you want to link this post to this existing project?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={handleProceedToCreateNew}>
                            No, Create New
                        </AlertDialogCancel>
                        <AlertDialogAction onClick={handleLinkProject}>
                            Yes, Link Project
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Dialog open={isEditorModalOpen} onOpenChange={setIsEditorModalOpen}>
                <DialogContent className="sm:max-w-[700px]">
                    {isConfirmingNewProjectDetails ? (
                        <div className="">
                            <DialogHeader className="mb-4">
                                <DialogTitle>Create New Project - Confirm Details</DialogTitle>
                                <DialogDescription>
                                    Please confirm/edit the address and provide a unique slug for the new project.
                                    {potentialProjectToLink && (
                                        <span className="block mt-1 text-xs text-amber-700 dark:text-amber-400">
                                            <AlertTriangle className="inline-block w-3 h-3 mr-1 align-text-bottom" />
                                            Warning: A project named "{potentialProjectToLink.title}" already exists at the original address.
                                            You can <Link href={`/project/${potentialProjectToLink.slug}`} target="_blank" className="text-blue-600 hover:underline">view that project</Link>.
                                            Ensure the address and slug below are correct for the *new* project you want to create.
                                        </span>
                                    )}
                                    {!potentialProjectToLink && (
                                        <span className="block mt-1 text-xs text-muted-foreground">
                                            (We couldn't automatically find a project at this address, but please ensure the slug is unique.)
                                        </span>
                                    )}
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="confirm-address" className="text-right">
                                        Address <span className="text-destructive">*</span>
                                    </Label>
                                    <div className="col-span-3">
                                        <Input
                                            id="confirm-address"
                                            value={projectFormData.address || ''}
                                            onChange={e => setProjectFormData({...projectFormData, address: e.target.value})}
                                            className="w-full"
                                            placeholder="Enter project address"
                                            required
                                        />
                                        {potentialProjectToLink && projectFormData.address === potentialProjectToLink.address && (
                                             <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                                                <AlertTriangle className="inline-block w-3 h-3 mr-1 align-text-bottom" />
                                                 This address is used by "{potentialProjectToLink.title}". Edit if creating a different project.
                                             </p>
                                         )}
                                    </div>
                                </div>
                                 <div className="grid grid-cols-4 items-start gap-4">
                                    <Label htmlFor="confirm-slug" className="text-right pt-2">
                                        Slug <span className="text-destructive">*</span>
                                    </Label>
                                    <div className="col-span-3 space-y-1">
                                        <div className="flex items-center gap-2">
                                             <Input
                                                id="confirm-slug"
                                                value={slugToCheck || ''}
                                                onChange={handleSlugInputChange}
                                                className="grow"
                                                placeholder="Enter unique project slug (e.g., project-name-123)"
                                                required
                                             />
                                             <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={handleCheckSlugAvailability}
                                                disabled={!slugToCheck || slugAvailability === 'checking'}
                                             >
                                                {slugAvailability === 'checking' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Check'}
                                             </Button>
                                        </div>
                                         {slugAvailability !== 'idle' && slugCheckMessage && (
                                            <div className={cn(
                                                "text-xs flex items-center gap-1",
                                                slugAvailability === 'available' && 'text-green-600',
                                                (slugAvailability === 'taken' || slugAvailability === 'error') && 'text-red-600',
                                                slugAvailability === 'checking' && 'text-muted-foreground'
                                            )}>
                                                {slugAvailability === 'available' && <CheckCircle2 className="w-3 h-3" />}
                                                {slugAvailability === 'taken' && <XCircle className="w-3 h-3" />}
                                                {slugAvailability === 'error' && <HelpCircle className="w-3 h-3" />}
                                                {slugAvailability === 'checking' && <Loader2 className="w-3 h-3 animate-spin" />}
                                                {slugCheckMessage}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="confirm-title" className="text-right">
                                        Title <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                        id="confirm-title"
                                        value={projectFormData.title || ''}
                                        onChange={e => setProjectFormData({...projectFormData, title: e.target.value})}
                                        className="col-span-3"
                                        placeholder="Enter project title"
                                        required
                                    />
                                </div>
                            </div>
                             <DialogFooter className="pt-4">
                                <DialogClose asChild>
                                    <Button type="button" variant="outline">Cancel</Button>
                                </DialogClose>
                                <Button
                                    type="button"
                                    onClick={handleContinueToFullForm}
                                    disabled={slugAvailability !== 'available' || !projectFormData.title?.trim() || !projectFormData.address?.trim()}
                                >
                                    Continue
                                </Button>
                            </DialogFooter>
                        </div>
                    ) : (
                        <form onSubmit={handleProjectSubmit}>
                             <DialogHeader>
                                <DialogTitle>{formMode === 'edit' ? 'Edit Project' : 'Create Project'}</DialogTitle>
                                <DialogDescription>
                                    {formMode === 'edit'
                                        ? `Editing project linked to post: ${post.title || '...'}. `
                                        : `Create a new project linked to post: ${post.title || '...'}. `}
                                    {formMode === 'edit' ? 'Click save when you\'re done.' : 'Fill in the details below and click Create Project.'}
                                </DialogDescription>
                            </DialogHeader>
                            <ScrollArea className="max-h-[70vh] overflow-y-auto px-1 py-4">
                                <div className="grid gap-4 px-2 py-1">
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="title" className="text-right">Title <span className="text-destructive">*</span></Label>
                                        <Input id="title" value={projectFormData.title || ''} onChange={e => setProjectFormData({...projectFormData, title: e.target.value})} className="col-span-3" required />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="slug" className="text-right">Slug <span className="text-destructive">*</span></Label>
                                        <Input id="slug" value={projectFormData.slug || ''} onChange={e => setProjectFormData({...projectFormData, slug: e.target.value})} className="col-span-3" disabled={formMode === 'edit'} required />
                                        {formMode === 'edit' && <small className="col-span-4 text-xs text-muted-foreground text-right">Slug cannot be changed after creation.</small>}
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="address" className="text-right">Address <span className="text-destructive">*</span></Label>
                                        <Input id="address" value={projectFormData.address || ''} onChange={e => setProjectFormData({...projectFormData, address: e.target.value})} className="col-span-3" required />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="status" className="text-right">Status</Label>
                                        <Select
                                            value={projectFormData.status || 'proposed'}
                                            onValueChange={(value) => setProjectFormData({...projectFormData, status: value as ProjectStatus})}
                                        >
                                            <SelectTrigger id="status" className="col-span-3">
                                                <SelectValue placeholder="Select status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {projectStatusOptions.map(option => (
                                                    <SelectItem key={option.value} value={option.value}>
                                                        {option.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {formMode === 'edit' && project && (
                                        <div className="grid grid-cols-1 gap-4 border-t pt-4 mt-4">
                                            <p className="font-medium text-base col-span-4">Project Team</p>
                                            <div className="col-span-4">
                                                {isLoadingCompanies ? (
                                                    <div className="flex items-center justify-center h-20">
                                                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                                                    </div>
                                                ) : associatedCompanies.length > 0 ? (
                                                    <ScrollArea className="w-full whitespace-nowrap rounded-md border">
                                                        <div className="flex w-max space-x-4 p-4">
                                                            {associatedCompanies.map((assoc) => (
                                                                <div key={assoc.id} className="flex flex-col justify-between min-h-[80px] w-[200px] border rounded-lg p-3 shadow-sm bg-card relative group">
                                                                    <div>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="absolute top-1 right-1 w-6 h-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                            onClick={() => handleRemoveCompany(assoc.id, assoc.companies?.name || 'Company')}
                                                                            disabled={removingAssociationId === assoc.id}
                                                                        >
                                                                            {removingAssociationId === assoc.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <XIcon className="w-3 h-3" />}
                                                                        </Button>
                                                                        <div className="flex items-center gap-2 mb-1">
                                                                            <Avatar className="h-6 w-6">
                                                                                <AvatarImage src={assoc.companies?.uploaded_logo_url || assoc.companies?.logo_url || undefined} alt={assoc.companies?.name} />
                                                                                <AvatarFallback className="text-xs">
                                                                                    {assoc.companies?.name ? assoc.companies.name.substring(0, 1) : <Building className="w-3 h-3"/>}
                                                                                </AvatarFallback>
                                                                            </Avatar>
                                                                            <span className="text-sm font-medium line-clamp-2 whitespace-normal">
                                                                                {assoc.companies?.name || 'Unknown Company'}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="mt-auto flex items-center justify-between">
                                                                        <p className="text-xs text-muted-foreground capitalize">{assoc.role || 'Unknown Role'}</p>
                                                                        {assoc.companies?.is_verified && (
                                                                            <span className="text-blue-500" title="Verified Company">
                                                                                <CheckIcon className="w-3 h-3" />
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <ScrollBar orientation="horizontal" />
                                                    </ScrollArea>
                                                ) : (
                                                    <p className="text-sm text-muted-foreground text-center py-4">No companies associated yet.</p>
                                                )}
                                            </div>

                                            <div className="col-span-4 space-y-2 relative">
                                                <Label htmlFor="company-search">Add Company</Label>
                                                <div className="relative">
                                                    <Input
                                                        id="company-search"
                                                        placeholder="Search by name..."
                                                        value={companySearchQuery}
                                                        onChange={(e) => setCompanySearchQuery(e.target.value)}
                                                        className="pr-8"
                                                    />
                                                    {isSearchingCompanies && (
                                                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground absolute right-2 top-2.5" />
                                                    )}
                                                </div>
                                                {companySearchResults.length > 0 && !isSearchingCompanies && (
                                                    <div className="border rounded-md max-h-40 overflow-y-auto">
                                                        {companySearchResults.map((company) => (
                                                            <div key={company.id} className="flex items-center justify-between p-2 hover:bg-accent text-sm">
                                                                <div className="flex items-center gap-2 overflow-hidden">
                                                                    <Avatar className="h-5 w-5 shrink-0">
                                                                        <AvatarImage src={company.uploaded_logo_url || company.logo_url || undefined} alt={company.name} />
                                                                        <AvatarFallback className="text-xs">{company.name.substring(0,1)}</AvatarFallback>
                                                                    </Avatar>
                                                                    <span className="truncate">{company.name}</span>
                                                                    {company.is_verified && <CheckIcon className="w-3 h-3 text-blue-500 shrink-0" />}
                                                                </div>
                                                                <Popover onOpenChange={(open) => !open && setSelectedRoleExisting('')}>
                                                                    <PopoverTrigger asChild>
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline"
                                                                            disabled={addingCompanyId === company.id || associatedCompanies.some(assoc => assoc.companies?.id === company.id)}
                                                                        >
                                                                            {addingCompanyId === company.id ? <Loader2 className="w-4 h-4 animate-spin" /> : associatedCompanies.some(assoc => assoc.companies?.id === company.id) ? 'Added' : 'Add'}
                                                                        </Button>
                                                                    </PopoverTrigger>
                                                                    <PopoverContent className="w-auto p-0">
                                                                        <div className="p-4 space-y-2">
                                                                            <p className="text-sm font-medium">Assign Role for {company.name}</p>
                                                                            <Select
                                                                                value={selectedRoleExisting}
                                                                                onValueChange={setSelectedRoleExisting}
                                                                            >
                                                                                <SelectTrigger>
                                                                                    <SelectValue placeholder="Select role" />
                                                                                </SelectTrigger>
                                                                                <SelectContent>
                                                                                    {projectRoleOptions.map(option => (
                                                                                        <SelectItem key={option.value} value={option.value}>
                                                                                            {option.label}
                                                                                        </SelectItem>
                                                                                    ))}
                                                                                </SelectContent>
                                                                            </Select>
                                                                            <Button
                                                                                size="sm"
                                                                                className="w-full"
                                                                                onClick={() => {
                                                                                    if (selectedRoleExisting) {
                                                                                        handleAddCompany(company, selectedRoleExisting);
                                                                                    } else {
                                                                                        toast.error("Please select a role.");
                                                                                    }
                                                                                }}
                                                                                disabled={!selectedRoleExisting || addingCompanyId === company.id}
                                                                            >
                                                                                {addingCompanyId === company.id ? <Loader2 className="w-4 h-4 animate-spin mr-1"/> : null}
                                                                                Confirm Add
                                                                            </Button>
                                                                        </div>
                                                                    </PopoverContent>
                                                                </Popover>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                                {companySearchQuery.length > 1 && !isSearchingCompanies && companySearchResults.length === 0 && (
                                                    <div className="p-2 text-center text-sm text-muted-foreground">
                                                        No companies found matching "{companySearchQuery}".
                                                         <Popover onOpenChange={(open) => !open && setSelectedRoleNew('')}>
                                                            <PopoverTrigger asChild>
                                                                <Button variant="link" size="sm" className="ml-1">Create & Add "{companySearchQuery}"?</Button>
                                                            </PopoverTrigger>
                                                            <PopoverContent className="w-auto p-0">
                                                                <div className="p-4 space-y-2">
                                                                    <p className="text-sm font-medium">Create & Add New Company</p>
                                                                    <Input disabled value={companySearchQuery} />
                                                                    <Select
                                                                        value={selectedRoleNew}
                                                                        onValueChange={setSelectedRoleNew}
                                                                    >
                                                                        <SelectTrigger>
                                                                            <SelectValue placeholder="Select role" />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            {projectRoleOptions.map(option => (
                                                                                <SelectItem key={option.value} value={option.value}>
                                                                                    {option.label}
                                                                                </SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                    <Button
                                                                        size="sm" className="w-full"
                                                                        onClick={() => {
                                                                            if (selectedRoleNew) {
                                                                                handleCreateAndAddCompany(companySearchQuery, selectedRoleNew);
                                                                            } else {
                                                                                toast.error("Please select a role.");
                                                                            }
                                                                        }}
                                                                        disabled={!selectedRoleNew || isCreatingCompany}
                                                                    >
                                                                        {isCreatingCompany ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                                                                        Create & Add Company
                                                                    </Button>
                                                                </div>
                                                            </PopoverContent>
                                                        </Popover>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 gap-4 border-t pt-4 mt-4">
                                        <p className="font-medium text-base col-span-4">Project Details</p>
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="description" className="text-right">Description</Label>
                                        <Textarea id="description" value={projectFormData.description || ''} onChange={e => setProjectFormData({...projectFormData, description: e.target.value})} className="col-span-3" placeholder="Brief project description..." />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="project_tags" className="text-right">Tags</Label>
                                        <Input id="project_tags" value={Array.isArray(projectFormData.project_tags) ? projectFormData.project_tags.join(', ') : ''} onChange={e => setProjectFormData({...projectFormData, project_tags: e.target.value.split(',').map(s => s.trim()).filter(s => s)})} className="col-span-3" placeholder="e.g., LEED, Historic, Transit-Oriented" />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="uses" className="text-right">Property Type</Label>
                                        <Input id="uses" value={Array.isArray(projectFormData.uses) ? projectFormData.uses.join(', ') : projectFormData.uses || ''} onChange={e => setProjectFormData({...projectFormData, uses: e.target.value.split(',').map(s => s.trim()).filter(s => s)})} className="col-span-3" placeholder="e.g., Residential, Mixed Use" />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="ownership_type" className="text-right">Ownership</Label>
                                        <Select
                                            value={projectFormData.ownership_type || 'private'}
                                            onValueChange={(value) => setProjectFormData({...projectFormData, ownership_type: value as any})}
                                        >
                                            <SelectTrigger id="ownership_type" className="col-span-3">
                                                <SelectValue placeholder="Select ownership type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {ownershipTypeOptions.map(option => (
                                                    <SelectItem key={option.value} value={option.value}>
                                                        {option.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="building_type" className="text-right">Building Type</Label>
                                        <Select
                                            value={projectFormData.building_type || 'new_construction'}
                                            onValueChange={(value) => setProjectFormData({...projectFormData, building_type: value as any})}
                                        >
                                            <SelectTrigger id="building_type" className="col-span-3">
                                                <SelectValue placeholder="Select building type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {buildingTypeOptions.map(option => (
                                                    <SelectItem key={option.value} value={option.value}>
                                                        {option.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="construction_type" className="text-right">Construction</Label>
                                        <Input id="construction_type" value={projectFormData.construction_type || ''} onChange={e => setProjectFormData({...projectFormData, construction_type: e.target.value})} className="col-span-3" placeholder="e.g., Type IA, Wood Frame" />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="zoning" className="text-right">Zoning</Label>
                                        <Input id="zoning" value={projectFormData.zoning || ''} onChange={e => setProjectFormData({...projectFormData, zoning: e.target.value})} className="col-span-3" placeholder="e.g., R-5, C-2, MX-1" />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="land_use" className="text-right">Land Use</Label>
                                        <Input id="land_use" value={projectFormData.land_use || ''} onChange={e => setProjectFormData({...projectFormData, land_use: e.target.value})} className="col-span-3" placeholder="e.g., Mixed Use, Commercial" />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="energy_certification" className="text-right">Energy Cert</Label>
                                        <Input id="energy_certification" value={projectFormData.energy_certification || ''} onChange={e => setProjectFormData({...projectFormData, energy_certification: e.target.value})} className="col-span-3" placeholder="e.g., LEED Gold, Energy Star" />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="floors" className="text-right">Floors</Label>
                                        <Input id="floors" type="number" value={projectFormData.floors ?? ''} onChange={e => setProjectFormData({...projectFormData, floors: parseInt(e.target.value) || undefined})} className="col-span-3" />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="height_ft" className="text-right">Height (ft)</Label>
                                        <Input id="height_ft" type="number" value={projectFormData.height_ft ?? ''} onChange={e => setProjectFormData({...projectFormData, height_ft: parseInt(e.target.value) || undefined})} className="col-span-3" />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="lot_area" className="text-right">Lot Area (SF)</Label>
                                        <Input id="lot_area" type="number" value={projectFormData.lot_area ?? ''} onChange={e => setProjectFormData({...projectFormData, lot_area: parseInt(e.target.value) || undefined})} className="col-span-3" />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="building_area" className="text-right">Building Area (SF)</Label>
                                        <Input id="building_area" type="number" value={projectFormData.building_area ?? ''} onChange={e => setProjectFormData({...projectFormData, building_area: parseInt(e.target.value) || undefined})} className="col-span-3" />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="floor_area_ratio" className="text-right">Floor Area Ratio</Label>
                                        <Input id="floor_area_ratio" type="number" step="0.1" value={projectFormData.floor_area_ratio ?? ''} onChange={e => setProjectFormData({...projectFormData, floor_area_ratio: parseFloat(e.target.value) || undefined})} className="col-span-3" />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="project_cost" className="text-right">Project Cost ($)</Label>
                                        <Input id="project_cost" type="number" value={projectFormData.project_cost ?? ''} onChange={e => setProjectFormData({...projectFormData, project_cost: parseInt(e.target.value) || undefined})} className="col-span-3" />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="assessed_value" className="text-right">Assessed Value ($)</Label>
                                        <Input id="assessed_value" type="number" value={projectFormData.assessed_value ?? ''} onChange={e => setProjectFormData({...projectFormData, assessed_value: parseInt(e.target.value) || undefined})} className="col-span-3" />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="apartments" className="text-right">Apartments</Label>
                                        <Input id="apartments" type="number" value={projectFormData.apartment_count ?? ''} onChange={e => setProjectFormData({...projectFormData, apartment_count: parseInt(e.target.value) || undefined})} className="col-span-3" />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="condos" className="text-right">Condos</Label>
                                        <Input id="condos" type="number" value={projectFormData.condo_count ?? ''} onChange={e => setProjectFormData({...projectFormData, condo_count: parseInt(e.target.value) || undefined})} className="col-span-3" />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="hotel_rooms" className="text-right">Hotel Rooms</Label>
                                        <Input id="hotel_rooms" type="number" value={projectFormData.hotel_count ?? ''} onChange={e => setProjectFormData({...projectFormData, hotel_count: parseInt(e.target.value) || undefined})} className="col-span-3" />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="affordable_units" className="text-right">Affordable Units</Label>
                                        <Input id="affordable_units" type="number" value={projectFormData.affordable_unit_count ?? ''} onChange={e => setProjectFormData({...projectFormData, affordable_unit_count: parseInt(e.target.value) || undefined})} className="col-span-3" />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="retail_space_sf" className="text-right">Retail SF</Label>
                                        <Input id="retail_space_sf" type="number" value={projectFormData.retail_space_sf ?? ''} onChange={e => setProjectFormData({...projectFormData, retail_space_sf: parseInt(e.target.value) || undefined})} className="col-span-3" />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="office_space_sf" className="text-right">Office SF</Label>
                                        <Input id="office_space_sf" type="number" value={projectFormData.office_space_sf ?? ''} onChange={e => setProjectFormData({...projectFormData, office_space_sf: parseInt(e.target.value) || undefined})} className="col-span-3" />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="parking_spaces" className="text-right">Parking</Label>
                                        <Input id="parking_spaces" type="number" value={projectFormData.parking_spaces ?? ''} onChange={e => setProjectFormData({...projectFormData, parking_spaces: parseInt(e.target.value) || undefined})} className="col-span-3" />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="bike_spaces" className="text-right">Bike Spaces</Label>
                                        <Input id="bike_spaces" type="number" value={projectFormData.bike_spaces ?? ''} onChange={e => setProjectFormData({...projectFormData, bike_spaces: parseInt(e.target.value) || undefined})} className="col-span-3" />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="start_date" className="text-right">Start Date</Label>
                                        <Input id="start_date" type="date" value={projectFormData.start_date || ''} onChange={e => setProjectFormData({...projectFormData, start_date: e.target.value === "" ? null : e.target.value})} className="col-span-3" />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="construction_start_date" className="text-right">Construction Start</Label>
                                        <Input id="construction_start_date" type="date" value={projectFormData.construction_start_date || ''} onChange={e => setProjectFormData({...projectFormData, construction_start_date: e.target.value === "" ? null : e.target.value})} className="col-span-3" />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="completion_date" className="text-right">Completion Date</Label>
                                        <Input id="completion_date" type="date" value={projectFormData.completion_date || ''} onChange={e => setProjectFormData({...projectFormData, completion_date: e.target.value === "" ? null : e.target.value})} className="col-span-3" />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="primary_image_url" className="text-right">Primary Image URL</Label>
                                        <Input id="primary_image_url" value={projectFormData.primary_image_url || ''} onChange={e => setProjectFormData({...projectFormData, primary_image_url: e.target.value})} className="col-span-3" placeholder="https://example.com/image.jpg" />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="sources" className="text-right">Sources</Label>
                                        <Input id="sources" value={Array.isArray(projectFormData.sources) ? projectFormData.sources.join(', ') : ''} onChange={e => setProjectFormData({...projectFormData, sources: e.target.value.split(',').map(s => s.trim()).filter(s => s)})} className="col-span-3" placeholder="Source URLs or references" />
                                    </div>
                                </div>
                            </ScrollArea>

                             <DialogFooter className="pt-2 flex items-center justify-between mt-4">
                                {formMode === 'edit' && (
                                    <AlertDialog open={showUnlinkConfirmation} onOpenChange={setShowUnlinkConfirmation}>
                                        <AlertDialogTrigger asChild>
                                            <Button
                                                type="button"
                                                variant="destructive"
                                                size="sm"
                                                className="mr-auto"
                                                disabled={isSubmittingProject || isUnlinking}
                                            >
                                                <Link2Off className="w-4 h-4 mr-1.5" />
                                                Unlink Project
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Confirm Unlink</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Are you sure you want to unlink this post from the project "{project?.title || 'this project'}"?
                                                    This will remove the association but will not delete the project itself.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel disabled={isUnlinking}>Cancel</AlertDialogCancel>
                                                <AlertDialogAction
                                                    onClick={handleUnlinkProject}
                                                    disabled={isUnlinking}
                                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                >
                                                    {isUnlinking ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin"/>Unlinking...</>) : "Yes, Unlink"}
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                )}

                                <div className={cn("flex items-center gap-2", formMode === 'edit' ? "ml-auto" : "ml-auto w-full justify-end")}>
                                    <DialogClose asChild>
                                        <Button type="button" variant="outline">Cancel</Button>
                                    </DialogClose>
                                    <Button type="submit" disabled={isSubmittingProject || isUnlinking}>
                                        {isSubmittingProject ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>) : formMode === 'edit' ? 'Save Changes' : 'Create Project'}
                                    </Button>
                                </div>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}