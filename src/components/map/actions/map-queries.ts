"use server";

import { supabaseServer } from '@/lib/supabase/server';
import { cache } from '@/lib/utils/cache';
import { Filter } from "@/components/ui/filters";
import crypto from 'crypto';
import { serverPerfLog as perfLog } from '@/lib/utils/performance-monitor-server';

// Define the structure of the data needed for map markers
export interface MapProjectData {
  id: string; // Supabase Project ID
  title: string | null;
  slug: string | null;
  latitude: number;
  longitude: number;
  status: string | null;
  city_slug: string | null;
  neighborhood_slug: string | null;
}

// Request deduplication to prevent simultaneous identical requests
const activeRequests = new Map<string, Promise<{ projects: MapProjectData[]; error?: string }>>();

// Add request cancellation support
const abortControllers = new Map<string, AbortController>();

export async function fetchProjectsForMap(
  criteria: {
    query?: string | null;
    actionId?: string | null;
    citySlug?: string | null;
    priorityProjectIds?: string[];
    mapFilters?: Filter[];
    fetchMode?: 'initial' | 'full';
  } = {}
): Promise<{ projects: MapProjectData[]; error?: string }> {
  const startTime = performance.now();
  const { citySlug, query, actionId, priorityProjectIds = [], mapFilters = [], fetchMode = 'full' } = criteria;

  perfLog.log('FetchProjectsForMap', 'Starting fetch', undefined, {
    citySlug,
    query,
    actionId,
    priorityProjectIdsCount: priorityProjectIds.length,
    mapFiltersCount: mapFilters.length,
    fetchMode,
    timestamp: new Date().toISOString()
  });

  // Calculate activeFilters *only* for cache key generation here
  const filterProcessStart = performance.now();
  const activeFiltersForKey = mapFilters.filter(f => f.value && f.value.length > 0);
  let priorityKeyPart = 'none';
  const validPriorityIds = priorityProjectIds.filter(id => id);
  if (validPriorityIds.length > 0) {
    const sortedIdsString = [...validPriorityIds].sort().join(',');
    priorityKeyPart = crypto.createHash('sha256').update(sortedIdsString).digest('hex');
  }

  // Generate a stable string representation of active filters for the cache key
  const filtersKeyPart = activeFiltersForKey.length > 0
    ? crypto.createHash('sha256').update(JSON.stringify(
        activeFiltersForKey.sort((a, b) => a.type.localeCompare(b.type))
                   .map(f => ({ t: f.type, o: f.operator, v: [...f.value].sort() }))
      )).digest('hex')
    : 'none';

  const INITIAL_FETCH_PROJECT_LIMIT = 300; // Limit for initial fetch of non-priority projects

  // Include the filter hash and fetchMode in the cache key
  const baseCacheKey = `mapProjectsV8:${citySlug || 'all'}:${query || 'none'}:${actionId || 'none'}:${priorityKeyPart}:${filtersKeyPart}:${fetchMode}`;
  const safeCacheKey = baseCacheKey.replace(/[^a-zA-Z0-9:-]/g, '');
  
  perfLog.log('FetchProjectsForMap', 'Cache key processing completed', performance.now() - filterProcessStart, {
    cacheKey: safeCacheKey.substring(0, 50) + '...',
    activeFiltersCount: activeFiltersForKey.length,
    validPriorityIdsCount: validPriorityIds.length
  });

  // Cancel any existing request with the same cache key
  if (abortControllers.has(safeCacheKey)) {
    perfLog.log('FetchProjectsForMap', 'Cancelling existing request for cache key');
    abortControllers.get(safeCacheKey)?.abort();
    abortControllers.delete(safeCacheKey);
    activeRequests.delete(safeCacheKey);
  }

  // Check for existing request with same cache key
  if (activeRequests.has(safeCacheKey)) {
    perfLog.log('FetchProjectsForMap', 'Returning existing request for cache key');
    const result = await activeRequests.get(safeCacheKey)!;
    const totalTime = performance.now() - startTime;
    perfLog.log('FetchProjectsForMap', 'Deduped request completed', totalTime);
    return result;
  }

  // Create abort controller for this request
  const abortController = new AbortController();
  abortControllers.set(safeCacheKey, abortController);

  const requestPromise = cache<{ projects: MapProjectData[]; error?: string }>(
    safeCacheKey,
    async () => {
      const dbTimer = perfLog.time('FetchProjectsForMap', 'Starting database operations');
      
      const activeFilters = criteria.mapFilters?.filter(f => f.value && f.value.length > 0) || [];

      try {
        // Check if request was cancelled
        if (abortController.signal.aborted) {
          perfLog.log('FetchProjectsForMap', 'Request cancelled');
          return { projects: [], error: 'Request cancelled' };
        }

        const { query: searchQuery, actionId, citySlug, priorityProjectIds = [], mapFilters = [] } = criteria;

        // --- Part 1: Fetch Priority Projects ---
        let priorityProjects: MapProjectData[] = [];
        const validPriorityIds = priorityProjectIds.filter(id => id);

        if (validPriorityIds.length > 0) {
          const priorityFetchStart = performance.now();
          perfLog.log('FetchProjectsForMap', 'Fetching priority projects', undefined, validPriorityIds.length);
          
          let priorityQuery = supabaseServer
            .from('projects')
            .select('id, title, slug, latitude, longitude, status, city_slug, neighborhood_slug')
            .in('id', validPriorityIds)
            .not('latitude', 'is', null)
            .not('longitude', 'is', null)
            .eq('has_articles', true); // PERFORMANCE FIX: Only get projects with articles

          priorityQuery = applySupabaseFilters(priorityQuery, activeFilters);

          const { data: priorityData, error: priorityError } = await priorityQuery;

          const priorityFetchTime = performance.now() - priorityFetchStart;
          perfLog.log('FetchProjectsForMap', 'Priority projects fetch completed', priorityFetchTime, {
            requestedCount: validPriorityIds.length,
            returnedCount: priorityData?.length || 0,
            hasError: !!priorityError
          });

          if (priorityError) {
            perfLog.error('FetchProjectsForMap', 'Error fetching priority projects', priorityError);
          } else if (priorityData) {
            priorityProjects = (priorityData || []) as MapProjectData[];
          }
        } else {
          perfLog.log('FetchProjectsForMap', 'No priority projects to fetch');
        }

        // Check if request was cancelled after priority fetch
        if (abortController.signal.aborted) {
          perfLog.log('FetchProjectsForMap', 'Request cancelled after priority fetch');
          return { projects: [], error: 'Request cancelled' };
        }

        // --- Part 2: Fetch Remaining Recent Projects ---
        let recentProjects: MapProjectData[] = [];

        const recentFetchStart = performance.now();
        perfLog.log('FetchProjectsForMap', 'Fetching recent projects...');
        
        // Always try to fetch recent projects
        const daysAgo = 90;
        const cutoffDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();

        let recentQuery = supabaseServer
          .from('projects')
          .select('id, title, slug, latitude, longitude, status, city_slug, neighborhood_slug')
          .not('status', 'is', null)
          .not('latitude', 'is', null)
          .not('longitude', 'is', null)
          .eq('has_articles', true); // PERFORMANCE FIX: Only get projects with articles

        // Apply Main Criteria Filters
        if (citySlug) {
          recentQuery = recentQuery.eq('city_slug', citySlug);
          perfLog.log('FetchProjectsForMap', 'Applied city filter', undefined, citySlug);
        }
        if (searchQuery) {
          const searchTerm = `%${searchQuery}%`;
          recentQuery = recentQuery.or(`title.ilike.${searchTerm},description.ilike.${searchTerm},address.ilike.${searchTerm}`);
          perfLog.log('FetchProjectsForMap', 'Applied search filter', undefined, searchQuery);
        } else if (actionId) {
          switch (actionId) {
            case '1': recentQuery = recentQuery.in('status', ['completed', 'approved', 'under_construction']).gte('updated_at', cutoffDate); break;
            case '2': recentQuery = recentQuery.eq('status', 'under_construction'); break;
            case '3': const transitTerm = `%transit%`; recentQuery = recentQuery.or(`title.ilike.${transitTerm},description.ilike.${transitTerm}`); break;
            default: break;
          }
          perfLog.log('FetchProjectsForMap', 'Applied action filter', undefined, actionId);
        }

        // Apply Map Filters to Recent Query
        recentQuery = applySupabaseFilters(recentQuery, activeFilters);

        // Exclude priority project IDs already fetched
        if (priorityProjects.length > 0) {
          const priorityIds = priorityProjects.map(p => p.id);
          recentQuery = recentQuery.not('id', 'in', `(${priorityIds.join(',')})`);
          perfLog.log('FetchProjectsForMap', 'Excluded priority IDs', undefined, { count: priorityIds.length });
        }

        // Add sorting for remaining (no limit applied here anymore)
        recentQuery = recentQuery.order('updated_at', { ascending: false });

        // Apply limit based on fetchMode for better performance
        if (fetchMode === 'initial') {
          recentQuery = recentQuery.limit(INITIAL_FETCH_PROJECT_LIMIT);
          perfLog.log('FetchProjectsForMap', 'Applied initial fetch limit', undefined, INITIAL_FETCH_PROJECT_LIMIT);
        }

        const { data: recentData, error: recentError } = await recentQuery;

        const recentFetchTime = performance.now() - recentFetchStart;
        perfLog.log('FetchProjectsForMap', 'Recent projects fetch completed', recentFetchTime, {
          returnedCount: recentData?.length || 0,
          hasError: !!recentError,
          fetchMode
        });

        if (recentFetchTime > 1500) {
          perfLog.warn('FetchProjectsForMap', 'SLOW RECENT PROJECTS FETCH DETECTED', recentFetchTime);
        }

        if (recentError) {
          perfLog.error('FetchProjectsForMap', 'Error fetching recent projects', recentError);
        } else if (recentData) {
          recentProjects = (recentData || []) as MapProjectData[];
        }

        // Check if request was cancelled after recent fetch
        if (abortController.signal.aborted) {
          perfLog.log('FetchProjectsForMap', 'Request cancelled after recent fetch');
          return { projects: [], error: 'Request cancelled' };
        }

        // --- Part 3: Combine and Final Result ---
        const combineStart = performance.now();
        const finalProjectMap = new Map<string, MapProjectData>();
        priorityProjects.forEach(p => finalProjectMap.set(p.id, p));
        recentProjects.forEach(p => finalProjectMap.set(p.id, p));

        let combinedProjects = Array.from(finalProjectMap.values());
        perfLog.log('FetchProjectsForMap', 'Project combination completed', performance.now() - combineStart, {
          priorityCount: priorityProjects.length,
          recentCount: recentProjects.length,
          combinedCount: combinedProjects.length
        });

        // PERFORMANCE FIX: Article link filtering eliminated!
        // We now use has_articles=true in the initial query, so all projects already have articles
        perfLog.log('FetchProjectsForMap', 'Article link filtering skipped - using has_articles column', 0, {
          projectCount: combinedProjects.length
        });

        const totalDbTime = dbTimer.end({
          finalProjectCount: combinedProjects.length
        });

        return { projects: combinedProjects };

      } catch (e: any) {
        perfLog.error('FetchProjectsForMap', 'Unexpected error', e);
        return { projects: [], error: e.message || 'Failed to fetch projects for map.' };
      }
    },
    {
      ttl: 5 * 60, // Cache for 5 minutes (adjust as needed)
      edge: true,
      local: true,
    }
  );

  // Store the request promise in the activeRequests map
  activeRequests.set(safeCacheKey, requestPromise);

  return requestPromise.then(result => {
    const totalTime = performance.now() - startTime;
    perfLog.log('FetchProjectsForMap', 'Total operation completed', totalTime, {
      projectCount: result.projects?.length || 0,
      hasError: !!result.error,
      citySlug
    });
    
    if (totalTime > 2000) {
      perfLog.warn('FetchProjectsForMap', 'SLOW TOTAL OPERATION DETECTED', totalTime);
    }
    
    // Clean up the active request and abort controller
    activeRequests.delete(safeCacheKey);
    abortControllers.delete(safeCacheKey);
    
    return result;
  }).catch(error => {
    // Clean up the active request and abort controller on error as well
    activeRequests.delete(safeCacheKey);
    abortControllers.delete(safeCacheKey);
    throw error;
  });
}

