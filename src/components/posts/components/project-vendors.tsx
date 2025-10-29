"use client";

import { useState, useEffect, useMemo } from "react";
import { Users, Briefcase, PlusCircle, ArrowUpRight, Building2, BadgeCheck, Clock, X, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CompanyDialog } from "@/components/companies"
import { useSupabase } from "@/lib/providers/supabase-context"
import { useAuth } from "@/lib/providers/auth-context"
import { toast } from "sonner"
import { AuthModal } from "@/components/ui/auth-modal"
import { useRouter } from "next/navigation"
import { UserCompany } from "@/hooks/use-user-companies";
import { Project } from "@/components/projects/types";
import { getPrimaryCategory, formatCategoriesForDisplay } from "@/components/companies/utils";

interface ProjectVendorsProps {
  project: Project;
  projectCompanies: CompanyProjectResponse[];
  userCompanies: UserCompany[];
}

interface ProjectCompany {
  id: string;
  name: string;
  logo_url?: string;
  uploaded_logo_url?: string;
  role: string;
  status: 'pending' | 'approved' | 'rejected';
  is_verified?: boolean;
  category?: string[];
}

// Add database response type
export interface CompanyProjectResponse {
  id: string;
  companies: {
    id: string;
    name: string;
    logo_url: string | null;
    uploaded_logo_url: string | null;
    is_verified: boolean;
    category?: string[] | null;
  };
  role: string;
  status: 'pending' | 'approved' | 'rejected';
}

// In components/post/project-vendors.tsx
export interface DisplayProjectCompany { // Add 'export' here
  id: string;
  name: string;
  logo_url?: string | null;
  uploaded_logo_url?: string | null;
  role: string;
  status: 'pending' | 'approved' | 'rejected';
  is_verified?: boolean;
}

// Add Company type from CompanyDialog props
interface Company {
  _id: string;
  company_id: string;
  name: string;
  logo?: { asset: { url: string } };
  uploaded_logo_url?: string;
  is_verified: boolean;
  categories?: string[];
  slug: { current: string };
  projectCount: number;
  rating: number | null;
  reviewCount: number;
}

export default function ProjectVendors({ project, projectCompanies, userCompanies }: ProjectVendorsProps) {
  const [selectedCompany, setSelectedCompany] = useState<ProjectCompany | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { user } = useAuth();
  const router = useRouter();
  const { supabase } = useSupabase();

  const handleJoinTeam = async (role: string) => {
    if (!user || !supabase) {
      setShowAuthModal(true);
      return;
    }

    try {
      // Redirect to company profile tab with project slug (use project.slug)
      if (project.slug) {
        router.push(`/company?project=${project.slug}`);
      } else {
        toast.error("Project slug is missing, cannot join team.");
      }
    } catch (error) {
      // console.error('Error checking user companies:', error);
      toast.error('Failed to check company status');
    }
  };

  // Memoize the company data processing to prevent unnecessary re-renders
  const processedCompanies = useMemo(() => {
    return projectCompanies.map((companyProject) => {
      const company = companyProject.companies;
      const category = company.category || [];
      const primaryCategory = getPrimaryCategory(category);
      
      // Use primary category if available, otherwise fall back to role
      const displayRole = category.length > 0 ? primaryCategory : (companyProject.role || 'Other');
      
      return {
        companyProject,
        company,
        category,
        displayRole,
        hasMoreCategories: category.length > 1
      };
    });
  }, [projectCompanies]);

  return (
    <div>
      {/* Project Team */}
      <div className="mb-6 lg:w-[calc(100vw-500px)] xl:w-full">
        <div className="relative">
          <div className="flex overflow-x-auto pt-2 pb-4 gap-1 scrollbar-hide -mx-4 px-4">
            {processedCompanies.map(({ companyProject, company, category, displayRole, hasMoreCategories }) => {
              return (
                <button
                  key={company.id}
                  onClick={() => setSelectedCompany({
                    id: company.id,
                    name: company.name,
                    logo_url: company.logo_url || undefined,
                    uploaded_logo_url: company.uploaded_logo_url || undefined,
                    role: companyProject.role,
                    status: companyProject.status,
                    is_verified: company.is_verified,
                    category: category
                  })}
                  className="flex flex-col items-center min-w-[140px] max-w-[140px] py-3 px-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                >
                  <div className="relative w-16 h-16 bg-white dark:bg-zinc-900 rounded-xl flex items-center justify-center shrink-0 border border-gray-100 dark:border-zinc-700">
                    {(company.uploaded_logo_url || company.logo_url) ? (
                      <img
                        src={company.uploaded_logo_url || company.logo_url || ''}
                        alt={company.name}
                        className="w-full h-full object-contain rounded-xl"
                      />
                    ) : (
                      <Briefcase className="h-7 w-7 text-gray-400" />
                    )}
                    {company.is_verified && (
                      <div className="absolute -bottom-1 -right-1 bg-white dark:bg-black rounded-lg p-1 shadow-sm border border-gray-200 dark:border-zinc-800">
                        <BadgeCheck className="h-3 w-3 text-blue-500" />
                      </div>
                    )}
                  </div>
                  <p className="text-sm font-medium text-center line-clamp-2 mt-2">{company.name}</p>
                  <p className="text-xs text-zinc-500 text-center line-clamp-1">
                    {displayRole}
                  </p>
                  {hasMoreCategories && (
                    <p className="text-xs text-zinc-400 text-center line-clamp-1">
                      +{category.length - 1} more
                    </p>
                  )}
                  {companyProject.status === 'pending' && (
                    <Badge variant="secondary" className="mt-1 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400">
                      <Clock className="h-3 w-3 mr-1" />
                      Pending
                    </Badge>
                  )}
                </button>
              );
            })}
            
            <button
              onClick={() => handleJoinTeam('')}
              className="mr-0 lg:mr-8 xl:mr-0 flex flex-col items-center justify-center min-w-[140px] p-3 rounded-lg border-2 border-dashed border-zinc-200 dark:border-zinc-800 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
            >
              <div className="w-16 h-16 rounded-xl bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center mb-2">
                <PlusCircle className="w-6 h-6 text-zinc-400" />
              </div>
              <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Join Team</p>
            </button>
          </div>
        </div>
      </div>

      {/* Company Dialog */}
      {selectedCompany && (
        <CompanyDialog
          company={{
            _id: selectedCompany.id,
            company_id: selectedCompany.id,
            name: selectedCompany.name,
            logo: selectedCompany.logo_url ? {
              asset: { url: selectedCompany.logo_url }
            } : undefined,
            uploaded_logo_url: selectedCompany.uploaded_logo_url,
            categories: selectedCompany.category || [],
            is_verified: selectedCompany.is_verified || false,
            slug: { current: selectedCompany.id },
            projectCount: 0,
            rating: null,
            reviewCount: 0
          } satisfies Company}
          onClose={() => setSelectedCompany(null)}
          userCompanies={userCompanies}
        />
      )}

      {/* Auth Modal */}
      <AuthModal
        open={showAuthModal}
        onOpenChange={setShowAuthModal}
        trigger={<div />}
        returnTo={project.slug ? `/project/${project.slug}` : '/'}
      />
    </div>
  );
} 