"use server";

import { supabaseServer } from '@/lib/supabase/server';
import { cache } from '@/lib/utils/cache';
import type { Post } from '../types';
import { serverPerfLog as perfLog } from '@/lib/utils/performance-monitor-server';

// Comment interface for post comments
export interface Comment {
  id: string;
  content: string;
  created_at: string;
  post_id: string;
  parent_id?: string;
  user_id: string;
  user?: {
    id: string;
    email: string;
    user_metadata: {
      avatar_url?: string;
      full_name?: string;
    } | null;
  } | null;
  replies?: Comment[];
}

// Helper function to map Supabase article to Post
function mapSupabaseArticleToPost(article: any): Post {
  return {
    id: article.id,
    created_at: article.created_at,
    updated_at: article.updated_at,
    title: article.title_ai,
    slug: article.slug,
    subtitle: article.subtitle_ai,
    images: article.images,
    bannerImage: article.bannerImage,
    body_ai: article.body_ai,
    city_name: article.city_name,
    neighborhood_name: article.neighborhood_name,
    address: article.address,
    normalized_address: article.normalized_address,
    supabase_project_id: article.supabase_project_id,
    published_at: article.published_at,
    tags: article.tags
  };
}

// Request cancellation support for fetchArticles
const articleRequests = new Map<string, AbortController>();

