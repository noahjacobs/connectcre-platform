"use server";

import { supabaseServer } from '@/lib/supabase/server';
import { revalidateTag } from 'next/cache';
import { getCitySlugFromName } from '@/lib/utils/navigation';

// Types for company queries
export interface FilterValue<T> {
  value: T[];
  operator: "is" | "is not";
}

export interface FetchCompaniesOptions {
  page?: number;
  limit?: number;
  search?: string;
  id?: string;
  filters?: {
    category?: FilterValue<string>;
    activity?: FilterValue<string>;
    location?: FilterValue<string>;
    rating?: FilterValue<number>;
    experience?: FilterValue<string>;
    propertyType?: FilterValue<string>;
  };
  sort?: {
    field: 'rating' | 'activity' | 'experience';
    order: 'asc' | 'desc';
  };
}

export interface Company {
  _id: string;
  name: string;
  company_id: string;
  slug: { current: string };
  logo?: { asset?: { url: string } } | null;
  uploaded_logo_url?: string | null;
  description?: string;
  categories?: string[];
  location?: string | null;
  projectCount: number;
  rating: number | null;
  reviewCount: number;
  is_verified: boolean;
  status?: string;
  contact?: {
    email?: string | null;
    phone?: string | null;
    website?: string | null;
  };
  activeProjects?: Array<{
    name: string;
    slug: string;
    city?: string;
    neighborhood?: string;
    status: string;
    address?: string;
  }>;
  completedProjects?: Array<{
    name: string;
    slug: string;
    city?: string;
    neighborhood?: string;
    status: string;
    completedDate?: string;
    address?: string;
  }>;
  propertyTypes?: string[];
}

export interface CompaniesResponse {
  companies: Company[];
  total: number;
  hasMore: boolean;
}

interface CompanyView {
  id: string;
  name: string;
  description: string | null;
  category: string[] | null;
  logo_url: string | null;
  uploaded_logo_url: string | null;
  total_approved_projects: number;
  total_active_projects: number;
  total_completed_projects: number;
  property_types: string[] | null;
  rating: number | null;
  review_count: number;
  is_verified: boolean;
  city: string | null;
  state: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  website_url: string | null;
  status: string;
  slug: string;
  created_at: string;
  activity_level: string;
  experience_level: string;
}

export interface SanityCompany {
  _id: string;
  name: string;
  description?: string;
  categories?: string[];
  logo?: {
    asset: {
      _id: string;
      url: string;
      metadata?: {
        dimensions: {
          width: number;
          height: number;
        };
        lqip: string;
      }
    }
  };
  company_id?: string;
  slug: { current: string };
  projectCount: number;
  propertyTypes?: string[];
  activeProjects?: Array<{
    name: string;
    city: string;
    neighborhood: string;
    uses?: string;
    slug: string;
    status: 'under_construction' | 'proposed' | 'approved';
  }>;
  completedProjects?: Array<{
    name: string;
    city: string;
    neighborhood: string;
    uses?: string;
    slug: string;
    status: 'completed';
    completedDate?: string;
  }>;
}

// Helper function to check if filter has values
function hasFilterValues<T>(filter: FilterValue<T> | undefined): filter is FilterValue<T> {
  return filter !== undefined && filter.value.length > 0;
}

