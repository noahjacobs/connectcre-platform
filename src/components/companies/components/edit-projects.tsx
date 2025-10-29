import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, Trash2, Building2, Award } from 'lucide-react';
import { toast } from 'sonner';
import { fetchCompanyProjectAssociations, removeCompanyProject } from '@/components/projects';
import { ScrollArea } from '@/components/ui/scroll-area';
import Link from 'next/link';
import { useSupabase } from "@/lib/providers/supabase-context";
import { useAuth } from '@/lib/providers/auth-context'; // Import useAuth
import { ProjectDialog, type ProjectSearchResult } from './dashboard/project-dialog';

interface ProjectAssociation {
  id: string; // company_projects primary key
  project_slug: string;
  project_name: string;
  role: string | null;
  status: 'pending' | 'approved' | 'rejected';
  metadata?: {
    project_status?: string; // e.g., 'active', 'completed'
    // other metadata...
  };
}

interface EditProjectsProps {
  companyId: string;
  companyName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void; // Callback to refresh projects in CompanyDialog
}

export function EditProjects({
  companyId,
  companyName,
  isOpen,
  onClose,
  onSuccess,
}: EditProjectsProps) {
  const [projects, setProjects] = useState<ProjectAssociation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null); // Track which project is being deleted
  const [error, setError] = useState<string | null>(null);

  // --- New State for Add Project Flow ---
  const [showAddProjectDialog, setShowAddProjectDialog] = useState(false);
  const [isAddingProject, setIsAddingProject] = useState(false);
  const { user } = useAuth(); // Get user for submitted_by
  const { supabase } = useSupabase();
  // --- End New State ---

  const loadProjects = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fetchedProjects = await fetchCompanyProjectAssociations(companyId);
      setProjects(fetchedProjects || []);
    } catch (err: any) {
      console.error('Error fetching company projects:', err);
      setError(`Failed to load projects: ${err.message || 'Unknown error'}`);
      toast.error('Failed to load associated projects.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && companyId) {
      loadProjects();
    } else {
      // Reset state when closed
      setProjects([]);
      setError(null);
      setIsLoading(false);
      setIsDeleting(null);
    }
  }, [isOpen, companyId]);

  const handleRemoveProject = async (associationId: string, projectName: string) => {
    if (!confirm(`Are you sure you want to remove the association with project "${projectName}"? This cannot be undone.`)) {
      return;
    }

    setIsDeleting(associationId);
    setError(null);
    try {
      await removeCompanyProject(associationId);
      toast.success(`Project "${projectName}" association removed.`);
      setProjects(prev => prev.filter(p => p.id !== associationId));
      onSuccess(); // Notify parent to refresh projects
    } catch (err: any) {
      console.error('Error removing project association:', err);
      setError(`Failed to remove project: ${err.message || 'Unknown error'}`);
      toast.error('Failed to remove project association.');
    } finally {
      setIsDeleting(null);
    }
  };

  // --- Updated Add Project Handler ---
  const handleAddProject = () => {
    setShowAddProjectDialog(true); // Open the ProjectDialog
  };
  // --- End Updated Handler ---

  // --- New Project Association Submit Handler ---
  const handleProjectAssociationSubmit = async (
    project: ProjectSearchResult,
    role: string
  ) => {
    if (!user?.id || !companyId || !supabase) {
      toast.error('Missing user or company information for association');
      return;
    }
    if (!project || !project.slug) {
        toast.error("Invalid project selected.");
        return;
    }

    setIsAddingProject(true);
    setError(null);

    try {
      const { error: insertError } = await supabase
        .from('company_projects')
        .insert({
          company_id: companyId,
          project_slug: project.slug,
          project_name: project.title || 'Untitled Project', // Use project title
          role: role || null, // Use provided role, ensure it can be null
          status: 'pending', // Associations start as pending
          submitted_by: user.id,
          metadata: {
            // Add relevant project metadata if available in ProjectSearchResult
            project_status: project.status || 'unknown', // Or derive from Sanity status
            city: project.city,
            neighborhood: project.neighborhood,
          }
        });

      if (insertError) {
        // Handle potential unique constraint violation (already associated)
        if (insertError.code === '23505') {
             toast.info(`"${project.title}" is already associated or pending association with this company.`);
        } else {
            throw insertError;
        }
      } else {
        toast.success(`Association request for "${project.title}" submitted.`);
        loadProjects(); // Refresh the list in this dialog
        onSuccess();    // Notify the parent dialog (CompanyDialog)
        setShowAddProjectDialog(false); // Close the ProjectDialog
      }

    } catch (err: any) {
      console.error('Error adding project association:', err);
      setError(`Failed to add project: ${err.message || 'Unknown error'}`);
      toast.error('Failed to submit project association request.');
    } finally {
      setIsAddingProject(false);
    }
  };
  // --- End New Handler ---

  const renderProjectList = (projectList: ProjectAssociation[], type: 'active' | 'completed') => {
    const Icon = type === 'active' ? Building2 : Award;
    const title = type === 'active' ? 'Active Projects' : 'Completed Projects';

    if (projectList.length === 0) {
      return (
        <div className="text-center text-sm text-gray-500 py-4">
          No {type} projects associated yet.
        </div>
      );
    }

    return (
      <div>
        <h4 className="text-sm font-medium text-gray-500 dark:text-zinc-400 mb-2">{title}</h4>
        <ul className="space-y-2">
          {projectList.map((proj) => (
            <li key={proj.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-zinc-800 rounded-md">
              <div className="flex items-center gap-2 overflow-hidden">
                <Icon className={`h-4 w-4 shrink-0 ${type === 'active' ? 'text-blue-600' : 'text-emerald-600'}`} />
                <div className="flex-1 truncate">
                  <Link href={`/project/${proj.project_slug}`} className="text-sm font-medium hover:underline" target="_blank">
                    {proj.project_name}
                  </Link>
                  {proj.role && (
                    <p className="text-xs text-gray-500 dark:text-zinc-400 truncate">{proj.role}</p>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-red-600 hover:text-red-700 hover:bg-red-100/50 dark:hover:bg-red-900/20 shrink-0"
                onClick={() => handleRemoveProject(proj.id, proj.project_name)}
                disabled={isDeleting === proj.id}
              >
                {isDeleting === proj.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  const activeProjects = projects.filter(p => p.metadata?.project_status !== 'completed' && p.status === 'approved');
  const completedProjects = projects.filter(p => p.metadata?.project_status === 'completed' && p.status === 'approved');
  const pendingProjects = projects.filter(p => p.status === 'pending');
  const rejectedProjects = projects.filter(p => p.status === 'rejected');

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Manage Projects for {companyName}</DialogTitle>
            <DialogDescription>
              Add or remove projects associated with this company profile.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-1 -mr-3 my-4 overflow-y-auto">
              <div className="space-y-4 pr-3">
                  {isLoading ? (
                      <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
                      </div>
                  ) : error ? (
                      <p className="text-sm text-red-600 text-center py-4">{error}</p>
                  ) : (
                      <div className="space-y-4">
                          {/* Updated Add Project Button */}
                          <Button onClick={handleAddProject} className="w-full" variant="outline">
                              <Plus className="h-4 w-4 mr-0.5" />
                              Add Project Association
                          </Button>

                          {renderProjectList(activeProjects, 'active')}
                          {renderProjectList(completedProjects, 'completed')}

                          {/* Optional: Display Pending/Rejected */}
                          {pendingProjects.length > 0 && (
                              <div>
                                  <h4 className="text-sm font-medium text-gray-500 dark:text-zinc-400 mb-2">Pending Associations</h4>
                                  {/* Render pending list similarly, maybe without delete? */}
                              </div>
                          )}
                          {rejectedProjects.length > 0 && (
                               <div>
                                  <h4 className="text-sm font-medium text-red-600 dark:text-red-400 mb-2">Rejected Associations</h4>
                                  {/* Render rejected list */}
                              </div>
                          )}
                      </div>
                  )}
              </div>
          </ScrollArea>


          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Close
              </Button>
            </DialogClose>
            {/* Maybe add a general 'Save' if edits are batched? */}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- Render ProjectDialog Conditionally --- */}
      <ProjectDialog
        open={showAddProjectDialog}
        onOpenChange={setShowAddProjectDialog}
        onSubmit={handleProjectAssociationSubmit}
        isAddingProject={isAddingProject}
        // We don't have the company's primary role here easily, pass empty or default
        companyPrimaryRole={''}
        // No initial project - user must search/select
      />
      {/* --- End ProjectDialog --- */}
    </>
  );
}