export async function fetchFilteredProjectIds(
  criteria: {
    citySlug?: string | null;
    mapFilters?: Filter[];
  } = {}
): Promise<string[] | null> {
  const { citySlug, mapFilters = [] } = criteria;
  const activeFilters = mapFilters.filter(f => f.value && f.value.length > 0);

  // If no active filters, no need to filter IDs (return null so no filtering is applied)
  if (activeFilters.length === 0) {
    return null;
  }

  try {
    let query = supabaseServer
      .from('projects')
      .select('id') // Select only the ID
      .eq('has_articles', true); // PERFORMANCE FIX: Only get projects with articles

    // Apply city filter if provided
    if (citySlug) {
      query = query.eq('city_slug', citySlug);
    }

    // Apply map filters using the helper
    query = applySupabaseFilters(query, activeFilters);
    
    const { data, error } = await query;

    if (error) {
      perfLog.error('FetchFilteredProjectIds', 'Error fetching project IDs', error);
      return []; // Return empty array on error (this will show no posts)
    }

    const projectIdsWithArticles = (data || []).map(p => p.id);
    
    perfLog.log('FetchFilteredProjectIds', 'Projects with articles fetched', undefined, {
      projectCount: projectIdsWithArticles.length
    });

    return projectIdsWithArticles;

  } catch (e: any) {
    perfLog.error('FetchFilteredProjectIds', 'Unexpected error', e);
    return []; // Return empty array on error
  }
}

