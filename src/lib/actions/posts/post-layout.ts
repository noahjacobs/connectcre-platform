"use server";

import { supabaseServer } from '@/lib/supabase/server';
import { cache } from '@/lib/utils/cache';
import { Filter } from "@/shared/ui/filters";
import { Project } from '@/lib/types';
import crypto from 'crypto';
import type { Post, Comment } from '../types';
import type { ProjectUpdate } from '@/features/projects/types';
import { getCityNameFromSlug } from '@/lib/utils/navigation';
import { fetchComments, fetchPrimarySupabasePostByProjectId, fetchArticlesByAddress } from './post-queries';

// Map Supabase article to Post interface for compatibility
function mapSupabaseArticleToPost(article: any): Post {
  return {
    id: article.id,
    created_at: article.created_at,
    updated_at: article.updated_at,
    title: article.title_ai,
    slug: article.slug,
    subtitle: article.subtitle_ai,
    published_at: article.published_at,
    city_name: article.city_name,
    neighborhood_name: article.neighborhood_name,
    address: article.address,
    normalized_address: article.normalized_address,
    supabase_project_id: article.supabase_project_id,
    tags: article.tags,
    images: article.images || [],
    bannerImage: article.images?.find((img: any) => img.type === 'banner') || null,
    body_ai: article.body_ai,
  };
}

// Helper function to apply Supabase filters (simplified version for posts)
function applySupabaseFilters(query: any, filters: Filter[]): any {
  if (!filters || filters.length === 0) {
    return query;
  }

  let modifiedQuery = query;

  const projectStatusToDbValue = (status: string): string | null => {
    switch (status) {
      case "Proposed": return 'proposed';
      case "Approved": return 'approved';
      case "Under Construction": return 'under_construction';
      case "Completed": return 'completed';
      default:
        console.warn(`[applySupabaseFilters] Unknown ProjectStatus value: ${status}`);
        return null;
    }
  };

  filters.forEach(filter => {
    const rawValues = Array.isArray(filter.value) ? filter.value : [filter.value].filter(v => v !== null && v !== undefined);
    if (rawValues.length === 0) {
      return;
    }

    let columnName: string | null = null;
    let dbValues: (string | number | boolean)[] = [];

    switch (filter.type) {
      case "Project Status":
        columnName = 'status';
        dbValues = rawValues.map(projectStatusToDbValue).filter((v): v is string => v !== null);
        break;
      case "Property Type":
        columnName = 'uses';
        switch (filter.operator) {
          case "is":
          case "is any of":
            const orConditions = rawValues.map((val: any) => `${columnName}.ilike.%${val}%`).join(',');
            modifiedQuery = modifiedQuery.or(orConditions);
            break;
          case "is not":
            rawValues.forEach((val: any) => {
              modifiedQuery = modifiedQuery.not(columnName, 'ilike', `%${val}%`);
            });
            break;
          default:
            console.warn(`[applySupabaseFilters] Unsupported operator '${filter.operator}' for Property Type filter.`);
        }
        return;
      default:
        console.warn(`[applySupabaseFilters] Unsupported filter type received: ${filter.type}`);
        return;
    }

    if (!columnName || dbValues.length === 0) {
      return;
    }

    switch (filter.operator) {
      case "is":
        if (dbValues.length === 1) {
          modifiedQuery = modifiedQuery.eq(columnName, dbValues[0]);
        } else {
          modifiedQuery = modifiedQuery.in(columnName, dbValues);
        }
        break;
      case "is not":
        if (dbValues.length === 1) {
          modifiedQuery = modifiedQuery.neq(columnName, dbValues[0]);
        } else {
          const valuesString = dbValues.map(v => typeof v === 'string' ? `"${v}"` : v).join(',');
          modifiedQuery = modifiedQuery.not(columnName, 'in', `(${valuesString})`);
        }
        break;
      case "is any of":
      case "is one of":
        modifiedQuery = modifiedQuery.in(columnName, dbValues);
        break;
      default:
        console.warn(`[applySupabaseFilters] Unsupported filter operator received: ${filter.operator} for type: ${filter.type}`);
        break;
    }
  });

  return modifiedQuery;
}

