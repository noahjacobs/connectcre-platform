"use server";

import { supabaseServer } from '@/lib/supabase/server';
import { cache, invalidateCache } from '@/lib/utils/cache';
import { Project } from '@/components/projects/types';
import { normalizeAddress } from '@/lib/utils';

interface SupabaseImageAsset {
  url: string;
  alt?: string;
}

// --- Fetch Supabase Project by Address ---
const SIMILARITY_THRESHOLD = 0.6; // Adjust as needed for fuzzy matching accuracy

export async function fetchProjectByAddress(address: string | null): Promise<Project | null> {
  if (!address) return null;

  const normalized = normalizeAddress(address);
  if (!normalized) return null;

  try {
    // 1. Try exact match on normalized address first
    const { data: exactMatch, error: exactError } = await supabaseServer
      .from('projects')
      .select('*')
      .eq('normalized_address', normalized)
      .maybeSingle();

    if (exactError && exactError.code !== 'PGRST116') { // Ignore 'PGRST116' (No rows found)
        console.error(`[fetchSupabaseProjectByAddress] Error fetching exact match for "${normalized}":`, exactError);
        // Decide if you want to throw or continue to fuzzy match
    }

    if (exactMatch) {
      return exactMatch as Project;
    }

    // Use Supabase RPC to call a function that calculates similarity
    // Requires a SQL function like the one defined below.
    const { data: fuzzyMatches, error: fuzzyError } = await supabaseServer
      .rpc('match_project_by_address', {
          query_address: normalized,
          similarity_threshold: SIMILARITY_THRESHOLD
      });

    if (fuzzyError) {
      // console.error(`[fetchProjectByAddress] Error executing fuzzy match RPC for "${normalized}":`, fuzzyError);
      return null; // Failed to perform fuzzy match
    }

    if (fuzzyMatches && fuzzyMatches.length > 0) {
      // RPC returns an array ordered by similarity, take the best one
      const bestMatch = fuzzyMatches[0];
      // The RPC function should return all columns needed for SupabaseProject
      return bestMatch as Project;
    }

    // 3. No exact or fuzzy match found
    return null;

  } catch (error) {
    return null;
  }
}

export async function fetchProjectBySlug(slug: string): Promise<Project | null> {
  try {
    const { data, error } = await supabaseServer
      .from('projects')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error) {
      console.error('Error fetching project by slug:', error);
      return null;
    }

    return data as Project;
  } catch (error) {
    console.error('Error in fetchProjectBySlug:', error);
    return null;
  }
}

export async function fetchProjectById(projectId: string): Promise<Project | null> {
  try {
    const { data, error } = await supabaseServer
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (error) {
      console.error('Error fetching project by ID:', error);
      return null;
    }

    return data as Project;
  } catch (error) {
    console.error('Error in fetchProjectById:', error);
    return null;
  }
}

export async function checkProjectExistsByAddress(
    address: string | null
): Promise<Project | null> {
  if (!address) return null;
  
  const normalized = normalizeAddress(address);
  if (!normalized) return null;

  try {
    const { data, error } = await supabaseServer
      .from('projects')
      .select('*')
      .eq('normalized_address', normalized)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking project exists by address:', error);
      return null;
    }

    return data as Project | null;
  } catch (error) {
    console.error('Error in checkProjectExistsByAddress:', error);
    return null;
  }
}

export async function checkProjectSlugExists(slug: string): Promise<boolean> {
  try {
    const { data, error } = await supabaseServer
      .from('projects')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking project slug exists:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('Error in checkProjectSlugExists:', error);
    return false;
  }
}