// Helper Function to Apply Supabase Filters
function applySupabaseFilters<T extends Record<string, any>>(query: any, filters: Filter[]): any {
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
        perfLog.warn('MapFilters', 'Unknown ProjectStatus value', undefined, status);
        return null;
    }
  };

  filters.forEach(filter => {
    // Ensure filter.value is always an array
    const rawValues = Array.isArray(filter.value) ? filter.value : [filter.value].filter(v => v !== null && v !== undefined);
    if (rawValues.length === 0) {
      return; // Skip if no valid values
    }

    let columnName: string | null = null;
    let dbValues: (string | number | boolean)[] = [];

    // Map FilterType to Supabase column name and transform values if necessary
    switch (filter.type) {
      case "Project Status":
        columnName = 'status';
        // Map status values to DB format
        dbValues = rawValues.map(projectStatusToDbValue).filter((v): v is string => v !== null);
        break;
      case "Property Type":
        columnName = 'uses';
        // Normalize property type values to lowercase to match database storage
        const normalizedValues = rawValues.map(v => v.toLowerCase());
        // Handle array of text in 'uses' column using array operations
        const pgArray = `{${normalizedValues.map(v => `"${v}"`).join(',')}}`;

        switch (filter.operator) {
          case "is":
          case "is any of":
            // Use PostgreSQL array overlap operator (&&) via filter method
            modifiedQuery = modifiedQuery.filter(columnName, 'ov', pgArray);
            break;
          case "is not":
            // Use NOT with array overlap to exclude projects with any of the specified values
            modifiedQuery = modifiedQuery.not(columnName, 'ov', pgArray);
            break;
          default:
            perfLog.warn('MapFilters', 'Unsupported operator for Property Type filter', undefined, filter.operator);
        }
        return; // Go to next filter
      default:
        perfLog.warn('MapFilters', 'Unsupported filter type received', undefined, filter.type);
        return;
    }

    if (!columnName || dbValues.length === 0) {
      return;
    }

    // Apply generic filter logic for types other than Property Type
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
        perfLog.warn('MapFilters', 'Unsupported filter operator received', undefined, { operator: filter.operator, type: filter.type });
        break;
    }
  });

  return modifiedQuery;
}

export async function fetchFirstProjectImageById(projectId: string): Promise<string | null> {
  try {
    // Query Supabase articles for the project
    const { data: articles, error } = await supabaseServer
      .from('articles')
      .select('images')
      .eq('supabase_project_id', projectId)
      .not('images', 'is', null)
      .not('published_at', 'is', null)
      .order('published_at', { ascending: false })
      .limit(1);

    if (error) {
      perfLog.error('FetchProjectImage', 'Error querying articles for project', { projectId, error });
      return null;
    }

    if (!articles || articles.length === 0) {
      return null;
    }

    const article = articles[0];
    const images = article.images;

    if (!images || !Array.isArray(images) || images.length === 0) {
      return null;
    }

    // Find the first image URL
    const firstImage = images[0];
    const imageUrl = typeof firstImage === 'string' ? firstImage : firstImage?.url || null;

    return imageUrl;

  } catch (error) {
    console.error(`[fetchFirstProjectImageById] Error fetching image for project ${projectId}:`, error);
    return null;
  }
} 