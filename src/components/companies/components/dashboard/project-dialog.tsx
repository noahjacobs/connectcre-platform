import { useState, useEffect } from "react";
import { Search, Award, Building2, ArrowRight, Loader2, Check, ChevronDown, PlusCircle, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { fetchProjectImages } from "@/components/projects";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { COMPANY_ROLES } from "@/lib/constants";
import { useSupabase } from "@/lib/providers/supabase-context";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// Update ProjectSearchResult interface
export interface ProjectSearchResult {
  slug: string;
  title: string;
  status: string;
  city?: string;
  neighborhood?: string;
}

// Update ProjectDialog props interface
export interface ProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (project: ProjectSearchResult, role: string) => Promise<void>;
  isAddingProject: boolean;
  companyPrimaryRole?: string;
  initialProject?: ProjectSearchResult | null;
}

interface ProjectSearchProps {
  onProjectSelect: (project: ProjectSearchResult) => void;
  selectedProject: ProjectSearchResult | null;
  initialProject: ProjectSearchResult | null;
}

// Helper function to format project status
const formatProjectStatus = (status: string | undefined): string => {
  if (!status) return 'Unknown'; // Handle undefined status
  if (status === 'under_construction') {
    return 'Under Construction';
  }
  // Handle other statuses: split by '_', capitalize each word, join with space
  return status
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

function ProjectSearch({ onProjectSelect, selectedProject, initialProject }: ProjectSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ProjectSearchResult[]>([]);
  const [projectImages, setProjectImages] = useState<Map<string, any>>(new Map());
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const { supabase } = useSupabase();

  const handleSearchProjects = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setHasSearched(true);

    try {
      if (!supabase) {
        console.error('Supabase client not available');
        return;
      }

      const { data: results, error: searchError } = await supabase
        .from('projects')
        .select('slug, title, status, city_slug, neighborhood_slug, address')
        .or(`title.ilike.%${query}%,address.ilike.%${query}%`)
        .limit(20);

      if (searchError) throw searchError;
      
      const formattedResults = (results || []).map(p => ({
        slug: p.slug || '',
        title: p.title || 'Untitled Project',
        status: p.status || 'unknown',
        city: p.city_slug ?? undefined,
        neighborhood: p.neighborhood_slug ?? undefined,
      }));

      if (formattedResults?.length) {
        const projectSlugs = formattedResults.map(p => p.slug);
        const images = await fetchProjectImages(projectSlugs);
        setProjectImages(images);
      }
      
      setSearchResults(formattedResults);
    } catch (error) {
      console.error('Error searching projects:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  if (selectedProject) {
    return (
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-lg bg-gray-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 overflow-hidden">
            {projectImages.get(selectedProject.slug) ? (
              <img
                src={projectImages.get(selectedProject.slug).url}
                alt={selectedProject.title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <Building2 className="h-6 w-6 text-gray-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-base mb-1 truncate">{selectedProject.title}</div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {formatProjectStatus(selectedProject.status)}
              </Badge>
              {!initialProject && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs bg-amber-50 dark:bg-amber-900 hover:text-blue-700 dark:hover:text-blue-200"
                  onClick={() => {
                    onProjectSelect(null as any);
                    setHasSearched(false);
                    setSearchQuery('');
                  }}
                >
                  Change Project
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search by project name or address and press Enter..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSearchProjects(searchQuery);
              }
            }}
            className="pl-10"
          />
        </div>
      </div>

      {isSearching ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : searchQuery.trim() ? (
        hasSearched ? (
          searchResults.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-[350px] overflow-y-auto">
                {searchResults.map((project, index) => (
                  <div
                    key={`${project.slug}-${index}`}
                    className="p-4 flex items-center justify-between border-b last:border-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
                    onClick={() => onProjectSelect(project)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-lg bg-gray-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 overflow-hidden">
                        {projectImages.get(project.slug) ? (
                          <img
                            src={projectImages.get(project.slug).url}
                            alt={project.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <Building2 className="h-6 w-6 text-gray-400" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-sm mb-1">{project.title}</div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {formatProjectStatus(project.status)}
                          </Badge>
                          {project.city && (
                            <span className="text-xs text-gray-500">
                              {project.city}{project.neighborhood ? `, ${project.neighborhood}` : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No projects found. Try different search terms.
            </div>
          )
        ) : (
          <div className="text-center py-8 text-gray-500">
            Press Enter to search
          </div>
        )
      ) : (
        <div className="text-center py-8 text-gray-500">
          <Building2 className="h-8 w-8 mx-auto mb-3 text-gray-400" />
          <p>Search for a project to associate with your company</p>
        </div>
      )}
    </>
  );
}

export const ProjectDialog = ({
  open,
  onOpenChange,
  onSubmit,
  isAddingProject,
  companyPrimaryRole = '',
  initialProject = null
}: ProjectDialogProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ProjectSearchResult[]>([]);
  const [projectImages, setProjectImages] = useState<Map<string, any>>(new Map());
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectSearchResult | null>(open ? initialProject : null);
  const [projectRole, setProjectRole] = useState(companyPrimaryRole);

  // Effect to initialize/reset projectRole based on companyPrimaryRole or dialog open
  useEffect(() => {
    if (open) {
      // Set role based on companyPrimaryRole only if projectRole is not already set
      // This prevents overwriting a user's selection if companyPrimaryRole changes while dialog is open
      if (!projectRole) {
        setProjectRole(companyPrimaryRole || '');
      }
    } else {
      // Reset role when dialog closes
      setProjectRole('');
    }
    // This effect depends on the dialog's open state and the company's primary role.
  }, [open, companyPrimaryRole]);

  // Effect to manage selectedProject, images, and search state based on open state and initialProject
  useEffect(() => {
    if (open) {
      // Set selectedProject based on initialProject when dialog opens or initialProject changes
      setSelectedProject(initialProject);

      // Fetch image for initial project if needed and not already fetched
      if (initialProject && !projectImages.has(initialProject.slug)) {
        fetchProjectImages([initialProject.slug]).then(images => {
          setProjectImages(prev => new Map([...prev, ...images]));
        });
      }

      // Reset search state only if the dialog opens *with* an initial project
      // Avoids clearing search results if the user was in the middle of searching
      if (initialProject) {
        setSearchQuery('');
        setSearchResults([]);
        setHasSearched(false);
      }
    } else {
      // Reset project and search state when dialog closes
      setSelectedProject(null);
      setSearchQuery('');
      setSearchResults([]);
      setHasSearched(false);
      // Optionally clear project images cache on close if desired
      // setProjectImages(new Map());
    }
    // This effect depends on the dialog's open state and the initial project passed in.
  }, [open, initialProject]);

  const handleProjectSelect = (project: ProjectSearchResult) => {
    setSelectedProject(project);
    setSearchResults([]);
    setHasSearched(false);
    if (!projectImages.has(project.slug)) {
      fetchProjectImages([project.slug]).then(images => {
        setProjectImages(prev => new Map([...prev, ...images]));
      });
    }
  };

  const handleSubmit = async () => {
    if (!selectedProject) return;
    await onSubmit(selectedProject, projectRole);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PlusCircle className="h-5 w-5 text-blue-500" />
            Add Project Association
          </DialogTitle>
          <DialogDescription>
            Connect your company to projects you've worked on. This helps build your portfolio and increases visibility.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Step 1: Project Selection */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600">
                <span className="text-xs font-medium">1</span>
              </div>
              <h4 className="text-sm font-medium">Select Project</h4>
            </div>
            <ProjectSearch
              onProjectSelect={handleProjectSelect}
              selectedProject={selectedProject}
              initialProject={initialProject}
            />
          </div>

          {/* Step 2: Role Selection */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600">
                <span className="text-xs font-medium">2</span>
              </div>
              <h4 className="text-sm font-medium">Specify Your Role</h4>
            </div>
            <Select
              value={projectRole}
              onValueChange={setProjectRole}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select your company's role" />
              </SelectTrigger>
              <SelectContent>
                {COMPANY_ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {companyPrimaryRole && !projectRole && (
              <p className="text-xs text-muted-foreground mt-2">
                Tip: Your company's primary role is {companyPrimaryRole}
              </p>
            )}
          </div>

          {/* Review Info */}
          {selectedProject && projectRole && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 space-y-3">
              <h4 className="text-sm font-medium">Review Association Details</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Project:</span>
                  <span className="font-medium">{selectedProject.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Your Role:</span>
                  <span className="font-medium">{projectRole}</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Note: This association will be reviewed for accuracy before being displayed publicly.
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedProject || !projectRole || isAddingProject}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isAddingProject ? (
              <>
                <Loader2 className="h-4 w-4 mr-0.5 animate-spin" />
                Submitting Request...
              </>
            ) : (
              'Submit Association Request'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 