export async function fetchRecentDevelopments({
  citySlug,
  offset = 0,
  limit = 12,
  daysAgo = 90,
  mapFilters
}: {
  citySlug?: string;
  offset?: number;
  limit?: number;
  daysAgo?: number;
  mapFilters?: Filter[];
} = {}): Promise<{ posts: Post[]; total: number }> {
  const validOffset = Math.max(0, Math.floor(offset));
  const validLimit = Math.max(1, Math.floor(limit));

  // Cache Key Includes Filters
  const activeFilters = mapFilters?.filter(f => f.value && f.value.length > 0) || [];
  const filtersKeyPart = activeFilters.length > 0
    ? crypto.createHash('sha256').update(JSON.stringify(
        activeFilters.sort((a, b) => a.type.localeCompare(b.type))
                   .map(f => ({ t: f.type, o: f.operator, v: [...f.value].sort() }))
      )).digest('hex')
    : 'none';
  const cacheKey = `recentDevelopmentsV5:${citySlug || 'all'}:${validOffset}:${validLimit}:${daysAgo}:${filtersKeyPart}`;

  return cache<{ posts: Post[]; total: number }>(
    cacheKey,
    async () => {
      try {
        const cutoffDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();

        // 1. Get project IDs that match our criteria
        let projectQuery = supabaseServer
          .from('projects')
          .select('id')
          .in('status', ['completed', 'approved', 'under_construction'])
          .gte('updated_at', cutoffDate)
          .eq('has_articles', true)
          .order('updated_at', { ascending: false })
          .limit(100);

        if (citySlug) {
          projectQuery = projectQuery.eq('city_slug', citySlug);
        }

        // Apply Map Filters to project query
        projectQuery = applySupabaseFilters(projectQuery, activeFilters);

        const { data: projects, error: projectError } = await projectQuery;

        if (projectError) {
          console.error("[fetchRecentDevelopments] Error fetching projects:", projectError);
          return { posts: [], total: 0 };
        }

        if (!projects || projects.length === 0) {
          return { posts: [], total: 0 };
        }

        // Step 2: Get project IDs and fetch articles efficiently
        const projectIds = projects.map(p => p.id).filter(id => id);

        if (projectIds.length === 0) {
          return { posts: [], total: 0 };
        }

        // Step 3: Fetch articles with proper pagination
        const { data: articlesData, error: articlesError, count: totalCount } = await supabaseServer
          .from('articles')
          .select('*', { count: 'exact' })
          .in('supabase_project_id', projectIds)
          .not('published_at', 'is', null)
          .not('city_name', 'is', null)
          .order('published_at', { ascending: false })
          .range(validOffset, validOffset + validLimit - 1);

        if (articlesError) {
          console.error("[fetchRecentDevelopments] Error fetching articles:", articlesError);
          return { posts: [], total: 0 };
        }

        // Convert Supabase articles to Post format
        const posts = (articlesData || []).map(article => mapSupabaseArticleToPost(article));

        return {
          posts,
          total: totalCount || 0,
        };

      } catch (error) {
        console.error("🔍 [fetchRecentDevelopments] Unexpected error:", error);
        return { posts: [], total: 0 };
      }
    },
    {
      ttl: 2 * 60 * 60, // 2 hour cache
      edge: true,
      local: true
    }
  );
}