export async function fetchArticles({
  limit = 12,
  cityName,
  lastPublishedAt,
  lastId,
  supabaseProjectIds
}: {
  limit?: number;
  cityName?: string;
  lastPublishedAt?: string;
  lastId?: string;
  supabaseProjectIds?: string[];
} = {}): Promise<{ posts: Post[]; total: number }> {

  const timer = perfLog.time('FetchArticles', 'Starting fetch');
  perfLog.log('FetchArticles', 'Starting fetch', undefined, {
    limit,
    cityName,
    hasLastPublishedAt: !!lastPublishedAt,
    hasLastId: !!lastId,
    projectIdsCount: supabaseProjectIds?.length || 0,
    timestamp: new Date().toISOString()
  });

  // Create cache key for initial page loads only (not paginated ones)
  const isInitialLoad = !lastPublishedAt && !lastId;
  let cacheKey: string | null = null;
  
  if (isInitialLoad) {
    const cacheKeyStart = performance.now();
    const projectIdsKey = supabaseProjectIds?.length 
      ? supabaseProjectIds.sort().join(',') 
      : 'none';
    cacheKey = `articlesV1:${cityName || 'all'}:${limit}:${projectIdsKey}`;
    
    // Cancel any existing request with the same cache key
    if (articleRequests.has(cacheKey)) {
      perfLog.log('FetchArticles', 'Cancelling existing request');
      articleRequests.get(cacheKey)?.abort();
      articleRequests.delete(cacheKey);
    }
    
    perfLog.log('FetchArticles', 'Cache key generated', performance.now() - cacheKeyStart, { 
      cacheKey: cacheKey.substring(0, 50) + '...',
      isInitialLoad,
      willUseCache: true
    });
  } else {
    perfLog.log('FetchArticles', 'Pagination request - bypassing cache', undefined, { isInitialLoad });
  }

  // Create abort controller for this request
  const abortController = new AbortController();
  if (cacheKey) {
    articleRequests.set(cacheKey, abortController);
  }

  const fetchArticlesData = async () => {
    const dbStartTime = performance.now();
    perfLog.log('FetchArticles', 'Starting database query...');
    
    try {
      // Check if request was cancelled
      if (abortController.signal.aborted) {
        perfLog.log('FetchArticles', 'Request cancelled');
        return { posts: [], total: 0 };
      }

      const queryBuildStart = performance.now();
      let query = supabaseServer
        .from('articles')
        .select('*', { count: 'exact' })
        .not('published_at', 'is', null)
        .not('city_name', 'is', null);

      // Apply city filter FIRST for better performance - this should reduce the dataset significantly
      if (cityName) {
        query = query.eq('city_name', cityName);
        perfLog.log('FetchArticles', 'Applied city filter', undefined, cityName);
      }

      // Apply project filter EARLY if provided and not too many IDs
      if (supabaseProjectIds && supabaseProjectIds.length > 0) {
        // Limit project filter to prevent performance issues
        const MAX_PROJECT_IDS = 50;
        if (supabaseProjectIds.length <= MAX_PROJECT_IDS) {
          query = query.in('supabase_project_id', supabaseProjectIds);
          perfLog.log('FetchArticles', 'Applied project filter', undefined, { count: supabaseProjectIds.length });
        } else {
          perfLog.warn('FetchArticles', 'Too many project IDs, skipping filter', undefined, { count: supabaseProjectIds.length });
        }
      }

      // Apply cursor-based pagination if provided
      if (lastPublishedAt && lastId) {
        query = query.or(`published_at.lt.${lastPublishedAt},and(published_at.eq.${lastPublishedAt},id.lt.${lastId})`);
        perfLog.log('FetchArticles', 'Applied pagination cursor', undefined, { lastPublishedAt, lastId });
      }

      // Apply ordering and limit last for better query optimization
      query = query
        .order('published_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(limit);
        
      perfLog.log('FetchArticles', 'Query building completed', performance.now() - queryBuildStart);

      // Check if request was cancelled before executing query
      if (abortController.signal.aborted) {
        perfLog.log('FetchArticles', 'Request cancelled before database execution');
        return { posts: [], total: 0 };
      }

      const dbExecutionStart = performance.now();
      
      // Execute the query without artificial timeout - let cache misses complete
      const { data: articlesData, error: articlesError, count: totalCount } = await query;
      const dbExecutionTime = performance.now() - dbExecutionStart;
      
      perfLog.log('FetchArticles', 'Database execution completed', dbExecutionTime, {
        recordsReturned: articlesData?.length || 0,
        totalCount: totalCount || 0,
        hasError: !!articlesError
      });

      if (dbExecutionTime > 1000) {
        perfLog.warn('FetchArticles', 'SLOW DATABASE QUERY DETECTED', dbExecutionTime);
      }

      if (dbExecutionTime > 5000) {
        perfLog.warn('FetchArticles', 'VERY SLOW DATABASE QUERY - potential cache miss or optimization opportunity', dbExecutionTime);
      }

      if (articlesError) {
        perfLog.error('FetchArticles', 'Database error', articlesError);
        return { posts: [], total: 0 };
      }

      // Check if request was cancelled before mapping
      if (abortController.signal.aborted) {
        perfLog.log('FetchArticles', 'Request cancelled before data mapping');
        return { posts: [], total: 0 };
      }

      const mappingStart = performance.now();
      const posts = (articlesData || []).map(mapSupabaseArticleToPost);
      perfLog.log('FetchArticles', 'Data mapping completed', performance.now() - mappingStart);
      
      const result = {
        posts,
        total: totalCount || 0
      };

      const totalDbTime = performance.now() - dbStartTime;
      perfLog.log('FetchArticles', 'Database operation completed', totalDbTime, {
        postsCount: posts.length,
        total: result.total
      });

      return result;
    } catch (error) {
      perfLog.error('FetchArticles', 'Unexpected error', error);
      return { posts: [], total: 0 };
    } finally {
      // Clean up abort controller
      if (cacheKey) {
        articleRequests.delete(cacheKey);
      }
    }
  };

  // Use cache for initial loads, direct fetch for pagination
  if (cacheKey) {
    perfLog.log('FetchArticles', 'Attempting cache lookup...');
    const cacheStart = performance.now();
    
    try {
      const result = await cache(
        cacheKey,
        fetchArticlesData,
        {
          ttl: 5 * 60, // Increased from 2 to 5 minutes for better cache hit rates
          edge: true,
          local: true
        }
      );
      
      const cacheTime = performance.now() - cacheStart;
      const totalTime = timer.end();
      
      // More generous cache hit detection (under 50ms instead of 10ms)
      if (cacheTime < 50) {
        perfLog.log('FetchArticles', 'CACHE HIT', cacheTime, { totalTime });
      } else {
        perfLog.log('FetchArticles', 'Cache miss - fetched fresh data', cacheTime, { totalTime });
        
        if (totalTime && totalTime > 5000) {
          perfLog.warn('FetchArticles', 'SLOW API CALL DETECTED', totalTime);
        }
      }
      
      return result;
    } finally {
      // Ensure cleanup happens even if cache throws
      articleRequests.delete(cacheKey);
    }
  } else {
    perfLog.log('FetchArticles', 'Direct fetch (no cache)');
    const result = await fetchArticlesData();
    const totalTime = timer.end();
    if (totalTime) {
      perfLog.log('FetchArticles', 'Direct fetch completed', totalTime);
    }
    
    if (totalTime && totalTime > 3000) {
      perfLog.warn('FetchArticles', 'SLOW DIRECT FETCH DETECTED', totalTime);
    }
    
    return result;
  }
}

export async function searchArticles(
  query: string,
  cityName?: string,
  offset = 0,
  limit = 12,
  supabaseProjectIds?: string[]
): Promise<{ results: Post[]; total: number }> {
  try {
    if (!query || query.trim().length === 0) {
      return { results: [], total: 0 };
    }

    const trimmedQuery = query.trim();

    // Search articles directly
    let articleSearchQuery = supabaseServer
      .from('articles')
      .select('*')
      .not('published_at', 'is', null)
      .not('city_name', 'is', null)
      .or(`title_ai.ilike.%${trimmedQuery}%,subtitle_ai.ilike.%${trimmedQuery}%,address.ilike.%${trimmedQuery}%`)
      .order('published_at', { ascending: false });

    // Apply city filter if provided
    if (cityName) {
      articleSearchQuery = articleSearchQuery.eq('city_name', cityName);
    }

    // Apply project filter if provided
    if (supabaseProjectIds && supabaseProjectIds.length > 0) {
      articleSearchQuery = articleSearchQuery.in('supabase_project_id', supabaseProjectIds);
    }

    // Search companies and find associated articles
    let companySearchQuery = supabaseServer
      .from('companies_view')
      .select('id, name')
      .eq('status', 'approved')
      .ilike('name', `%${trimmedQuery}%`);

    // Execute both searches in parallel
    const [articleResults, companyResults] = await Promise.all([
      articleSearchQuery,
      companySearchQuery
    ]);

    if (articleResults.error) {
      console.error('[searchArticles] Error searching articles:', articleResults.error);
      return { results: [], total: 0 };
    }

    let allArticles = articleResults.data || [];
    let articleIds = new Set(allArticles.map(article => article.id));

    // If companies were found, find articles associated with their projects
    if (companyResults.data && companyResults.data.length > 0) {
      const companyIds = companyResults.data.map(company => company.id);
      
      // Find projects associated with these companies
      const { data: companyProjects, error: companyProjectsError } = await supabaseServer
        .from('company_projects')
        .select('project_slug')
        .in('company_id', companyIds)
        .eq('status', 'approved');

      if (!companyProjectsError && companyProjects && companyProjects.length > 0) {
        const projectSlugs = companyProjects.map(cp => cp.project_slug);
        
        // Find project IDs from slugs
        const { data: projects, error: projectsError } = await supabaseServer
          .from('projects')
          .select('id')
          .in('slug', projectSlugs);

        if (!projectsError && projects && projects.length > 0) {
          const projectIds = projects.map(p => p.id);
          
          // Find articles associated with these projects
          let companyArticlesQuery = supabaseServer
            .from('articles')
            .select('*')
            .in('supabase_project_id', projectIds)
            .not('published_at', 'is', null)
            .not('city_name', 'is', null)
            .order('published_at', { ascending: false });

          // Apply city filter if provided
          if (cityName) {
            companyArticlesQuery = companyArticlesQuery.eq('city_name', cityName);
          }

          // Apply project filter if provided
          if (supabaseProjectIds && supabaseProjectIds.length > 0) {
            companyArticlesQuery = companyArticlesQuery.in('supabase_project_id', supabaseProjectIds);
          }

          const { data: companyArticles, error: companyArticlesError } = await companyArticlesQuery;

          if (!companyArticlesError && companyArticles) {
            // Add company articles to results, avoiding duplicates
            for (const article of companyArticles) {
              if (!articleIds.has(article.id)) {
                allArticles.push(article);
                articleIds.add(article.id);
              }
            }
          }
        }
      }
    }

    // Sort all articles by published_at (descending)
    allArticles.sort((a, b) => {
      const dateA = new Date(a.published_at);
      const dateB = new Date(b.published_at);
      return dateB.getTime() - dateA.getTime();
    });

    // Apply pagination
    const startIndex = offset;
    const endIndex = offset + limit;
    const paginatedArticles = allArticles.slice(startIndex, endIndex);

    const results = paginatedArticles.map(mapSupabaseArticleToPost);
    
    return {
      results,
      total: allArticles.length
    };
  } catch (error) {
    console.error('Error searching articles:', error);
    return { results: [], total: 0 };
  }
}

export async function fetchArticleBySlug({
  slug,
  cityName
}: {
  slug: string;
  cityName: string;
}): Promise<Post | null> {
  try {
    const { data: article, error } = await supabaseServer
      .from('articles')
      .select('*')
      .eq('slug', slug)
      .eq('city_name', cityName)
      .not('published_at', 'is', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows found
        return null;
      }
      console.error(`Error fetching article by slug ${slug}:`, error);
      return null;
    }

    return mapSupabaseArticleToPost(article);
  } catch (error) {
    console.error(`Error fetching article by slug ${slug}:`, error);
    return null;
  }
}

