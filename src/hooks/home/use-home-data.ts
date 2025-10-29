import { useCallback, useRef, useTransition, startTransition } from 'react';
import { toast } from 'sonner';
import { useHomeStore } from '../store/home-store';
import { useCityStore, useUIStore } from '../store';
import { 
  fetchArticles, 
  searchArticles, 
  fetchRecentDevelopments, 
  fetchConstructionUpdates 
} from '@/features/posts';
import { fetchFilteredProjectIds } from '@/features/map';
import type { City } from '@/features/map/types';
import { Filter } from '@/shared/ui/filters';
import va from '@vercel/analytics';
import { perfLog } from '@/lib/utils/performance-monitor-client';
import { useMemo } from 'react';

interface UseHomeDataProps {
  cities: City[];
  postsPerPage: number;
}

// Request deduplication and cancellation for data hooks
const activeDataRequests = new Map<string, AbortController>();

// Cleanup function to prevent memory leaks
const cleanupCompletedRequests = () => {
  const keysToDelete: string[] = [];
  activeDataRequests.forEach((controller, key) => {
    if (controller.signal.aborted) {
      keysToDelete.push(key);
    }
  });
  keysToDelete.forEach(key => activeDataRequests.delete(key));
  
  if (keysToDelete.length > 0) {
    perfLog.log('RequestCleanup', 'Cleaned up completed requests', undefined, { count: keysToDelete.length });
  }
};

// Run cleanup every 30 seconds
if (typeof window !== 'undefined') {
  setInterval(cleanupCompletedRequests, 30000);
}

/**
 * Handles all data fetching operations for the home page
 * Centralized, clean, and efficient data management
 */