export async function fetchCompanies(options: FetchCompaniesOptions = {}): Promise<CompaniesResponse> {
  try {
    const { page = 1, limit = 10, search = '', filters = {}, sort = { field: 'rating', order: 'desc' }, id } = options;
    const start = (page - 1) * limit;

    // Build the query
    let query = supabaseServer
      .from('companies_view')
      .select('*', { count: 'exact' })
      .eq('status', 'approved');

    // Apply search if provided
    if (search) {
      // Search name OR the pre-computed text representation of project addresses
      query = query.or(`name.ilike.%${search}%,project_addresses_text.ilike.%${search}%`);
    }

    // Apply role filter
    if (hasFilterValues(filters.category)) {
      const { value: categories, operator } = filters.category;
      if (operator === "is") {
        query = query.overlaps('category', categories);
      } else {
        query = query.not('category', 'overlaps', categories);
      }
    }

    // Apply experience filter
    if (hasFilterValues(filters.experience)) {
      const { value: experiences, operator } = filters.experience;
      if (operator === "is") {
        query = query.in('experience_level', experiences);
      } else {
        query = query.not('experience_level', 'in', experiences);
      }
    }

    // Apply activity filter
    if (hasFilterValues(filters.activity)) {
      const { value: activities, operator } = filters.activity;
      if (operator === "is") {
        query = query.in('activity_level', activities);
      } else {
        query = query.not('activity_level', 'in', activities);
      }
    }

    // Apply location filter
    if (hasFilterValues(filters.location)) {
      const { value: fullLocations, operator } = filters.location;

      const citySlugs = fullLocations.map(loc => {
        const cityName = loc.split(',')[0].trim();
        return getCitySlugFromName(cityName);
      });

      const projectLocationCondition = `project_cities.cs.{${citySlugs.join(',')}}`;

      if (operator === "is") {
        query = query.or(projectLocationCondition);
      } else {
        citySlugs.forEach(citySlug => {
          query = query.not('project_cities', 'cs', `{${citySlug}}`);
        });
      }
    }

    // Apply rating filter
    if (hasFilterValues(filters.rating)) {
      const { value: ratings, operator } = filters.rating;
      const minRating = Math.min(...ratings);
      if (operator === "is") {
        query = query.gte('rating', minRating);
      } else {
        query = query.or(`rating.lt.${minRating},rating.is.null`);
      }
    }

    // Apply sorting
    query = query.order('is_verified', { ascending: false }); // Always prioritize verified companies
    
    // Apply secondary sorting based on user selection
    switch (sort.field) {
      case 'rating':
        query = query.order('rating', { ascending: sort.order === 'asc', nullsFirst: false });
        break;
      case 'experience':
        query = query.order('total_completed_projects', { ascending: sort.order === 'asc', nullsFirst: false });
        break;
      case 'activity':
        query = query.order('total_active_projects', { ascending: sort.order === 'asc', nullsFirst: false });
        break;
    }
    
    // Always add a final sort by created_at to ensure consistent ordering
    query = query.order('created_at', { ascending: false });

    // Apply pagination using limit
    const { data, count, error } = await query.range(start, start + limit - 1);

    if (error) {
      console.error('Error fetching companies:', error);
      throw error;
    }

    // Transform the data to match the expected format
    const companies = (data || []).map((company: CompanyView) => ({
      _id: company.id,
      company_id: company.id,
      name: company.name,
      description: company.description || '',
      categories: company.category || [],
      logo: null,
      uploaded_logo_url: company.uploaded_logo_url || company.logo_url || null,
      projectCount: company.total_approved_projects || 0,
      rating: company.rating || null,
      reviewCount: company.review_count || 0,
      is_verified: company.is_verified || false,
      location: company.city ? `${company.city}, ${company.state || ''}` : null,
      contact: {
        email: company.contact_email || null,
        phone: company.contact_phone || null,
        website: company.website_url || null
      },
      status: company.status || 'approved',
      slug: { current: company.slug },
      activeProjects: [],
      completedProjects: [],
      propertyTypes: company.property_types || [],
    }));

    // For each company, fetch a preview of active projects (only first 3)
    const companiesWithProjects = await Promise.all(
      companies.map(async (company) => {
        try {
          if (company.projectCount > 0) {
            const { data: projectsData } = await supabaseServer
              .from('company_projects')
              .select('project_name, project_slug, project_address, metadata')
              .eq('company_id', company.company_id)
              .eq('status', 'approved')
              .or('metadata->>project_status.eq.under_construction,metadata->>project_status.eq.proposed,metadata->>project_status.eq.approved')
              .order('created_at', { ascending: false })
              .limit(8);

            if (projectsData?.length) {
              return {
                ...company,
                activeProjects: projectsData.map(project => ({
                  name: project.project_name,
                  slug: project.project_slug,
                  city: project.metadata?.city,
                  neighborhood: project.metadata?.neighborhood,
                  status: project.metadata?.project_status,
                  address: project.project_address ?? undefined
                })),
                completedProjects: []
              };
            }
          }
          return company;
        } catch (error) {
          console.error(`Error fetching projects for company ${company.name}:`, error);
          return company;
        }
      })
    );

    return {
      companies: companiesWithProjects,
      total: count || 0,
      hasMore: (count || 0) > start + companies.length
    };
  } catch (error) {
    console.error('Error fetching companies:', error);
    return {
      companies: [],
      total: 0,
      hasMore: false
    };
  }
}

export async function searchCompanies(query: string): Promise<SanityCompany[]> {
  try {
    const { data, error } = await supabaseServer
      .from('companies_view')
      .select('*')
      .eq('status', 'approved')
      .ilike('name', `%${query}%`)
      .order('is_verified', { ascending: false })
      .order('rating', { ascending: false, nullsFirst: false })
      .limit(10);

    if (error) {
      console.error('Error searching companies:', error);
      return [];
    }

    return (data || []).map((company: CompanyView) => ({
      _id: company.id,
      name: company.name,
      description: company.description || undefined,
      categories: company.category || [],
      logo: company.uploaded_logo_url || company.logo_url ? {
        asset: {
          _id: company.id,
          url: company.uploaded_logo_url || company.logo_url || '',
          metadata: undefined
        }
      } : undefined,
      company_id: company.id,
      slug: { current: company.slug },
      projectCount: company.total_approved_projects || 0,
      propertyTypes: company.property_types || [],
    }));
  } catch (error) {
    console.error('Error searching companies:', error);
    return [];
  }
}

export async function fetchCompanyProjects(companyId: string) {
  try {
    const { data: projects, error } = await supabaseServer
      .from('company_projects')
      .select('*')
      .eq('company_id', companyId)
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Split projects into active and completed based on metadata.project_status
    const activeProjects = projects
      ?.filter(project => {
        const status = project.metadata?.project_status;
        return status === 'under_construction' || status === 'proposed' || status === 'approved';
      })
      .map(project => ({
        name: project.project_name,
        city: project.metadata?.city,
        neighborhood: project.metadata?.neighborhood,
        uses: project.metadata?.uses,
        slug: project.project_slug,
        status: project.metadata?.project_status
      })) || [];

    const completedProjects = projects
      ?.filter(project => project.metadata?.project_status === 'completed')
      .map(project => ({
        name: project.project_name,
        city: project.metadata?.city,
        neighborhood: project.metadata?.neighborhood,
        uses: project.metadata?.uses,
        slug: project.project_slug,
        status: project.metadata?.project_status,
        completedDate: project.metadata?.completed_date
      })) || [];

    return {
      activeProjects,
      completedProjects
    };
  } catch (error) {
    console.error('Error fetching company projects:', error);
    return {
      activeProjects: [],
      completedProjects: []
    };
  }
}

export async function invalidateCompanyCache(companyId: string) {
  revalidateTag(`company:${companyId}`);
  revalidateTag('companies');
} 