export async function fetchArticlesByAddress(
  address: string,
  excludePostId?: string
): Promise<Post[]> {
  try {
    let query = supabaseServer
      .from('articles')
      .select('*')
      .eq('address', address)
      .not('published_at', 'is', null)
      .order('published_at', { ascending: false })
      .limit(5);

    // Exclude specific post if provided
    if (excludePostId) {
      query = query.neq('id', excludePostId);
    }

    const { data: articles, error } = await query;

    if (error) {
      console.error(`Error fetching articles by address ${address}:`, error);
      return [];
    }

    return (articles || []).map(mapSupabaseArticleToPost);
  } catch (error) {
    console.error(`Error fetching articles by address ${address}:`, error);
    return [];
  }
}

export async function fetchArticlesByNeighborhood(
  cityName: string,
  neighborhoodName: string,
  limit = 9,
  lastPublishedAt?: string,
  lastId?: string
): Promise<{ posts: Post[]; total: number }> {
  try {
    let query = supabaseServer
      .from('articles')
      .select('*', { count: 'exact' })
      .eq('city_name', cityName)
      .eq('neighborhood_name', neighborhoodName)
      .not('published_at', 'is', null)
      .order('published_at', { ascending: false })
      .order('id', { ascending: false });

    // Apply cursor-based pagination if provided
    if (lastPublishedAt && lastId) {
      query = query.or(`published_at.lt.${lastPublishedAt},and(published_at.eq.${lastPublishedAt},id.lt.${lastId})`);
    }

    const { count, error: countError } = await supabaseServer
      .from('articles')
      .select('*', { count: 'exact', head: true })
      .eq('city_name', cityName)
      .eq('neighborhood_name', neighborhoodName)
      .not('published_at', 'is', null);

    if (countError) {
      console.error(`Error getting count for neighborhood ${neighborhoodName}:`, countError);
    }

    // Apply limit
    query = query.limit(limit);

    const { data: articles, error } = await query;

    if (error) {
      console.error(`Error fetching articles for neighborhood ${neighborhoodName}:`, error);
      return { posts: [], total: 0 };
    }

    const posts = (articles || []).map(mapSupabaseArticleToPost);
    
    return {
      posts,
      total: count || 0
    };
  } catch (error) {
    console.error(`Error fetching articles for neighborhood ${neighborhoodName}:`, error);
    return { posts: [], total: 0 };
  }
}

