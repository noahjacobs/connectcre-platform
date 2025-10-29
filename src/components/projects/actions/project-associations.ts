"use server";

import { supabaseServer } from '@/lib/supabase/server';
import { revalidateTag } from 'next/cache';
import { fetchProjectBySlug } from './project-queries';
import { currentUser } from '@clerk/nextjs/server';

// TODO: Move this to a shared utility file
async function getUserAndType() {
  try {
    const user = await currentUser();
    if (!user) {
      return { userId: null, userType: null, error: 'Not authenticated' };
    }

    const supabase = await supabaseServer();
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('clerk_id', user.id)
      .single();

    if (!profile) {
      return { userId: null, userType: null, error: 'Profile not found' };
    }

    return { userId: profile.id, userType: 'user', error: null };
  } catch (error) {
    return { userId: null, userType: null, error: 'Failed to get user' };
  }
}

// Types for company-project associations
export interface CompanyProjectResponse {
  id: string;
  companies: {
    id: string;
    name: string;
    logo_url: string | null;
    uploaded_logo_url: string | null;
    is_verified: boolean;
    category: string[] | null;
  };
  role: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface BasicCompanyInfo {
    id: string;
    name: string;
    logo_url: string | null;
    uploaded_logo_url: string | null;
    is_verified: boolean;
    slug: string;
}

// Fetches approved companies associated with a specific project slug
export async function fetchProjectCompaniesServerSide(projectSlug: string): Promise<CompanyProjectResponse[]> {
  if (!projectSlug) return [];

  try {
    const { data: companies, error: companiesError } = await supabaseServer
      .from('company_projects')
      .select(`
        id,
        companies (
          id,
          name,
          logo_url,
          uploaded_logo_url,
          is_verified,
          category
        ),
        role,
        status
      `)
      .eq('project_slug', projectSlug)
      .eq('status', 'approved')
      .returns<CompanyProjectResponse[]>(); // Ensure correct return type

    if (companiesError) throw companiesError;
    return companies || [];
  } catch (error) {
    console.error(`[fetchProjectCompaniesServerSide] Error loading companies for project ${projectSlug}:`, error);
    return []; // Return empty on error
  }
}

// Fetch All Company Project Associations (for editing)
export async function fetchCompanyProjectAssociations(companyId: string) {
  if (!companyId) return [];

  try {
    // TODO: Use the server client that respects RLS for reading associations
    // const supabase = await createSupabaseServerClient();

    const { data, error } = await supabaseServer
      .from('company_projects')
      .select(`
        id,
        project_slug,
        project_name,
        role,
        status,
        metadata
      `)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) {
      // Check if error is due to RLS (e.g., user doesn't manage the company)
      if (error.code === '42501') { // permission denied
        console.warn(`[fetchCompanyProjectAssociations] RLS denied access for company ${companyId}. User might not be a manager.`);
        throw new Error('Permission denied.');
      }
      console.error(`[fetchCompanyProjectAssociations] Error fetching associations for company ${companyId}:`, error);
      throw error;
    }

    return data || [];

  } catch (error) {
    console.error(`[fetchCompanyProjectAssociations] Caught error for company ${companyId}:`, error);
    return [];
  }
}

// Remove a Company Project Association
export async function removeCompanyProject(associationId: string): Promise<void> {
   if (!associationId) {
    throw new Error("Association ID is required.");
  }

  try {
    // TODO: Use the server client that respects RLS for the delete operation
    // const supabase = await createSupabaseServerClient();

    // RLS policy "Company managers can delete pending projects" should handle permissions.
    const { error } = await supabaseServer
      .from('company_projects')
      .delete()
      .eq('id', associationId);

    if (error) {
      if (error.code === '42501') { // permission denied
        console.warn(`[removeCompanyProject] RLS denied deletion for association ${associationId}. User might not be a manager.`);
        throw new Error('Permission denied.');
      }
      console.error(`[removeCompanyProject] Error deleting association ${associationId}:`, error);
      throw error;
    }

    // Successfully deleted, invalidate relevant caches if necessary
    // e.g., invalidateCompanyCache(companyId) - but we don't have companyId here easily

  } catch (error) {
    console.error(`[removeCompanyProject] Caught error for association ${associationId}:`, error);
    throw error; // Re-throw the error to be handled by the calling component
  }
}

// Action to search for companies (basic info for adding)
export async function searchCompaniesBasic(query: string): Promise<BasicCompanyInfo[]> {
    if (!query || query.trim().length < 2) {
        return []; // Don't search on empty or very short queries
    }
    try {
        const { data, error } = await supabaseServer
            .from('companies')
            .select('id, name, logo_url, uploaded_logo_url, is_verified, slug')
            .ilike('name', `%${query}%`) // Use ilike for case-insensitive search on name only
            .eq('status', 'approved')
            .limit(10);

        if (error) {
            console.error('[searchCompaniesBasic] Error:', error);
            return [];
        }
        return (data || []) as BasicCompanyInfo[];
    } catch (e) {
        console.error('[searchCompaniesBasic] Exception:', e);
        return [];
    }
}

