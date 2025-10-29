import { useState, useEffect, useRef, useCallback } from "react";
import { Building2, Clock, XCircle, AlertCircle, RotateCw, Award, Plus, Loader2, Pencil, PlusCircle, ArrowUpRight, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fetchProjectImages } from "@/components/projects";
import { EditProjectDialog } from "./edit-project-dialog";
import { ProjectDialog } from "./project-dialog";
import { cn } from "@/lib/utils";
import { useSupabase } from "@/lib/providers/supabase-context";
import { useAuth } from "@/lib/providers/auth-context";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { loadStripe } from '@stripe/stripe-js';
import { COMPANY_ROLES } from "@/lib/constants";

// Load Stripe outside component to avoid recreating on render
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export interface ProjectAssociation {
  id: string;
  project_slug: string;
  project_name: string;
  role?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at?: string;
  metadata?: {
    city?: string;
    neighborhood?: string;
    project_status?: string;
    created_via?: string;
  };
  images?: Array<{
    image: {
      asset: {
        url: string;
        metadata?: {
          lqip?: string;
        };
      };
    };
  }>;
}

export type ProjectStatus = 'proposed' | 'approved' | 'under_construction' | 'completed' | 'cancelled';

interface ProjectSpotlightData {
  company_project_id: string;
  company_id: string;
  company_projects: {
    project_slug: string;
  };
}