export async function fetchProjectImages(projectSlugs: string[]): Promise<Map<string, SupabaseImageAsset | null>> {
  if (!projectSlugs || projectSlugs.length === 0) {
      return new Map();
  }

  const imageMap = new Map<string, SupabaseImageAsset | null>();

  try {
      // 1. Fetch Supabase project IDs by slug
      const { data: projects, error: projectError } = await supabaseServer
          .from('projects')
          .select('id, slug') // Select ID and slug
          .in('slug', projectSlugs);

      if (projectError) {
          console.error('[fetchProjectImages] Error fetching project IDs by slug:', projectError);
          // Initialize map with nulls for requested slugs on error
          projectSlugs.forEach(slug => imageMap.set(slug, null));
          return imageMap;
      }

      if (!projects || projects.length === 0) {
          projectSlugs.forEach(slug => imageMap.set(slug, null)); // No matching projects found
          return imageMap;
      }

      const supabaseProjectIds = projects.map(p => p.id);

      if (supabaseProjectIds.length === 0) {
          projectSlugs.forEach(slug => imageMap.set(slug, null));
          return imageMap;
      }

      // 2. Fetch the most recent Supabase article for each linked project ID
      const { data: articles, error: articlesError } = await supabaseServer
          .from('articles')
          .select('supabase_project_id, images, published_at')
          .in('supabase_project_id', supabaseProjectIds)
          .not('images', 'is', null)
          .order('published_at', { ascending: false });

      if (articlesError) {
          console.error('[fetchProjectImages] Error fetching articles:', articlesError);
          projectSlugs.forEach(slug => imageMap.set(slug, null));
          return imageMap;
      }

      // 3. Create a map from Supabase Project ID to its most recent image
      const projectIdToImageMap = new Map<string, SupabaseImageAsset | null>();
      if (articles && articles.length > 0) {
          articles.forEach(article => {
              // Since articles are ordered by published_at desc, the first time we encounter
              // a supabase_project_id, it belongs to the most recent article for that project.
              if (article.supabase_project_id && !projectIdToImageMap.has(article.supabase_project_id)) {
                  // Get the first image from the Supabase article
                  const firstImage = article.images && article.images.length > 0 ? article.images[0] : null;
                  if (firstImage) {
                      // Create simple Supabase image asset
                      const imageAsset: SupabaseImageAsset = {
                          url: typeof firstImage === 'string' ? firstImage : firstImage.url || '',
                          alt: typeof firstImage === 'object' && firstImage.alt ? firstImage.alt : undefined
                      };
                      projectIdToImageMap.set(article.supabase_project_id, imageAsset);
                  } else {
                      projectIdToImageMap.set(article.supabase_project_id, null);
                  }
              }
          });
      }

      // 4. Map images back to the originally requested slugs
      projectSlugs.forEach(slug => {
          const project = projects.find(p => p.slug === slug);
          if (project?.id && projectIdToImageMap.has(project.id)) {
              imageMap.set(slug, projectIdToImageMap.get(project.id)!);
          } else {
              imageMap.set(slug, null); // No matching project ID or no linked image found
          }
      });

      return imageMap;

  } catch (error) {
      console.error('[fetchProjectImages] Error fetching project images:', error);
      // Initialize map with nulls for requested slugs on error
      projectSlugs.forEach(slug => imageMap.set(slug, null));
      return imageMap;
  }
}

// New function to fetch project slugs for ISR
export const fetchProjectSlugsStaticParams = async (limit = 100): Promise<{ slug: string }[]> => {
  try {
    const { data, error } = await supabaseServer
      .from('projects')
      .select('slug')
      .not('slug', 'is', null) // Ensure slug exists
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[fetchProjectSlugsStaticParams] Error fetching project slugs:", error);
      return [];
    }
    return (data || []).map(p => ({ slug: p.slug! })); // Map to expected structure

  } catch (error) {
    console.error("[fetchProjectSlugsStaticParams] Exception:", error);
    return [];
  }
};

export async function fetchProjectPageMetadata(projectSlug: string): Promise<{
  project: Pick<Project, 'id' | 'title' | 'description' | 'slug'> | null;
  primaryPost: {
    title?: string;
    subtitle?: string;
    ogImageUrl?: string;
    publishedAt?: string;
    _createdAt?: string;
    _updatedAt?: string;
  } | null;
}> {
  const project = await fetchProjectBySlug(projectSlug);

  if (!project || !project.id) {
    return { project: null, primaryPost: null };
  }

  let primaryPostData = null;
  if (project.id) {
    // Query Supabase articles instead of Sanity
    const { data: article, error } = await supabaseServer
      .from('articles')
      .select('title_ai, subtitle_ai, images, published_at, created_at, updated_at')
      .eq('supabase_project_id', project.id)
      .order('published_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error(`[fetchProjectPageMetadata] Error fetching article for project ${project.id}:`, error);
    }

    if (article) {
      // Extract first image URL from Supabase format
      let ogImageUrl = null;
      if (article.images && Array.isArray(article.images) && article.images.length > 0) {
        const firstImage = article.images[0];
        ogImageUrl = typeof firstImage === 'string' ? firstImage : firstImage?.url || null;
      }

      primaryPostData = {
              title: article.title_ai,
      subtitle: article.subtitle_ai,
        ogImageUrl,
        publishedAt: article.published_at,
        _createdAt: article.created_at,
        _updatedAt: article.updated_at
      };
    }
  }

  return {
    project: { // Return only necessary project fields
      id: project.id,
      title: project.title,
      description: project.description,
      slug: project.slug,
    },
    primaryPost: primaryPostData // This will be null if no post is found
  };
} 