export async function fetchPrimarySupabasePostByProjectId(projectId: string): Promise<Post | null> {
  if (!projectId) return null;

  try {
    const { data: article, error } = await supabaseServer
      .from('articles')
      .select('*')
      .eq('supabase_project_id', projectId)
      .not('published_at', 'is', null)
      .not('city_name', 'is', null)
      .order('published_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows found
        return null;
      }
      console.error(`Error fetching post for project ${projectId}:`, error);
      return null;
    }

    if (!article) {
      return null;
    }

    return mapSupabaseArticleToPost(article);

  } catch (error) {
    console.error(`Error fetching post for project ${projectId}:`, error);
    return null;
  }
}

// Fetch comments for a post
export async function fetchComments(postId: string): Promise<Comment[]> {
  try {
    if (!postId) return [];

    const { data: comments, error } = await supabaseServer
      .from('comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error(`[fetchComments] Error fetching comments for post ${postId}:`, error);
      return [];
    }

    if (!comments || comments.length === 0) {
      return [];
    }

    // Get user details for all comments
    const userIds = [...new Set(comments.map(comment => comment.user_id).filter(Boolean))];
    
    let usersMap = new Map();
    if (userIds.length > 0) {
      try {
        // Fetch user details using admin client
        const userPromises = userIds.map(async (userId) => {
          try {
            const { data: userData, error: userError } = await supabaseServer.auth.admin.getUserById(userId);
            if (userError || !userData.user) {
              console.error(`Error fetching user ${userId}:`, userError);
              return null;
            }
            return {
              id: userId,
              user: userData.user
            };
          } catch (error) {
            console.error(`Error fetching user ${userId}:`, error);
            return null;
          }
        });

        const userResults = await Promise.all(userPromises);
        
        userResults.forEach(result => {
          if (result) {
            usersMap.set(result.id, result.user);
          }
        });
      } catch (error) {
        console.error(`[fetchComments] Error fetching user details:`, error);
      }
    }

    // Return comments as a flat array (component will handle hierarchy via filtering)
    const allComments: Comment[] = [];

    // Create comment objects with user data
    comments.forEach(comment => {
      const user = usersMap.get(comment.user_id);
      const commentObj: Comment = {
        id: comment.id,
        content: comment.content,
        created_at: comment.created_at,
        post_id: comment.post_id,
        parent_id: comment.parent_id,
        user_id: comment.user_id,
        user: user ? {
          id: user.id,
          email: user.email,
          user_metadata: user.user_metadata
        } : null,
        replies: [] // Keep for interface compatibility but won't be used
      };
      allComments.push(commentObj);
    });

    return allComments;
  } catch (error) {
    console.error(`[fetchComments] Unexpected error for post ${postId}:`, error);
    return [];
  }
} 