export function ProjectsSection({ companyId }: { companyId: string }): React.ReactElement {
  const [projects, setProjects] = useState<ProjectAssociation[]>([]);
  const [projectImages, setProjectImages] = useState<Map<string, any>>(new Map());
  const [loadingState, setLoadingState] = useState<'initial' | 'loadingInitial' | 'loadingMore' | 'idle' | 'error'>('initial');
  const [showProjectDialog, setShowProjectDialog] = useState(false);
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [companyPrimaryRole, setCompanyPrimaryRole] = useState<string>('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [editingProject, setEditingProject] = useState<ProjectAssociation | null>(null);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [projectSpotlights, setProjectSpotlights] = useState<Set<string>>(new Set());
  const [loadingSpotlights, setLoadingSpotlights] = useState(true);
  const [processingSpotlightProjects, setProcessingSpotlightProjects] = useState<Set<string>>(new Set());
  const router = useRouter();
  const { user } = useAuth();
  const { supabase } = useSupabase();
  const ITEMS_PER_PAGE = 6;
  const searchParams = useSearchParams();
  const shouldRefresh = searchParams.get('refresh');
  const didInitialLoad = useRef(false);

  // Update openProjectSearch to use direct Stripe checkout
  const handleSpotlightCheckout = async (companyId: string, projectSlug: string) => {
    if (!user?.id || !companyId || !projectSlug) {
      toast.error('Missing required information for spotlight purchase.');
      return;
    }

    setProcessingSpotlightProjects(prev => new Set([...prev, projectSlug]));
    try {
      const response = await fetch('/api/create-spotlight-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyId,
          projectSlug,
        }),
      });

      const { url, sessionId, error } = await response.json();
      
      if (!response.ok || error) {
        throw new Error(error || 'Failed to create spotlight checkout session.');
      }

      if (url) {
        window.location.href = url;
      } else if (sessionId) {
        const stripe = await stripePromise;
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
      setProcessingSpotlightProjects(prev => {
        const newSet = new Set(prev);
        newSet.delete(projectSlug);
        return newSet;
      });
    } finally {
      setProcessingSpotlightProjects(prev => {
        const newSet = new Set(prev);
        newSet.delete(projectSlug);
        return newSet;
      });
    }
  };

  // Add function to check for active spotlights
  const checkProjectSpotlights = useCallback(async (projectIds: string[]) => {
    if (!projectIds.length || !supabase) return;
    try {
      const { data, error } = await supabase
        .from('company_spotlight')
        .select(`
          company_project_id,
          company_id,
          company_projects!inner(project_slug)
        `)
        .eq('status', 'active')
        .eq('company_id', companyId)
        .in('company_projects.project_slug', projectIds);

      if (error) throw error;

      // Create a Set of project slugs that have active spotlights for this company
      const spotlightSet = new Set(
        (data as unknown as ProjectSpotlightData[])
          .map(spotlight => spotlight.company_projects.project_slug)
      );

      setProjectSpotlights(spotlightSet);
    } catch (error) {
      console.error('Error checking project spotlights:', error);
    } finally {
      setLoadingSpotlights(false);
    }
  }, [companyId, supabase]);

  const loadData = useCallback(async (): Promise<void> => {
    if (!companyId || !supabase) return;

    // Prevent loading if:
    // - Already in loading state
    // - Already loaded once and this is not a refresh request or pagination
    if (loadingState === 'loadingInitial' || loadingState === 'loadingMore') return;
    if (didInitialLoad.current && !shouldRefresh && page === 1) return;

    try {
      if (page === 1) {
        setLoadingState('loadingInitial');
        setLoadingSpotlights(true);
      } else {
        setLoadingState('loadingMore');
      }

      let projectsData: any[] = [];
      let imagesData: Record<string, any> = {};

      const { data, error } = await supabase
        .from('company_projects')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .range((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE - 1);
        
      if (error) throw error;
      
      projectsData = data || [];
      
      // Fetch and cache images together with projects
      if (projectsData.length > 0) {
        const projectSlugs = projectsData.map(p => p.project_slug);
        const images = await fetchProjectImages(projectSlugs);
        imagesData = Object.fromEntries(images);
      }

      // Update state
      setProjects(prev => {
        if (page === 1) return projectsData;
        // Filter out any duplicates when appending
        const existingSlugs = new Set(prev.map(p => p.project_slug));
        const newProjects = projectsData.filter(p => !existingSlugs.has(p.project_slug));
        return [...prev, ...newProjects];
      });
      
      setHasMore(projectsData.length === ITEMS_PER_PAGE);

      // Update images
      setProjectImages(prev => new Map([...prev, ...Object.entries(imagesData)]));

      // Load company role data if needed
      if (!companyPrimaryRole) {
        const { data: approvalData } = await supabase
          .from('company_approvals')
          .select('metadata')
          .eq('company_id', companyId)
          .eq('status', 'approved')
          .single();

        if (approvalData?.metadata?.claim_request?.primaryRole) {
          const role = approvalData.metadata.claim_request.primaryRole;
          if (COMPANY_ROLES.includes(role)) {
            setCompanyPrimaryRole(role);
          }
        } else {
          const { data: companyData } = await supabase
            .from('companies')
            .select('metadata')
            .eq('id', companyId)
            .single();

          if (companyData?.metadata?.primaryRole) {
            const role = companyData.metadata.primaryRole;
            if (COMPANY_ROLES.includes(role)) {
              setCompanyPrimaryRole(role);
            }
          }
        }
      }
      
      // After setting projects, check for spotlights
      const projectIds = projectsData.map(p => p.project_slug);
      await checkProjectSpotlights(projectIds);
      
      didInitialLoad.current = true;
      setLoadingState('idle');
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load company data');
      setLoadingState('error');
    }
  }, [companyId, page, companyPrimaryRole, shouldRefresh, checkProjectSpotlights, supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Reset state when company changes
  useEffect(() => {
    setPage(1);
    setProjects([]);
    setProjectImages(new Map());
    setCompanyPrimaryRole('');
    didInitialLoad.current = false;
    setLoadingState('initial');
  }, [companyId]);

  const handleSubmitProjectAssociation = async (project: { slug: string; title: string; status?: string }, role: string) => {
    if (!project || !user?.id || !supabase) {
      toast.error('Please select a project');
      return;
    }

    try {
      setIsAddingProject(true);

      // Insert the basic association first, without project_status, and get its ID
      const { data: newAssociation, error: insertError } = await supabase
        .from('company_projects')
        .insert({
          company_id: companyId,
          project_slug: project.slug,
          project_name: project.title,
          role: role,
          status: 'pending',
          submitted_by: user.id,
          metadata: {
            project_status: project.status || 'proposed'
          }
        })
        .select('id') // Select the ID of the inserted row
        .single(); // Expect a single row back

      if (insertError) throw insertError;
      if (!newAssociation?.id) throw new Error("Failed to retrieve new association ID.");
      
      const newAssociationId = newAssociation.id;
      
      // Reset page to 1 and force a refresh
      setPage(1);
      didInitialLoad.current = false;
      await loadData();

      setShowProjectDialog(false);
      
      toast.success('Project association and status update requested');
    } catch (error) {
      console.error('Error adding project association:', error);
      toast.error('Failed to add project association and status update');
    } finally {
      setIsAddingProject(false);
    }
  };

  const handleSubmitEdit = async (role: string, status: ProjectStatus) => {
    if (!editingProject || !user?.id || !supabase) return;

    const originalRole = editingProject.role;
    const originalAssociationStatus = editingProject.status;
    const originalProjectStatus = editingProject.metadata?.project_status as ProjectStatus | undefined;

    const roleChanged = role !== originalRole;
    const statusChanged = status !== originalProjectStatus;

    if (!roleChanged && !statusChanged) {
      toast.info('No changes detected.');
      setEditingProject(null);
      return;
    }

    setIsSubmittingEdit(true);

    try {
      let needsReload = false;
      let successMessage = '';

      // Case 1: Association is NOT approved -> Update association, separate status request
      if (originalAssociationStatus !== 'approved') {
        let associationUpdatePayload: Partial<ProjectAssociation> = {
          status: 'pending', // Reset to pending for review
          updated_at: new Date().toISOString(),
        };
        let statusUpdateRequestNeeded = false;
        
        // Update role if changed
        if (roleChanged) {
          associationUpdatePayload.role = role;
          successMessage = 'Project role updated. ';
        }
        
        // Only update the association itself initially
        const { error: updateError } = await supabase
          .from('company_projects')
          .update(associationUpdatePayload)
          .eq('id', editingProject.id)
          .eq('company_id', companyId);
        if (updateError) throw updateError;
        
        needsReload = true; // Always reload if association was touched

        // If status changed, create a separate request
        if (statusChanged) {
          statusUpdateRequestNeeded = true;
          if (successMessage) successMessage += ' ';
          successMessage += 'Project status update request submitted.';
        }
        
        // Perform status update request if needed
        if (statusUpdateRequestNeeded) {
          const { error: statusError } = await supabase
            .from('project_status_updates')
            .insert({
              company_project_id: editingProject.id,
              company_id: companyId,
              project_slug: editingProject.project_slug,
              requested_project_status: status,
              current_project_status: originalProjectStatus || 'unknown', // Provide a default
              requested_by_user_id: user.id,
              status: 'pending' 
            });
            
          if (statusError) {
             // Handle potential unique constraint violation (duplicate request)
             if (statusError.code === '23505') {
                toast.info('A status update request for this project status already exists.');
             } else {
                throw statusError; // Re-throw other errors
             }
          }
        } else {
          // If only role changed, refine the success message
          if (roleChanged) {
             successMessage = 'Project association updated and submitted for review.';
          }
        }
      } 
      // Case 2: Association IS approved
      else {
        let updatePayload: Partial<ProjectAssociation> = { updated_at: new Date().toISOString() };
        let statusUpdateRequestNeeded = false;

        // Subcase 2a: Role changed (update directly, keep approved)
        if (roleChanged) {
          updatePayload.role = role;
          successMessage = 'Project role updated.';
        }

        // Subcase 2b: Status changed (create separate request)
        if (statusChanged) {
          statusUpdateRequestNeeded = true;
          if (successMessage) successMessage += ' '; // Combine messages
          successMessage += 'Project status update request submitted.';
        }
        
        // Perform direct update if role changed
        if (roleChanged) {
           const { error } = await supabase
              .from('company_projects')
              .update(updatePayload)
              .eq('id', editingProject.id)
              .eq('company_id', companyId);
            if (error) throw error;
            needsReload = true; // Reload if role was directly updated
        }
        
        // Perform status update request if status changed
        if (statusUpdateRequestNeeded) {
          const { error } = await supabase
            .from('project_status_updates')
            .insert({
              company_project_id: editingProject.id,
              company_id: companyId,
              project_slug: editingProject.project_slug,
              requested_project_status: status,
              current_project_status: originalProjectStatus || 'unknown', // Provide a default
              requested_by_user_id: user.id,
              status: 'pending' 
            });
          if (error) {
             // Handle potential unique constraint violation (duplicate request)
             if (error.code === '23505') { // Check for unique violation code
                toast.info('A status update request for this project status already exists.');
             } else {
                throw error; // Re-throw other errors
             }
          } else {
             // Don't set needsReload here, as the main list doesn't show status requests
          }
        }
      }

      // Common cleanup
      if (needsReload) {
        setPage(1);
        didInitialLoad.current = false;
        await loadData();
      }
      
      if (successMessage) {
         toast.success(successMessage);
      } else {
         // This case should technically not be reachable due to the initial check
         toast.info('No actionable changes applied.');
      }
      setEditingProject(null);

    } catch (error) {
      console.error('Error processing project association update:', error);
      toast.error('Failed to process project association update.');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleEditProject = async (project: ProjectAssociation): Promise<void> => {
    setEditingProject(project);
    return Promise.resolve();
  };

  const handleDeleteAssociation = async (projectSlug: string) => {
    if (!supabase) {
      toast.error('Database connection error');
      return;
    }

    try {
      setIsDeleting(true);
      const { error } = await supabase
        .from('company_projects')
        .delete()
        .eq('company_id', companyId)
        .eq('project_slug', projectSlug);

      if (error) throw error;

      // Reset page to 1 and reload the data
      setPage(1);
      didInitialLoad.current = false;
      await loadData();
      
      // Close both dialogs
      setEditingProject(null);
      
      toast.success('Project association removed');
    } catch (error) {
      console.error('Error deleting project association:', error);
      toast.error('Failed to remove project association');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="mt-6 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2 flex-1">
            <Award className="h-5 w-5 text-blue-600 shrink-0" />
            <h3 className="text-base font-semibold">Project Portfolio</h3>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowProjectDialog(true)}
            className="w-full sm:w-auto"
          >
            <PlusCircle className="h-4 w-4 mr-0.5" />
            Add Project
          </Button>
        </div>
        
        {(loadingState === 'loadingInitial' || loadingState === 'initial') ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : projects.length > 0 ? (
          <div className="space-y-3">
            {projects.map((project, index) => (
              <Link
                key={`${project.id}-${index}`}
                href={`/project/${project.project_slug}`}
                target="_blank"
                className="block"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 bg-white dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-zinc-700 p-3 hover:bg-gray-50 dark:hover:bg-zinc-700/50 transition-colors group">
                  <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0 w-full">
                    <div className="w-16 h-16 rounded-lg bg-gray-100 dark:bg-zinc-700 flex items-center justify-center shrink-0 overflow-hidden">
                      {projectImages.get(project.project_slug) ? (
                        <img
                          src={projectImages.get(project.project_slug).url}
                          alt={project.project_name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <Building2 className="h-6 w-6 text-gray-400" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <div className={cn(
                          "h-2 w-2 rounded-full shrink-0",
                          project.metadata?.project_status === 'proposed' && "bg-yellow-500",
                          project.metadata?.project_status === 'approved' && "bg-blue-500",
                          project.metadata?.project_status === 'under_construction' && "bg-orange-500",
                          project.metadata?.project_status === 'completed' && "bg-green-500",
                          project.metadata?.project_status === 'cancelled' && "bg-red-500"
                        )} />
                        <div className="text-xs text-muted-foreground">
                          {project.metadata?.project_status === 'proposed' && "Proposed"}
                          {project.metadata?.project_status === 'approved' && "Approved"}
                          {project.metadata?.project_status === 'under_construction' && "Under Construction"}
                          {project.metadata?.project_status === 'completed' && "Completed"}
                          {project.metadata?.project_status === 'cancelled' && "Cancelled"}
                        </div>
                        {projectSpotlights.has(project.project_slug) && (
                          <Badge variant="secondary" className="bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 flex items-center gap-1">
                            <Star className="h-3 w-3" />
                            Featured
                          </Badge>
                        )}
                      </div>
                      <div className="font-medium text-sm truncate" title={project.project_name}>{project.project_name}</div>
                      {(project.status === 'pending' || project.status === 'rejected') && (
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {project.status === 'pending' ? (
                            (!project.metadata?.created_via || project.metadata?.created_via !== "spotlight_purchase") ? (
                              <Badge variant="outline" className="flex items-center gap-1 text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
                                <Clock className="h-3 w-3" />
                                Association Pending
                              </Badge>
                            ) : null
                          ) : (
                            <Badge variant="outline" className="flex items-center gap-1 text-red-600 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
                              <XCircle className="h-3 w-3" />
                              Association Rejected
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto mt-1 sm:mt-0 shrink-0">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full sm:w-auto justify-center sm:justify-start"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleEditProject(project);
                      }}
                    >
                      <Pencil className="h-4 w-4 mr-0.5" />
                      Edit Association
                    </Button>
                    {project.status === 'approved' && !projectSpotlights.has(project.project_slug) && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full sm:w-auto text-amber-600 hover:text-amber-700 border-amber-200 hover:bg-amber-50 dark:border-amber-800 dark:hover:bg-amber-900/20 justify-center sm:justify-start"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleSpotlightCheckout(companyId, project.project_slug);
                        }}
                        disabled={processingSpotlightProjects.has(project.project_slug)}
                      >
                        {processingSpotlightProjects.has(project.project_slug) ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Star className="h-4 w-4 mr-1" />
                        )}
                        {processingSpotlightProjects.has(project.project_slug) ? 'Processing...' : 'Get Featured'}
                      </Button>
                    )}
                    <div className="hidden sm:flex items-center justify-center pl-1">
                       <ArrowUpRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}

            {hasMore && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setPage(p => p + 1)}
                disabled={loadingState === 'loadingMore'}
              >
                {loadingState === 'loadingMore' ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-0.5 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-0.5" />
                    Load More Projects
                  </>
                )}
              </Button>
            )}
          </div>
        ) : loadingState === 'error' ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">Error Loading Projects</h4>
            <p className="text-sm text-gray-500 max-w-sm mx-auto mb-4">
              There was a problem loading your projects. Please try again.
            </p>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                didInitialLoad.current = false;
                loadData();
              }}
            >
              <RotateCw className="h-4 w-4 mr-0.5" />
              Retry
            </Button>
          </div>
        ) : loadingState === 'idle' ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center">
              <Award className="h-6 w-6 text-gray-400" />
            </div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Build Your Project Portfolio</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 max-w-sm mx-auto mb-2">
              Start by adding projects your company has worked on. This helps establish your track record and increases visibility to potential clients.
            </p>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowProjectDialog(true)}
            >
              <PlusCircle className="h-4 w-4 mr-0.5" />
              Add Your First Project
            </Button>
          </div>
        ) : null}
      </div>
      
      <EditProjectDialog
        open={!!editingProject}
        onOpenChange={(open) => !open && setEditingProject(null)}
        project={editingProject}
        onSubmit={handleSubmitEdit}
        onDelete={async () => {
          if (editingProject) {
            await handleDeleteAssociation(editingProject.project_slug);
          }
        }}
        isSubmitting={isSubmittingEdit}
        isDeleting={isDeleting}
        companyPrimaryRole={companyPrimaryRole}
        projectImages={projectImages}
      />

      <ProjectDialog
        open={showProjectDialog}
        onOpenChange={setShowProjectDialog}
        onSubmit={handleSubmitProjectAssociation}
        isAddingProject={isAddingProject}
        companyPrimaryRole={companyPrimaryRole}
      />
    </>
  );
} 