// Action to add an existing company to a project
export async function addCompanyToProject(
    companyId: string,
    projectSlug: string,
    projectName: string,
    role: string
): Promise<{ success: boolean; association?: CompanyProjectResponse; error?: string }> {
    const { userId, userType, error: authError } = await getUserAndType();
    if (authError || !userId || (userType !== 'editor' && userType !== 'admin')) {
        return { success: false, error: authError || 'Permission denied.' };
    }

    if (!companyId || !projectSlug || !projectName || !role) {
        return { success: false, error: 'Missing required fields.' };
    }

    try {
        // Check if association already exists
        const { data: existing, error: checkError } = await supabaseServer
            .from('company_projects')
            .select('id')
            .eq('company_id', companyId)
            .eq('project_slug', projectSlug)
            .maybeSingle();

        if (checkError) throw checkError;
        if (existing) return { success: false, error: 'Company already associated with this project.' };

        // Fetch project metadata (like status) - Reuse existing project fetch logic if possible
        const project = await fetchProjectBySlug(projectSlug); // Use the existing function

        // Insert new association
        const { data: newAssociation, error: insertError } = await supabaseServer
            .from('company_projects')
            .insert({
                company_id: companyId,
                project_slug: projectSlug,
                project_name: projectName,
                role: role,
                status: 'approved', // Auto-approve for editors
                submitted_by: userId,
                metadata: { // Add project metadata if fetched
                    project_status: project?.status,
                    city: project?.city_slug,
                    neighborhood: project?.neighborhood_slug,
                    uses: project?.uses,
                }
            })
            .select(`
                id,
                companies (id, name, logo_url, uploaded_logo_url, is_verified),
                role,
                status
            `) // Fetch the data needed for UI update
            .single();

        if (insertError) throw insertError;

        // Revalidate relevant paths or tags
        revalidateTag(`projectCompanies:${projectSlug}`);

        return { success: true, association: newAssociation as unknown as CompanyProjectResponse };

    } catch (e: any) {
        console.error('[addCompanyToProject] Exception:', e);
        return { success: false, error: e.message || 'Failed to add company to project.' };
    }
}

// Action to remove a company from a project (using the association ID)
export async function removeCompanyFromProject(
    associationId: string
): Promise<{ success: boolean; error?: string }> {
    const { userId, userType, error: authError } = await getUserAndType();
    if (authError || !userId || (userType !== 'editor' && userType !== 'admin')) {
        return { success: false, error: authError || 'Permission denied.' };
    }

    if (!associationId) {
        return { success: false, error: 'Missing association ID.' };
    }

    try {
        // Fetch the association first to get projectSlug for revalidation
        const { data: association, error: fetchError } = await supabaseServer
            .from('company_projects')
            .select('project_slug, company_id')
            .eq('id', associationId)
            .single();

        if (fetchError || !association) {
            console.error('[removeCompanyFromProject] Could not find association to delete:', fetchError);
            return { success: false, error: 'Association not found.' };
        }

        // Delete the association (RLS policy 'Editors and Admins can delete project associations' handles auth)
        const { error: deleteError } = await supabaseServer
            .from('company_projects')
            .delete()
            .eq('id', associationId);

        if (deleteError) throw deleteError;

        // Revalidate relevant paths or tags
        revalidateTag(`projectCompanies:${association.project_slug}`);

        return { success: true };

    } catch (e: any) {
        console.error('[removeCompanyFromProject] Exception:', e);
        return { success: false, error: e.message || 'Failed to remove company from project.' };
    }
}

// Action to create a new company and associate it with a project
export async function createCompanyAndAddToProject(
    companyName: string,
    projectSlug: string,
    projectName: string,
    role: string
): Promise<{ success: boolean; association?: CompanyProjectResponse; error?: string }> {
    const { userId, userType, error: authError } = await getUserAndType();
    if (authError || !userId || (userType !== 'editor' && userType !== 'admin')) {
        return { success: false, error: authError || 'Permission denied.' };
    }

    if (!companyName || !projectSlug || !projectName || !role) {
        return { success: false, error: 'Missing required fields.' };
    }

    // Basic slug generation (replace with a more robust library if needed)
    const companySlug = companyName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    try {
        // 1. Create the new company
        const { data: newCompany, error: companyInsertError } = await supabaseServer
            .from('companies')
            .insert({
                name: companyName,
                slug: companySlug,
                status: 'approved', // Auto-approve company created by editor
            })
            .select('id, name, logo_url, uploaded_logo_url, is_verified') // Select needed fields
            .single();

        if (companyInsertError || !newCompany) {
            if (companyInsertError?.code === '23505') { // Unique constraint violation (slug likely)
                return { success: false, error: 'Company with this name or slug likely already exists.' };
            }
            console.error('[createCompanyAndAddToProject] Error creating company:', companyInsertError);
            return { success: false, error: 'Failed to create company.' };
        }

        // 2. Add the new company to the project
        const addResult = await addCompanyToProject(newCompany.id, projectSlug, projectName, role);

        if (!addResult.success) {
            // Optional: Attempt to roll back company creation if association fails? Complex.
            console.error('[createCompanyAndAddToProject] Company created, but failed to add to project:', addResult.error);
            return { success: false, error: `Company created, but failed to associate: ${addResult.error}` };
        }

        return { success: true, association: addResult.association };

    } catch (e: any) {
        console.error('[createCompanyAndAddToProject] Exception:', e);
        return { success: false, error: e.message || 'Failed to create and add company.' };
    }
}

// Revalidation Tag Function
export async function revalidateProjectCompanies(projectSlug: string) {
    revalidateTag(`projectCompanies:${projectSlug}`);
} 