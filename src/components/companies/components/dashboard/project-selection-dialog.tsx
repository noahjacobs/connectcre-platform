import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { type UserCompany } from '@/hooks/use-user-companies';

// Interface for project selection
export interface ProjectSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companies: UserCompany[];
  onCompanySelect: (companyId: string) => void;
  projectName: string;
}

// Project selection dialog component
export function ProjectSelectionDialog({
  open,
  onOpenChange,
  companies,
  onCompanySelect,
  projectName
}: ProjectSelectionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-500" />
            Select Company
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <p className="text-sm text-gray-500">
            Select which company you want to associate with {projectName}:
          </p>
          <div className="space-y-2">
            {companies.map((company) => (
              <Button
                key={company.id}
                variant="outline"
                className="w-full justify-start"
                onClick={() => onCompanySelect(company.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                    {company.logo_url ? (
                      <img
                        src={company.logo_url}
                        alt={company.name}
                        className="w-8 h-8 rounded-lg object-contain"
                      />
                    ) : (
                      <Building2 className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                  <span>{company.name}</span>
                </div>
              </Button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 