export async function fetchConstructionUpdates({
  citySlug,
  offset = 0,
  limit = 12,
  mapFilters
}: {
  citySlug?: string;
  offset?: number;
  limit?: number;
  mapFilters?: Filter[];
} = {}): Promise<{ posts: Post[]; total: number }> {
  const validOffset = Math.max(0, Math.floor(offset));
  const validLimit = Math.max(1, Math.floor(limit));

  // Cache Key Includes Filters
  const activeFilters = mapFilters?.filter(f => f.value && f.value.length > 0) || [];
  const filtersKeyPart = activeFilters.length > 0
    ? crypto.createHash('sha256').update(JSON.stringify(
        activeFilters.sort((a, b) => a.type.localeCompare(b.type))
                   .map(f => ({ t: f.type, o: f.operator, v: [...f.value].sort() }))
      )).digest('hex')
    : 'none';
  const cacheKey = `constructionUpdatesV10:${citySlug || 'all'}:${validOffset}:${validLimit}:${filtersKeyPart}`;

  return cache<{ posts: Post[]; total: number }>(
    cacheKey,
    async () => {
      try {
        // 1. Get project IDs for under construction projects
        let projectQuery = supabaseServer
          .from('projects')
          .select('id')
          .eq('status', 'under_construction')
          .eq('has_articles', true)
          .order('updated_at', { ascending: false })
          .limit(100);

        if (citySlug) {
          projectQuery = projectQuery.eq('city_slug', citySlug);
        }

        // Apply Map Filters to project query
        projectQuery = applySupabaseFilters(projectQuery, activeFilters);

        const { data: projects, error: projectError } = await projectQuery;

        if (projectError) {
          console.error("[fetchConstructionUpdates] Error fetching projects:", projectError);
          return { posts: [], total: 0 };
        }

        if (!projects || projects.length === 0) {
          return { posts: [], total: 0 };
        }

        // Step 2: Get project IDs and fetch articles efficiently
        const projectIds = projects.map(p => p.id).filter(id => id);

        if (projectIds.length === 0) {
          return { posts: [], total: 0 };
        }

        // Step 3: Fetch articles with proper pagination
        const { data: articlesData, error: articlesError, count: totalCount } = await supabaseServer
          .from('articles')
          .select('*', { count: 'exact' })
          .in('supabase_project_id', projectIds)
          .not('published_at', 'is', null)
          .not('city_name', 'is', null)
          .order('published_at', { ascending: false })
          .range(validOffset, validOffset + validLimit - 1);

        if (articlesError) {
          console.error("[fetchConstructionUpdates] Error fetching articles:", articlesError);
          return { posts: [], total: 0 };
        }

        // Convert Supabase articles to Post format
        const posts = (articlesData || []).map(article => mapSupabaseArticleToPost(article));

        return {
          posts,
          total: totalCount || 0,
        };

      } catch (error) {
        console.error("🏗️ [fetchConstructionUpdates] Unexpected error:", error);
        return { posts: [], total: 0 };
      }
    },
    {
      ttl: 2 * 60 * 60, // 2 hour cache
      edge: true,
      local: true
    }
  );
}

// Layout data interfaces
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

export interface ClientLayoutData {
  post: Post;
  project: Project | null;
  comments: Comment[];
  relatedPosts: Post[];
  projectCompanies: CompanyProjectResponse[];
  projectUpdates: ProjectUpdate[];
}

// Fetch company projects server-side
async function fetchProjectCompaniesServerSide(projectSlug: string): Promise<CompanyProjectResponse[]> {
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
      .returns<CompanyProjectResponse[]>();

    if (companiesError) throw companiesError;
    return companies || [];
  } catch (error) {
    console.error(`[fetchProjectCompaniesServerSide] Error loading companies for project ${projectSlug}:`, error);
    return [];
  }
}

// Fetch project by ID (assuming this exists in projects feature)
async function fetchProjectById(projectId: string): Promise<Project | null> {
  if (!projectId) return null;
  try {
    const { data: project, error } = await supabaseServer
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error(`[fetchProjectById] Error fetching project ${projectId}:`, error);
      return null;
    }
    return project as Project | null;
  } catch (error) {
    console.error(`[fetchProjectById] Unexpected error fetching project ${projectId}:`, error);
    return null;
  }
}

export async function fetchBySlug({
  slug,
  cityName
}: {
  slug: string;
  cityName: string;
}): Promise<{ post: Post | null; project: Project | null }> {
  try {
    // Convert city slug to actual city name for database lookup
    const actualCityName = getCityNameFromSlug(cityName) || cityName;
    
    // 1. Fetch the Supabase article by slug and cityName
    const { data: article, error } = await supabaseServer
      .from('articles')
      .select('*')
      .eq('slug', slug)
      .eq('city_name', actualCityName)
      .not('published_at', 'is', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { post: null, project: null };
      }
      console.error(`Error fetching article by slug ${slug}:`, error);
      return { post: null, project: null };
    }

    const post = mapSupabaseArticleToPost(article);
    
    if (!post) {
      return { post: null, project: null };
    }

    // 2. Fetch related project if the post has supabase_project_id
    let project: Project | null = null;
    if (post.supabase_project_id) {
      project = await fetchProjectById(post.supabase_project_id);
    }

    return { post, project };

  } catch (error) {
    console.error(`[fetchBySlug] Error fetching data for slug: ${slug}, cityName: ${cityName}:`, error);
    return { post: null, project: null };
  }
}

