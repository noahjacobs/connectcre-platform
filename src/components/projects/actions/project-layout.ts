"use server";

import { supabaseServer } from '@/lib/supabase/server';
import { Project } from '@/lib/types';
import type { Post, Comment } from '@/components/posts/types';
import type { ProjectUpdate } from '@/components/projects/types';
import { fetchComments, fetchPrimarySupabasePostByProjectId, fetchArticlesByAddress } from '@/components/posts/actions/post-queries';

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

// Fetch project by ID 
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

// Fetch project updates by project ID
async function fetchProjectUpdatesByProjectId(projectId: string): Promise<ProjectUpdate[]> {
  console.log('fetchProjectUpdatesByProjectId', projectId);
  if (!projectId) return [];
  console.log('fetchProjectUpdatesByProjectId', projectId);

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

export async function fetchLayoutDataByProjectId(projectId: string): Promise<ClientLayoutData | null> {
  if (!projectId) {
    console.error('[fetchLayoutDataByProjectId] Project ID is required.');
    return null;
  }

  try {
    // 1. Fetch the Supabase project by ID
    const project = await fetchProjectById(projectId);
    if (!project) {
      console.warn(`[fetchLayoutDataByProjectId] Supabase project not found for ID: ${projectId}`);
      return null;
    }

    // 2. Fetch the primary FULL Supabase post linked to this project
    const post = await fetchPrimarySupabasePostByProjectId(projectId);
    if (!post) {
      console.warn(`[fetchLayoutDataByProjectId] Primary Supabase post not found for project ID: ${projectId}`);
      return null;
    }

    // 3. Fetch comments, related posts (by address), and project companies in parallel
    const effectiveProjectSlug = project.slug;
    const effectiveProjectAddress = project.address;

    let comments: Comment[] = [];
    let relatedPosts: Post[] = [];
    let projectCompanies: CompanyProjectResponse[] = [];
    let projectUpdates: ProjectUpdate[] = [];

    const fetchPromises: Promise<any>[] = [fetchComments(post.id)];

    if (effectiveProjectAddress) {
      // Fetch related posts based on the project's address, excluding the primary post itself
      fetchPromises.push(fetchArticlesByAddress(effectiveProjectAddress, post.id));
    } else {
      fetchPromises.push(Promise.resolve([])); // No address, no related posts
    }

    if (effectiveProjectSlug) {
      // Fetch companies associated with the project slug in Supabase
      fetchPromises.push(fetchProjectCompaniesServerSide(effectiveProjectSlug));
    } else {
      fetchPromises.push(Promise.resolve([])); // No project slug, no companies
    }

    fetchPromises.push(fetchProjectUpdatesByProjectId(projectId));

    try {
      const results = await Promise.all(fetchPromises);
      comments = results[0] || [];
      relatedPosts = results[1] || [];
      projectCompanies = results[2] || [];
      projectUpdates = results[3] || [];
    } catch (fetchError) {
      console.error(`[fetchLayoutDataByProjectId] Error during parallel data fetch for project ${projectId}:`, fetchError);
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
    console.error(`[fetchLayoutDataByProjectId] Error fetching primary data for project ${projectId}:`, error);
    return null;
  }
} 