import { useState, useEffect } from "react";
import { Building2, Trash2, Loader2, Pencil, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { ProjectAssociation, ProjectStatus } from "./project-section";
import { COMPANY_ROLES } from "@/lib/constants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

// Interface for delete confirmation dialog
interface DeleteConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
  isDeleting: boolean;
  projectName: string;
}

// DeleteConfirmationDialog component
function DeleteConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  isDeleting,
  projectName
}: DeleteConfirmationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Remove Project Association</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to remove your association with {projectName}? This action cannot be undone.
          </p>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={async () => {
              await onConfirm();
            }}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-0.5 animate-spin" />
                Removing...
              </>
            ) : (
              'Remove Association'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Interface for edit dialog
export interface EditProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: ProjectAssociation | null;
  onSubmit: (role: string, status: ProjectStatus) => Promise<void>;
  onDelete: () => Promise<void>;
  isSubmitting: boolean;
  isDeleting: boolean;
  companyPrimaryRole?: string;
  projectImages?: Map<string, any>;
}

// EditProjectDialog component
export function EditProjectDialog({
  open,
  onOpenChange,
  project,
  onSubmit,
  onDelete,
  isSubmitting,
  isDeleting,
  companyPrimaryRole = '',
  projectImages = new Map()
}: EditProjectDialogProps) {
  // Initialize state with the correct values immediately to prevent flicker
  const [role, setRole] = useState(() => {
    if (project?.role) return project.role;
    if (companyPrimaryRole) return companyPrimaryRole;
    return '';
  });
  
  const [projectStatus, setProjectStatus] = useState<ProjectStatus>(() => {
    return (project?.metadata?.project_status as ProjectStatus) || 'proposed';
  });
  
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

  // Only update state when project changes, not when dialog opens
  useEffect(() => {
    if (project) {
      setRole(project.role || companyPrimaryRole);
      setProjectStatus((project.metadata?.project_status as ProjectStatus) || 'proposed');
    }
  }, [project, companyPrimaryRole]);

  // Handle dialog close cleanup
  useEffect(() => {
    if (!open) {
      setShowDeleteConfirmation(false);
    }
  }, [open]);

  const statusConfig: Record<ProjectStatus, { 
    icon: React.ElementType;
    label: string;
    description: string;
  }> = {
    proposed: {
      icon: () => null,
      label: "Proposed",
      description: "Project has been proposed but not yet approved"
    },
    approved: {
      icon: () => null,
      label: "Approved",
      description: "Project has received necessary approvals"
    },
    under_construction: {
      icon: () => null,
      label: "Under Construction",
      description: "Construction is currently in progress"
    },
    completed: {
      icon: () => null,
      label: "Completed",
      description: "Project has been completed"
    },
    cancelled: {
      icon: () => null,
      label: "Cancelled",
      description: "Project has been cancelled"
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-blue-500" />
              {project?.status === 'rejected' ? 'Resubmit Project Association' : 'Edit Project Association'}
            </DialogTitle>
            <DialogDescription>
              {project?.status === 'rejected' 
                ? 'Update and resubmit your association with this project. Make sure to address any feedback provided.'
                : 'Update your company\'s role or the project\'s current status.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Project Info */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-lg bg-gray-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 overflow-hidden">
                  {project && projectImages.get(project.project_slug) ? (
                    <img
                      src={projectImages.get(project.project_slug).url}
                      alt={project.project_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Building2 className="h-6 w-6 text-gray-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-base mb-1 truncate">{project?.project_name}</div>
                  {project?.metadata?.city && (
                    <div className="text-sm text-gray-500">
                      {project.metadata.city}
                      {project.metadata.neighborhood && `, ${project.metadata.neighborhood}`}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Role Selection */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <h4 className="text-sm font-medium">Company's Role</h4>
                {project?.status === 'rejected' && (
                  <Badge variant="destructive" className="text-xs">Requires Update</Badge>
                )}
              </div>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your company's role" />
                </SelectTrigger>
                <SelectContent>
                  {COMPANY_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {companyPrimaryRole && !role && (
                <p className="text-xs text-muted-foreground mt-2">
                  Tip: Your company's primary role is {companyPrimaryRole}
                </p>
              )}
            </div>

            {/* Project Status */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <h4 className="text-sm font-medium">Project Status</h4>
                {project?.status === 'approved' && (
                  <Badge variant="outline" className="text-xs">Updates Require Review</Badge>
                )}
              </div>
              <Select value={projectStatus} onValueChange={(value: ProjectStatus) => setProjectStatus(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select current project status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="proposed">Proposed</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="under_construction">Under Construction</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-2">
                Select the current status of this project. This helps keep information up-to-date.
              </p>
            </div>

            {/* Review Changes */}
            {(role !== project?.role || projectStatus !== project?.metadata?.project_status) && (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 space-y-3">
                <h4 className="text-sm font-medium">Review Changes</h4>
                <div className="space-y-2 text-sm">
                  {role !== project?.role && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Role:</span>
                      <div className="flex items-center gap-2">
                        <span className="line-through text-gray-400">{project?.role || 'None'}</span>
                        <ArrowRight className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">{role}</span>
                      </div>
                    </div>
                  )}
                  {projectStatus !== project?.metadata?.project_status && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Status:</span>
                      <div className="flex items-center gap-2">
                        <span className="line-through text-gray-400">{statusConfig[project?.metadata?.project_status as ProjectStatus]?.label || project?.metadata?.project_status || 'None'}</span>
                        <ArrowRight className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">{statusConfig[projectStatus]?.label || projectStatus}</span>
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-2">
                    {project?.status === 'approved' 
                      ? 'Status changes will be reviewed before being displayed publicly.'
                      : 'Changes will be submitted for review.'}
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex-col-reverse sm:flex-row gap-2 mt-4">
            <div className="flex gap-2 w-full sm:w-auto">
              <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                className="flex-1 sm:flex-initial"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => setShowDeleteConfirmation(true)}
                disabled={isDeleting}
                className="flex-1 sm:flex-initial"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-0.5 animate-spin" />
                    Removing...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-0.5" />
                    Remove Association
                  </>
                )}
              </Button>
            </div>
            <Button
              onClick={() => onSubmit(role || '', projectStatus)}
              disabled={!role || !projectStatus || isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-0.5 animate-spin" />
                  {project?.status === 'rejected' ? 'Resubmitting...' : 'Saving Changes...'}
                </>
              ) : (
                project?.status === 'rejected' ? 'Resubmit Association' : 'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmationDialog
        open={showDeleteConfirmation}
        onOpenChange={setShowDeleteConfirmation}
        onConfirm={onDelete}
        isDeleting={isDeleting}
        projectName={project?.project_name || ''}
      />
    </>
  );
} 