export async function fetchClientLayoutData({
  postSlug,
  cityName,
}: {
  postSlug: string;
  cityName: string;
}): Promise<ClientLayoutData | null> {
  try {
    // Convert city slug to actual city name for database lookup
    const actualCityName = getCityNameFromSlug(cityName) || cityName;
    
    // 1. Fetch the main post data and its associated project
    const { post, project } = await fetchBySlug({
      slug: postSlug,
      cityName: actualCityName
    });

    if (!post) {
      return null;
    }

    // Determine project details for fetching related data
    const effectiveProjectSlug = project?.slug;
    const effectiveProjectAddress = project?.address;

    // 2. Fetch comments, related posts, project companies, and project updates in parallel
    let comments: Comment[] = [];
    let relatedPosts: Post[] = [];
    let projectCompanies: CompanyProjectResponse[] = [];
    let projectUpdates: ProjectUpdate[] = [];

    const fetchPromises: Promise<any>[] = [fetchComments(post.id)];

    if (project && effectiveProjectAddress) {
      // Fetch related posts based on the project's address
      fetchPromises.push(fetchArticlesByAddress(effectiveProjectAddress, post.id));
    } else {
      fetchPromises.push(Promise.resolve([]));
    }

    if (effectiveProjectSlug) {
      // Fetch companies associated with the project slug
      fetchPromises.push(fetchProjectCompaniesServerSide(effectiveProjectSlug));
    } else {
      fetchPromises.push(Promise.resolve([]));
    }

    // Fetch project updates if we have a project
    if (project?.id) {
      fetchPromises.push(fetchProjectUpdatesByProjectId(project.id));
    } else {
      fetchPromises.push(Promise.resolve([]));
    }

    try {
      const results = await Promise.all(fetchPromises);
      comments = results[0] || [];
      relatedPosts = results[1] || [];
      projectCompanies = results[2] || [];
      projectUpdates = results[3] || [];
    } catch (fetchError) {
      console.error(`[fetchClientLayoutData] Error during parallel data fetch for post ${postSlug}:`, fetchError);
    }

    return {
      post,
      project,
      comments,
      relatedPosts,
      projectCompanies,
      projectUpdates
    };

  } catch (error) {
    console.error(`[fetchClientLayoutData] Error fetching primary data for post ${postSlug}:`, error);
    return null;
  }
}

export async function fetchMetadataBySlug({
  slug,
  cityName,
  neighborhoodName
}: {
  slug: string;
  cityName: string;
  neighborhoodName?: string;
}): Promise<{ post: Post | null }> {
  try {
    // Convert city slug to actual city name for database lookup
    const actualCityName = getCityNameFromSlug(cityName) || cityName;
    
    // Fetch the Supabase article by slug and cityName
    const { data: article, error } = await supabaseServer
      .from('articles')
      .select('*')
      .eq('slug', slug)
      .eq('city_name', actualCityName)
      .not('published_at', 'is', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { post: null };
      }
      console.error(`Error fetching metadata by slug ${slug}:`, error);
      return { post: null };
    }

    const post = mapSupabaseArticleToPost(article);
    return { post };

  } catch (error) {
    console.error(`[fetchMetadataBySlug] Error fetching metadata for slug: ${slug}, cityName: ${cityName}:`, error);
    return { post: null };
  }
}

export async function fetchClientLayoutDataStatic({
  postSlug,
  cityName,
  neighborhoodName,
}: {
  postSlug: string;
  cityName: string;
  neighborhoodName?: string;
}): Promise<ClientLayoutData | null> {
  // This is the same as fetchClientLayoutData for now
  return fetchClientLayoutData({ postSlug, cityName });
}

// Fetch project updates by project ID (duplicated from project-layout.ts for now)
async function fetchProjectUpdatesByProjectId(projectId: string): Promise<ProjectUpdate[]> {
  if (!projectId) return [];

  try {
    const { data: updates, error } = await supabaseServer
      .from('project_updates')
      .select('*')
      .eq('project_id', projectId)
      .order('update_date', { ascending: true }); // Order chronologically

    if (error) {
      console.error(`[fetchProjectUpdatesByProjectId] Error fetching project updates for ${projectId}:`, error);
      return [];
    }

    return (updates || []) as ProjectUpdate[];
  } catch (error) {
    console.error(`[fetchProjectUpdatesByProjectId] Unexpected error fetching project updates for ${projectId}:`, error);
    return [];
  }
}