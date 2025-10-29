import { useCallback, useRef, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import { useHomeStore } from '../store/home-store';
import { useUIStore, useModalStore, useCityStore } from '../store';
import type { Post } from '@/features/posts/types';
import type { City } from '@/features/map/types';
import { MapProjectData } from '@/features/map';
import { getPostUrl } from '@/lib/utils';
import va from '@vercel/analytics';
import { fetchClientLayoutData } from '@/features/posts';
import { fetchLayoutDataByProjectId } from '@/features/projects';

interface UseHomeProps {
  cities: City[];
  initialPosts?: Post[];
  initialTotal?: number;
}

/**
 * Main home page hook that consolidates all functionality
 * Uses only Zustand stores, eliminates redundant state, optimizes performance
 */
export function useHome({
  cities,
  initialPosts,
  initialTotal,
}: UseHomeProps) {
  
  // === SINGLE SOURCE OF TRUTH: Only Zustand stores ===
  const homeStore = useHomeStore();
  const uiStore = useUIStore();
  const modalStore = useModalStore();
  const cityStore = useCityStore();

  // === DATA FETCHING LOGIC (now inside the hook) ===
  const loadModalPostData = useCallback(async (post: Post) => {
    if (!post?.slug || !post?.city_name) {
      modalStore.setModalError("Could not load post details. Missing required information.");
      modalStore.setIsModalLoading(false);
      return;
    }
    modalStore.setIsModalLoading(true);
    modalStore.setModalError(null);
    modalStore.setModalPostData(null);
    try {
      const layoutData = await fetchClientLayoutData({ postSlug: post.slug, cityName: post.city_name });
      if (!layoutData?.post) throw new Error("Post data not found.");
      modalStore.setModalPostData(layoutData);
    } catch (error: any) {
      modalStore.setModalError(`Failed to load post: ${error.message || 'Unknown error'}`);
    } finally {
      modalStore.setIsModalLoading(false);
    }
  }, [modalStore]);

  const loadProjectModalData = useCallback(async (projectId: string, originalUrl: string) => {
    if (!projectId) {
      modalStore.setProjectModalError("Could not load project details. Missing required information.");
      modalStore.setIsProjectModalLoading(false);
      return;
    }
    modalStore.setIsProjectModalLoading(true);
    modalStore.setProjectModalError(null);
    modalStore.setProjectModalData(null);
    try {
      const layoutData = await fetchLayoutDataByProjectId(projectId);
      if (!layoutData?.post || !layoutData?.project) throw new Error(`Failed to load full layout data for project ID '${projectId}'.`);
      
      modalStore.setProjectModalData(layoutData);
      const postForUrl = layoutData.post;
      const citySlug = postForUrl.city_name;
      const neighborhoodSlug = postForUrl.neighborhood_name;
      const postSlug = postForUrl.slug;
      if (citySlug && postSlug) {
        const modalUrl = new URL(window.location.href);
        modalUrl.searchParams.set('post', postSlug);
        if (citySlug) modalUrl.searchParams.set('city', citySlug);
        if (neighborhoodSlug) modalUrl.searchParams.set('neighborhood', neighborhoodSlug);
        const newUrl = modalUrl.toString();
        const title = layoutData.project?.title || postForUrl.title || '';
        if (window.location.href !== newUrl) {
          window.history.pushState({ modalWasOpened: true, originalUrl, type: 'project', id: projectId, postSlug, citySlug, neighborhoodSlug }, title, newUrl);
        }
      }
    } catch (error: any) {
      modalStore.setProjectModalError(`Failed to load project details: ${error.message || "Unknown error"}`);
    } finally {
      modalStore.setIsProjectModalLoading(false);
    }
  }, [modalStore]);

  // === INITIAL DATA HYDRATION ===
  useEffect(() => {
    if (initialPosts && initialPosts.length > 0) {
      // Only set initial posts if the store is empty to avoid overwriting
      if (homeStore.allPosts.length === 0) {
        homeStore.setAllPosts(initialPosts);
        // Assuming a total count could also be passed or needs to be set
        // For now, we'll set it based on the initial posts length
        homeStore.setInitialTotalCount(initialTotal || initialPosts.length);
      }
    }
  }, [initialPosts, initialTotal, homeStore]);

  // === PERFORMANCE REFS (only where actually needed) ===
  const cityMapRef = useRef<Map<string, City>>(new Map());

  // === MEMOIZED CITY LOOKUP (expensive operation) ===
  const cityMap = useMemo(() => {
    if (cityMapRef.current.size !== cities.length) {
      cityMapRef.current = new Map(cities.map(city => [city.slug, city]));
    }
    return cityMapRef.current;
  }, [cities]);

  // === COMPUTED VALUES (derived state, no additional storage) ===
  const displayedPosts = homeStore.getDisplayedPosts();
  const canLoadMore = homeStore.getCanLoadMore();
  
  const priorityProjectIds = useMemo(() => {
    return displayedPosts
      .map(post => post.supabase_project_id)
      .filter((id): id is string => !!id);
  }, [displayedPosts]);

  const sectionTitle = useMemo(() => {
    const { displayMode, currentSearch } = homeStore;
    const { selectedCity } = cityStore;
    
    if (displayMode === 'search' && currentSearch) {
      let title = `Search Results for "${currentSearch}"`;
      if (selectedCity) {
        const cityName = cityMap.get(selectedCity)?.name;
        if (cityName) title += ` in ${cityName}`;
      }
      return title;
    }
    
    if (displayMode === 'action' && currentSearch) {
      let title = currentSearch;
      if (selectedCity) {
        const cityName = cityMap.get(selectedCity)?.name;
        if (cityName) title += ` in ${cityName}`;
      }
      return title;
    }
    
    if (selectedCity) {
      return cityMap.get(selectedCity)?.name || "Latest Updates";
    }
    
    return "Latest Updates";
  }, [homeStore.displayMode, homeStore.currentSearch, cityStore.selectedCity, cityMap]);

  // === EVENT HANDLERS (now with stable dependencies) ===
  const handlePostCardClick = useCallback((post: Post) => {
    const { slug, city_name, neighborhood_name, id, title } = post;
    if (!slug || !city_name) {
      console.error("Post is missing necessary slug information", post);
      toast.error("Cannot open post details.");
      return;
    }

    // Use query parameters instead of path changes to prevent Next.js route navigation
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('post', slug);
    currentUrl.searchParams.set('city', city_name);
    if (neighborhood_name) {
      currentUrl.searchParams.set('neighborhood', neighborhood_name);
    }
    
    const newUrl = currentUrl.toString();
    
    // Store the original URL for when modal closes
    const originalUrl = window.location.href;

    // Only push state if the URL is different to avoid duplicate history entries
    if (window.location.href !== newUrl) {
      window.history.pushState(
        { 
          modalWasOpened: true, 
          originalUrl: originalUrl, 
          type: 'post', 
          id 
        },
        title || '',
        newUrl
      );
    }

    modalStore.setSelectedPostForModal(post);
    modalStore.setShowPostModal(true);
    loadModalPostData(post);
    document.body.style.overflow = 'hidden';
    
    va.track('View Post', {
      postId: id,
      postSlug: slug,
      citySlug: city_name,
      ...(neighborhood_name && { neighborhoodSlug: neighborhood_name }),
    });
  }, [loadModalPostData, modalStore]);

  const handleViewProjectClick = useCallback((project: MapProjectData) => {
    if (!project?.id) {
      console.error("Cannot open project modal: Clicked project is missing ID", project);
      toast.error("Could not open project details.");
      return;
    }

    const originalUrl = window.location.href;
    // The URL for project modals is handled inside `loadProjectModalData`
    // because it depends on data that is fetched asynchronously.
    loadProjectModalData(project.id, originalUrl);
    
    modalStore.setShowProjectModal(true);

    va.track('View Project', {
      projectId: project.id,
      projectTitle: project.title,
      ...(cityStore.selectedCity && { citySlug: cityStore.selectedCity }),
    });

    document.body.style.overflow = 'hidden';
  }, [loadProjectModalData, modalStore, cityStore.selectedCity]);

  const handleCloseModal = useCallback(() => {
    if (!modalStore.showPostModal) return;
    
    const state = window.history.state;
    
    // Close the modal state first
    modalStore.setShowPostModal(false);
    modalStore.setSelectedPostForModal(null);
    modalStore.setModalPostData(null);
    modalStore.setModalError(null);
    document.body.style.overflow = '';
    
    // Handle URL navigation
    if (state?.modalWasOpened && state?.originalUrl) {
      // If we have a clean original URL, navigate to it
      if (window.location.href !== state.originalUrl) {
        window.history.pushState({}, '', state.originalUrl);
      }
    } else {
      // Fallback: clear any modal-related params
      const url = new URL(window.location.href);
      let hasChanges = false;
      
      if (url.searchParams.has('post')) {
        url.searchParams.delete('post');
        hasChanges = true;
      }
      if (url.searchParams.has('city')) {
        url.searchParams.delete('city');
        hasChanges = true;
      }
      if (url.searchParams.has('neighborhood')) {
        url.searchParams.delete('neighborhood');
        hasChanges = true;
      }
      
      if (hasChanges) {
        window.history.pushState({}, '', url.pathname + url.search);
      }
    }
  }, [modalStore]);

  const handleCloseProjectModal = useCallback(() => {
    if (!modalStore.showProjectModal) return;
    
    const state = window.history.state;
    
    // Close the modal state first
    modalStore.setShowProjectModal(false);
    modalStore.setProjectModalData(null);
    modalStore.setProjectModalError(null);
    document.body.style.overflow = '';
    
    // Handle URL navigation
    if (state?.modalWasOpened && state?.originalUrl) {
      // If we have a clean original URL, navigate to it
      if (window.location.href !== state.originalUrl) {
        window.history.pushState({}, '', state.originalUrl);
      }
    } else {
      // Fallback: clear any modal-related params
      const url = new URL(window.location.href);
      let hasChanges = false;
      
      if (url.searchParams.has('post')) {
        url.searchParams.delete('post');
        hasChanges = true;
      }
      if (url.searchParams.has('city')) {
        url.searchParams.delete('city');
        hasChanges = true;
      }
      if (url.searchParams.has('neighborhood')) {
        url.searchParams.delete('neighborhood');
        hasChanges = true;
      }
      
      if (hasChanges) {
        window.history.pushState({}, '', url.pathname + url.search);
      }
    }
  }, [modalStore]);

  // === UTILITY FUNCTIONS ===
  const getCityName = useCallback((citySlug: string | null): string | null => {
    if (!citySlug) return null;
    return cityMap.get(citySlug)?.name || null;
  }, [cityMap]);

  const scrollToTop = useCallback((container?: HTMLDivElement | null) => {
    if (container) {
      container.scrollTop = 0;
    } else if (typeof window !== 'undefined') {
      window.scrollTo(0, 0);
    }
  }, []);

  // === RETURN STABLE API (memoized) ===
  return useMemo(() => ({
    // Store state and actions (direct access, no duplication)
    homeStore,
    uiStore,
    modalStore,
    cityStore,
    
    // Computed values
    displayedPosts,
    canLoadMore,
    priorityProjectIds,
    sectionTitle,
    
    // Event handlers and data loaders
    loadModalPostData,
    loadProjectModalData,
    handlePostCardClick,
    handleViewProjectClick,
    handleCloseModal,
    handleCloseProjectModal,
    
    // Utility functions
    getCityName,
    scrollToTop,
  }), [
    homeStore, uiStore, modalStore, cityStore,
    displayedPosts, canLoadMore, priorityProjectIds, sectionTitle,
    loadModalPostData, loadProjectModalData, handlePostCardClick, 
    handleViewProjectClick, handleCloseModal, handleCloseProjectModal,
    getCityName, scrollToTop
  ]);
} 