export function useHomeData({ cities, postsPerPage }: UseHomeDataProps) {
  const homeStore = useHomeStore();
  const cityStore = useCityStore();
  const uiStore = useUIStore();
  
  // Add React 18 concurrent features
  const [isPending, startTransition] = useTransition();
  
  // Prevent duplicate fetches
  const recentFetchRef = useRef<{
    citySlug: string | null;
    timestamp: number;
    filteredIds?: string[] | null;
  } | null>(null);

  // Add request caching for better performance
  const requestCache = useRef(new Map<string, Promise<any>>());

  // === UTILITY: Convert city slug to name ===
  const getCityNameFromSlug = useCallback((citySlug: string | null): string | undefined => {
    if (!citySlug) return undefined;
    return cities.find(c => c.slug === citySlug)?.name;
  }, [cities]);

  // === UTILITY: Get filtered project IDs ===
  const getFilteredProjectIds = useCallback(async (citySlug: string | null): Promise<string[] | null> => {
    const activeFilters = uiStore.mapFilters.filter(f => f.value && f.value.length > 0);
    
    perfLog.log('GetFilteredProjectIds', 'Starting', undefined, {
      citySlug,
      activeFiltersCount: activeFilters.length,
      totalFilters: uiStore.mapFilters.length,
      timestamp: new Date().toISOString()
    });
    
    if (activeFilters.length === 0) {
      perfLog.log('GetFilteredProjectIds', 'No active filters - returning null');
      return null;
    }

    // Add caching for filtered project IDs
    const cacheKey = `filtered-idsV1:${citySlug}:${JSON.stringify(activeFilters.map(f => ({ type: f.type, value: f.value })))}`;
    if (requestCache.current.has(cacheKey)) {
      perfLog.log('GetFilteredProjectIds', 'Returning cached result');
      return requestCache.current.get(cacheKey);
    }

    const timer = perfLog.time('GetFilteredProjectIds', 'Fetching filtered project IDs');
    try {
      const resultPromise = fetchFilteredProjectIds({
        citySlug,
        mapFilters: activeFilters,
      });
      
      // Cache the promise
      requestCache.current.set(cacheKey, resultPromise);
      
      const result = await resultPromise;
      
      timer.end({
        resultCount: result?.length || 0,
        isArray: Array.isArray(result)
      });
      
      // Clear cache after 30 seconds
      setTimeout(() => requestCache.current.delete(cacheKey), 30000);
      
      return result;
    } catch (error) {
      requestCache.current.delete(cacheKey);
      perfLog.error('GetFilteredProjectIds', 'Error', error);
      return null;
    }
  }, [uiStore.mapFilters]);

  // === MAIN DATA FETCHER: City data (OPTIMIZED) ===
  const fetchCityData = useCallback(async (
    citySlug: string | null, 
    filteredIds?: string[] | null
  ) => {
    const timer = perfLog.time('FetchCityData', 'Starting fetch');
    perfLog.log('FetchCityData', 'Starting fetch', undefined, {
      citySlug,
      filteredIdsCount: filteredIds?.length || 0,
      hasFilteredIds: !!filteredIds,
      timestamp: new Date().toISOString(),
      activeRequestsCount: activeDataRequests.size
    });

    // Create unique request key for deduplication
    const requestKey = `fetchCityData:${citySlug}:${filteredIds?.slice(0, 10).join(',') || 'none'}...`;
    
    // Enhanced request deduplication
    if (activeDataRequests.has(requestKey)) {
      const existingController = activeDataRequests.get(requestKey);
      if (existingController && !existingController.signal.aborted) {
        perfLog.log('FetchCityData', 'Similar request already in progress, waiting for completion', undefined, {
          requestKey: requestKey.substring(0, 50) + '...',
          activeRequestsCount: activeDataRequests.size
        });
        
        // Wait for the existing request instead of starting a new one
        try {
          await new Promise((resolve) => {
            const checkComplete = () => {
              if (!activeDataRequests.has(requestKey)) {
                resolve(undefined);
              } else {
                setTimeout(checkComplete, 50);
              }
            };
            checkComplete();
          });
          return;
        } catch (error) {
          // If waiting fails, continue with new request
        }
      } else {
        perfLog.log('FetchCityData', 'Cleaning up completed request', undefined, { 
          requestKey: requestKey.substring(0, 30) + '...' 
        });
        activeDataRequests.delete(requestKey);
      }
    }

    // Check for very recent duplicate calls (reduced to 100ms for better responsiveness)
    const now = Date.now();
    const recentFetch = recentFetchRef.current;
    if (recentFetch && 
        recentFetch.citySlug === citySlug && 
        JSON.stringify(recentFetch.filteredIds) === JSON.stringify(filteredIds) &&
        now - recentFetch.timestamp < 100) {
      perfLog.log('FetchCityData', 'Skipping very recent duplicate call (within 100ms)');
      return;
    }

    // Update recent fetch tracking
    recentFetchRef.current = { citySlug, timestamp: now, filteredIds };

    // Create abort controller for this request
    const abortController = new AbortController();
    activeDataRequests.set(requestKey, abortController);

    perfLog.log('FetchCityData', 'Starting legitimate request', undefined, {
      requestKey: requestKey.substring(0, 50) + '...',
      activeRequestsCount: activeDataRequests.size,
      timeSinceLastFetch: recentFetch ? now - recentFetch.timestamp : 'N/A'
    });

    try {
      // Use React 18 concurrent features for non-blocking updates
      startTransition(() => {
        const loadingTimer = perfLog.time('FetchCityData', 'Set loading state');
        homeStore.setIsLoading(true);
        loadingTimer.end();
      });
      
      // Check if request was cancelled only at critical points
      if (abortController.signal.aborted) {
        perfLog.log('FetchCityData', 'Request cancelled early');
        return;
      }
      
      // Optimized state management - only reset what's necessary
      const stateTimer = perfLog.time('FetchCityData', 'State analysis');
      const currentDisplayMode = homeStore.displayMode;
      const currentCity = cityStore.selectedCity;
      perfLog.log('FetchCityData', 'Current state', undefined, { currentDisplayMode, currentCity, newCity: citySlug });
      
      // Smart state reset - use concurrent features to avoid blocking
      startTransition(() => {
        if (currentDisplayMode === 'initial' && currentCity !== citySlug) {
          const partialResetTimer = perfLog.time('FetchCityData', 'Partial reset (posts only)');
          // Only reset the posts, keep other state for faster transitions
          homeStore.setAllPosts([]);
          homeStore.setInitialTotalCount(0);
          homeStore.setPaginationCursors(null, null);
          partialResetTimer.end();
        } else if (currentDisplayMode !== 'initial') {
          const fullResetTimer = perfLog.time('FetchCityData', 'Full reset');
          // Full reset only when changing modes
          homeStore.resetAll();
          fullResetTimer.end();
        } else {
          perfLog.log('FetchCityData', 'No reset needed - optimizing for speed');
        }
      });
      stateTimer.end();
      
      const modeTimer = perfLog.time('FetchCityData', 'Display mode set');
      homeStore.setDisplayMode('initial');
      modeTimer.end();
      
      // Optimize city name lookup with caching
      const cityNameTimer = perfLog.time('FetchCityData', 'City name lookup');
      const cityName = getCityNameFromSlug(citySlug);
      cityNameTimer.end({ cityName });
      
      // Check if request was cancelled before API call
      if (abortController.signal.aborted) {
        perfLog.log('FetchCityData', 'Request cancelled before API call');
        return;
      }
      
      // Add API call caching for better performance
      const apiCacheKey = `articlesV1:${cityName}:${postsPerPage}:${filteredIds?.slice(0, 5).join(',') || 'none'}`;
      let apiResult;
      
      if (requestCache.current.has(apiCacheKey)) {
        perfLog.log('FetchCityData', 'Using cached API result');
        apiResult = await requestCache.current.get(apiCacheKey);
      } else {
        const apiTimer = perfLog.time('FetchCityData', 'API call to fetchArticles');
        perfLog.log('FetchCityData', 'Starting API call to fetchArticles', undefined, {
          limit: postsPerPage,
          cityName,
          filteredIdsCount: filteredIds?.length || 0
        });
        
        // Create and cache the API promise
        const apiPromise = fetchArticles({
          limit: postsPerPage,
          cityName,
          supabaseProjectIds: filteredIds || undefined,
        });
        
        requestCache.current.set(apiCacheKey, apiPromise);
        
        // Clear cache after 2 minutes
        setTimeout(() => requestCache.current.delete(apiCacheKey), 120000);
        
        apiResult = await apiPromise;
        
        const apiCallTime = apiTimer.end({
          postsCount: apiResult.posts?.length || 0,
          total: apiResult.total
        });
        
        if (apiCallTime && apiCallTime > 1000) {
          perfLog.warn('FetchCityData', 'SLOW API CALL DETECTED', apiCallTime);
        }
      }

      const { posts, total } = apiResult;
      
      // Check if request was cancelled before updating state
      if (abortController.signal.aborted) {
        perfLog.log('FetchCityData', 'Request cancelled before state update');
        return;
      }
      
      // Use concurrent features for state updates
      startTransition(() => {
        const stateUpdateTimer = perfLog.time('FetchCityData', 'State updates');
        if (posts && posts.length > 0) {
          homeStore.setAllPosts(posts);
          homeStore.setInitialTotalCount(total);
          
          // Set pagination cursors efficiently
          const lastPost = posts[posts.length - 1];
          if (lastPost?.id && lastPost.published_at) {
            homeStore.setPaginationCursors(lastPost.published_at, lastPost.id);
          }
          perfLog.log('FetchCityData', 'State updated with posts', undefined, {
            postsCount: posts.length,
            total,
            lastPostId: lastPost?.id
          });
        } else {
          homeStore.setAllPosts([]);
          homeStore.setInitialTotalCount(0);
          homeStore.setPaginationCursors(null, null);
          perfLog.log('FetchCityData', 'State updated with empty results');
        }
        stateUpdateTimer.end();
      });
      
    } catch (error: any) {
      perfLog.error('FetchCityData', 'Error fetching city data', error);
      
      // Don't show error toast for cancelled requests
      if (!abortController.signal.aborted) {
        toast.error("Failed to load posts for the selected city.");
      }
    } finally {
      const cleanupTimer = perfLog.time('FetchCityData', 'Cleanup');
      homeStore.setIsLoading(false);
      
      // Clean up the request tracking
      activeDataRequests.delete(requestKey);
      
      cleanupTimer.end();
      
      const totalTime = timer.end({ 
        citySlug,
        requestKey: requestKey.substring(0, 50) + '...',
        wasSuccessful: !abortController.signal.aborted
      });
      
      if (totalTime && totalTime > 1000) {
        perfLog.warn('FetchCityData', 'SLOW FETCH DETECTED', totalTime);
      }
    }
  }, [cities, postsPerPage, homeStore, getCityNameFromSlug, cityStore.selectedCity]);

  // === SEARCH DATA FETCHER ===
  const fetchSearchData = useCallback(async (
    query: string, 
    citySlug: string | null,
    filteredIds?: string[] | null
  ) => {
    const requestKey = `fetchSearchData:${query}:${citySlug}:${filteredIds?.join(',') || 'none'}`;
    
    // Only cancel if there's a different search query in progress
    if (activeDataRequests.has(requestKey)) {
      const existingController = activeDataRequests.get(requestKey);
      if (existingController && !existingController.signal.aborted) {
        perfLog.log('FetchSearchData', 'Similar search already in progress, allowing it to continue');
        return;
      } else {
        activeDataRequests.delete(requestKey);
      }
    }

    const abortController = new AbortController();
    activeDataRequests.set(requestKey, abortController);

    try {
      homeStore.setIsLoading(true);
      homeStore.setIsSearching(true);
      
      // Check if request was cancelled
      if (abortController.signal.aborted) {
        perfLog.log('FetchSearchData', 'Request cancelled');
        return;
      }
      
      // Track search analytics
      va.track('Search Performed', {
        query,
        citySlug: citySlug || 'all',
      });
      
      const cityName = getCityNameFromSlug(citySlug);
      
      const { results, total } = await searchArticles(
        query,
        cityName,
        0,
        postsPerPage,
        filteredIds || undefined
      );
      
      // Check if request was cancelled before updating state
      if (abortController.signal.aborted) {
        perfLog.log('FetchSearchData', 'Request cancelled before state update');
        return;
      }
      
      homeStore.setDisplayMode('search');
      homeStore.setCurrentSearch(query);
      homeStore.setSearchResults(results);
      homeStore.setSearchTotalCount(total);
      homeStore.setCurrentActionId(null);
      
    } catch (error) {
      if (!abortController.signal.aborted) {
        console.error('Search failed:', error);
        toast.error("Failed to perform search.");
        homeStore.setSearchResults([]);
        homeStore.setSearchTotalCount(0);
      }
    } finally {
      homeStore.setIsSearching(false);
      homeStore.setIsLoading(false);
      activeDataRequests.delete(requestKey);
    }
  }, [homeStore, getCityNameFromSlug, postsPerPage]);

  // === ACTION DATA FETCHER ===
  const fetchActionData = useCallback(async (
    actionId: string,
    citySlug: string | null,
    activeFilters: Filter[]
  ) => {
    const requestKey = `fetchActionData:${actionId}:${citySlug}:${activeFilters.length}`;
    
    // Cancel any existing request for this action
    if (activeDataRequests.has(requestKey)) {
      const existingController = activeDataRequests.get(requestKey);
      if (existingController && !existingController.signal.aborted) {
        perfLog.log('FetchActionData', 'Cancelling existing action request', undefined, { requestKey });
        existingController.abort();
      }
      activeDataRequests.delete(requestKey);
    }

    const abortController = new AbortController();
    activeDataRequests.set(requestKey, abortController);

    try {
      homeStore.setIsLoading(true);
      
      // Check if request was cancelled
      if (abortController.signal.aborted) {
        perfLog.log('FetchActionData', 'Request cancelled');
        return;
      }
      
      let actionTitle = "";
      let fetchPromise: Promise<any>;
      
      switch (actionId) {
        case '1':
          actionTitle = "New Developments";
          fetchPromise = fetchRecentDevelopments({
            citySlug: citySlug || undefined,
            offset: 0,
            limit: postsPerPage,
            mapFilters: activeFilters
          });
          break;
        case '2':
          actionTitle = "Construction Updates";
          fetchPromise = fetchConstructionUpdates({
            citySlug: citySlug || undefined,
            offset: 0,
            limit: postsPerPage,
            mapFilters: activeFilters
          });
          break;
        default:
          throw new Error(`Unknown action: ${actionId}`);
      }
      
      const data = await fetchPromise;
      const results = data.posts || data.results || [];
      
      // Check if request was cancelled before updating state
      if (abortController.signal.aborted) {
        perfLog.log('FetchActionData', 'Request cancelled before state update');
        return;
      }
      
      homeStore.setDisplayMode('action');
      homeStore.setCurrentActionId(actionId);
      homeStore.setCurrentSearch(actionTitle);
      homeStore.setActionResults(results);
      homeStore.setActionTotalCount(data.total);
      homeStore.setSearchResults(null);
      homeStore.setSearchTotalCount(0);
      
    } catch (error) {
      if (!abortController.signal.aborted) {
        console.error('Action fetch failed:', error);
        toast.error("Failed to load results for the selected action.");
      }
    } finally {
      homeStore.setIsLoading(false);
      activeDataRequests.delete(requestKey);
    }
  }, [homeStore, postsPerPage]);

  // === LOAD MORE: Initial posts ===
  const loadMoreInitial = useCallback(async () => {
    const { isLoadingMore, allPosts, lastPostPublishedAt, lastPostId } = homeStore;
    if (isLoadingMore || !lastPostPublishedAt || !lastPostId) return;

    try {
      homeStore.setIsLoadingMore(true);
      
      const filteredIds = await getFilteredProjectIds(cityStore.selectedCity);
      const cityName = getCityNameFromSlug(cityStore.selectedCity);
      
      const { posts } = await fetchArticles({
        limit: postsPerPage,
        cityName,
        lastPublishedAt: lastPostPublishedAt,
        lastId: lastPostId,
        supabaseProjectIds: filteredIds || undefined,
      });
      
      if (posts && posts.length > 0) {
        homeStore.appendToPosts(posts);
        const newLastPost = posts[posts.length - 1];
        if (newLastPost?.id && newLastPost.published_at) {
          homeStore.setPaginationCursors(newLastPost.published_at, newLastPost.id);
        }
      }
      
    } catch (error) {
      console.error('Load more failed:', error);
      toast.error("Failed to load more posts.");
    } finally {
      homeStore.setIsLoadingMore(false);
    }
  }, [homeStore, cityStore.selectedCity, getCityNameFromSlug, getFilteredProjectIds, postsPerPage]);

  const loadMoreSearch = useCallback(async () => {
    const { isLoadingMore, searchResults, currentSearch } = homeStore;
    if (isLoadingMore || !currentSearch || !searchResults) return;

    try {
      homeStore.setIsLoadingMore(true);
      
      const filteredIds = await getFilteredProjectIds(cityStore.selectedCity);
      const cityName = getCityNameFromSlug(cityStore.selectedCity);
      const offset = searchResults.length;
      
      const { results } = await searchArticles(
        currentSearch,
        cityName,
        offset,
        postsPerPage,
        filteredIds || undefined
      );
      
      if (results && results.length > 0) {
        homeStore.appendToSearchResults(results);
      }
      
    } catch (error) {
      console.error('Load more search failed:', error);
      toast.error("Failed to load more search results.");
    } finally {
      homeStore.setIsLoadingMore(false);
    }
  }, [homeStore, cityStore.selectedCity, getCityNameFromSlug, getFilteredProjectIds, postsPerPage]);

  const loadMoreAction = useCallback(async () => {
    const { isLoadingMore, actionResults, currentActionId } = homeStore;
    if (isLoadingMore || !currentActionId || !actionResults) return;

    try {
      homeStore.setIsLoadingMore(true);
      
      const activeFilters = uiStore.mapFilters.filter(f => f.value && f.value.length > 0);
      const offset = actionResults.length;
      
      let fetchPromise: Promise<any>;
      
      switch (currentActionId) {
        case '1':
          fetchPromise = fetchRecentDevelopments({
            citySlug: cityStore.selectedCity || undefined,
            offset,
            limit: postsPerPage,
            mapFilters: activeFilters
          });
          break;
        case '2':
          fetchPromise = fetchConstructionUpdates({
            citySlug: cityStore.selectedCity || undefined,
            offset,
            limit: postsPerPage,
            mapFilters: activeFilters
          });
          break;
        default:
          return;
      }
      
      const data = await fetchPromise;
      const results = data.posts || [];
      
      if (results.length > 0) {
        homeStore.appendToActionResults(results);
      }
      
    } catch (error) {
      console.error('Load more action failed:', error);
      toast.error("Failed to load more results.");
    } finally {
      homeStore.setIsLoadingMore(false);
    }
  }, [homeStore, cityStore.selectedCity, uiStore.mapFilters, postsPerPage]);

  // === PUBLIC API (memoized for stability) ===
  return useMemo(() => ({
    // Main data fetchers
    fetchCityData,
    fetchSearchData,
    fetchActionData,
    
    // Load more functions
    loadMoreInitial,
    loadMoreSearch,
    loadMoreAction,
    
    // Utilities
    getFilteredProjectIds,
    getCityNameFromSlug,
  }), [
    fetchCityData, fetchSearchData, fetchActionData,
    loadMoreInitial, loadMoreSearch, loadMoreAction,
    getFilteredProjectIds, getCityNameFromSlug
  ]);
} 