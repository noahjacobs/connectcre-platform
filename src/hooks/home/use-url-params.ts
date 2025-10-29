import { useEffect, useRef, useCallback } from 'react';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { MEMBERSHIP_PRICES } from '@/lib/utils/stripe-products';
import type { City } from '@/features/map/types';
import { useCityStore, useModalStore, useHomeStore } from '../store';
import { Post } from '@/features/posts';
import { getPostUrl } from '@/lib/utils';

interface UseUrlParamsProps {
  user: any;
  loading?: boolean;
  cities: City[];
  refreshSubscription: () => Promise<void>;
  refreshStatus: () => Promise<void>;
  handleCitySelect: (citySlug: string, filteredIds?: string[] | null) => void;
  loadModalPostData: (post: any) => Promise<void>;
  fetchPostBySlugAndCity: (slug: string, cityName: string) => Promise<any>;
  handleCloseModal: () => void;
  handleCloseProjectModal: () => void;
  handlePostCardClick: (post: Post) => void;
  initialLoadComplete: boolean;
}

export function useUrlParams({
  user,
  loading = false,
  cities,
  refreshSubscription,
  refreshStatus,
  handleCitySelect,
  loadModalPostData,
  fetchPostBySlugAndCity,
  handleCloseModal,
  handleCloseProjectModal,
  handlePostCardClick,
  initialLoadComplete,
}: UseUrlParamsProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  
  // Store hooks
  const { setSelectedCity, setIsCityDetermined } = useCityStore();
  const { 
    showPostModal,
    showProjectModal,
    showPersonaSelector,
    setShowSuccessDialog, 
    setSuccessDialogReason, 
    setSuccessDialogHadSubscription, 
    setIsUpsellDismissed,
    setShowPostModal,
    setSelectedPostForModal,
    setModalError: setModalErrorStore,
    setModalPostData: setModalPostDataStore,
    setIsModalLoading: setIsModalLoadingStore,
  } = useModalStore();

  const cityMap = new Map(cities.map(c => [c.slug, c.name]));

  // --- Ref for initialization ---
  const isInitialLoadRef = useRef(true);
  const hasHandledInitialUrl = useRef(false);

  const removeQueryParam = useCallback((paramName: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (params.has(paramName)) {
      params.delete(paramName);
      const newUrl = `${pathname}?${params.toString()}`;
      // Use replaceState to avoid adding to history
      window.history.replaceState({ ...window.history.state, as: newUrl, url: newUrl }, '', newUrl);
    }
  }, [pathname, searchParams]);

  // === HANDLE AUTH CODE PARAMETER (OAuth Mobile Safari Fix ONLY) ===
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    const code = params.get('code');
    const state = params.get('state');
    
    // ONLY handle OAuth flows (which have both code AND state)
    // Let Supabase handle magic links completely automatically
    if (code && state && pathname === '/') {
      // For OAuth (has state parameter) - redirect to callback for proper processing
      // This fixes mobile Safari issues where automatic processing doesn't work
      
      // Only redirect if user is not authenticated and auth is not loading
      if (!user?.id && !loading) {
        // Redirect to callback for OAuth processing
        const callbackUrl = new URL('/auth/callback', window.location.origin);
        callbackUrl.searchParams.set('code', code);
        callbackUrl.searchParams.set('state', state);
        
        // Preserve other auth-related parameters
        const returnTo = params.get('return_to');
        const plan = params.get('plan');
        const billing = params.get('billing');
        const type = params.get('type');
        
        if (returnTo) callbackUrl.searchParams.set('return_to', returnTo);
        if (plan) callbackUrl.searchParams.set('plan', plan);
        if (billing) callbackUrl.searchParams.set('billing', billing);
        if (type) callbackUrl.searchParams.set('type', type);
        
        // Redirect to callback for OAuth processing
        window.location.href = callbackUrl.toString();
        return;
      }
      
      // Clean up OAuth params if user is already authenticated
      if (user?.id) {
        const url = new URL(window.location.href);
        url.searchParams.delete('code');
        url.searchParams.delete('state');
        url.searchParams.delete('type');
        window.history.replaceState({}, '', url.toString());
      }
    }
  }, [searchParams, pathname, user?.id, loading]);

  // === HANDLE AUTH ERRORS ===
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    const authError = params.get('auth_error');
    
    if (authError) {
      console.error('Auth error from callback:', authError);
      toast.error('Authentication failed. Please try again.');
      removeQueryParam('auth_error');
    }
  }, [searchParams, removeQueryParam]);

  // --- Effect to handle one-time URL params like from Stripe/invites ---
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());

    // Stripe Checkout Success
    if (params.has('session_id')) {
      refreshSubscription().then(() => {
        setShowSuccessDialog(true);
        setSuccessDialogReason('subscription');
        removeQueryParam('session_id');
      }).catch(error => {
        console.error("Failed to refresh subscription:", error);
      });
      return; // Handle one at a time
    }

    // Invite Accepted
    if (params.get('invite_accepted') === 'true') {
      const hadExistingSub = params.get('had_subscription') === 'true';
      setSuccessDialogHadSubscription(hadExistingSub);
      
      // If persona selector is open, don't show success dialog immediately
      // Let the home-page.tsx queueing logic handle it after persona selector closes
      if (showPersonaSelector) {
        refreshStatus(); // Still refresh the status, but don't show dialog yet
        return;
      }
      
      // Show success dialog immediately if persona selector is not open
      refreshStatus().then(() => {
        setShowSuccessDialog(true);
        setSuccessDialogReason('invite');
        setIsUpsellDismissed(true);
        removeQueryParam('invite_accepted');
        removeQueryParam('had_subscription');
        removeQueryParam('company_id');
      });
      return; // Handle one at a time
    }
  }, [searchParams, refreshSubscription, refreshStatus, setShowSuccessDialog, setSuccessDialogReason, setSuccessDialogHadSubscription, setIsUpsellDismissed, removeQueryParam]);
  
  // --- Effect to handle pricing redirect ---
  useEffect(() => {
    // Only run if user is loaded
    if (!user?.id) {
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    const returnTo = params.get('return_to');
    const plan = params.get('plan');
    const billing = params.get('billing');

    if (returnTo === 'pricing' && plan && billing) {
      const priceId = MEMBERSHIP_PRICES.membership.year;

      if (priceId) {
        // Remove params before redirecting
        removeQueryParam('return_to');
        removeQueryParam('plan');
        removeQueryParam('billing');

        fetch('/api/create-checkout-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            priceId, 
            quantity: 1, 
            attributedCity: null, // You might want to get this from your city store
            attributedPost: null, 
            returnPath: '/' 
          }),
        })
        .then(response => response.json())
        .then(({ url }) => {
          if (url) {
            window.location.href = url; // Redirect to Stripe
          } else {
            toast.error('Failed to get checkout URL.');
          }
        })
        .catch(error => {
          console.error('Error creating checkout session:', error);
          toast.error('Failed to start checkout process');
        });
      } else {
        console.warn('Invalid plan/billing combination:', plan, billing);
        removeQueryParam('return_to');
        removeQueryParam('plan');
        removeQueryParam('billing');
      }
    }
  }, [searchParams, user?.id, removeQueryParam]);
  
  // --- Effect for initial city/post handling ---
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Don't handle URL params if modal is already open (prevents infinite loop)
    if (showPostModal || showProjectModal) return;

    const params = new URLSearchParams(searchParams.toString());
    const postSlugFromQuery = params.get('post');
    const citySlugFromQuery = params.get('city');
    
    // Allow handling if we have post params OR if this is the initial load
    const hasPostParams = postSlugFromQuery && citySlugFromQuery;
    
    // For post params, wait until initial load is complete to avoid interfering with map loading
    if (hasPostParams && !initialLoadComplete) return;
    
    // For path-based URLs (no query params), only handle on initial load
    if (!hasPostParams && hasHandledInitialUrl.current) return;

    const handleInitialUrl = async () => {
      // First, check for query parameter-based modal opening
      if (postSlugFromQuery && citySlugFromQuery) {
        // Handle query parameter-based post modal
        const cityName = cityMap.get(citySlugFromQuery) || citySlugFromQuery;
        
        try {
          const post = await fetchPostBySlugAndCity(postSlugFromQuery, cityName);
          if (post) {
            // Create clean URL for when modal closes, but don't apply it yet
            const cleanUrl = new URL(window.location.href);
            cleanUrl.searchParams.delete('post');
            cleanUrl.searchParams.delete('city');
            cleanUrl.searchParams.delete('neighborhood');
            const cleanUrlString = cleanUrl.pathname + (cleanUrl.search || '');
            
            // Keep the current URL but store what it should become when modal closes
            window.history.replaceState({ 
              modalWasOpened: true, 
              originalUrl: cleanUrlString, 
              type: 'post' 
            }, '', window.location.href); // Keep current URL
            
            // Set modal state using the store
            setSelectedPostForModal(post);
            setShowPostModal(true);
            setModalErrorStore(null);
            setModalPostDataStore(null);
            setIsModalLoadingStore(true);
            document.body.style.overflow = 'hidden';
            
            // Load the data and update the store
            try {
              await loadModalPostData(post);
            } catch (loadError) {
              console.error("Failed to load modal data:", loadError);
              setModalErrorStore("Failed to load post details");
            }
          }
        } catch (error) {
          console.error("Failed to fetch post from query params:", error);
        }
        return; // Exit early if we handled query params
      }

      // If no query params, check path-based URLs (only on initial load)
      if (!hasHandledInitialUrl.current) {
        hasHandledInitialUrl.current = true;
        
        const pathSegments = pathname.split('/').filter(Boolean);
        // Example path: /[city]/[neighborhood]/[postSlug] or /[city]/[postSlug]
        // We expect at least a city and a post slug.
        if (pathSegments.length >= 2) {
          const citySlug = pathSegments[0];
          const postSlug = pathSegments[pathSegments.length - 1];
          
          const cityName = cityMap.get(citySlug);

          if (cityName && fetchPostBySlugAndCity) {
            try {
              const post = await fetchPostBySlugAndCity(postSlug, cityName);
              if (post) {
                // This indicates we are loading a post page directly
                window.history.replaceState({ ...window.history.state, originalUrl: '/', type: 'post' }, '', window.location.href);
                handlePostCardClick(post);
              }
            } catch (error) {
              console.error("Failed to fetch initial post from URL:", error);
            }
          }
        }
      }
    };

    // Delay slightly to ensure other parts of the app are initialized
    const timer = setTimeout(handleInitialUrl, 100);
    return () => clearTimeout(timer);

  }, [pathname, searchParams, fetchPostBySlugAndCity, handlePostCardClick, cityMap, showPostModal, showProjectModal, initialLoadComplete]);
  
  
  // --- POPSTATE HANDLER: Main logic for back/forward navigation ---
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      // If a modal is open, close it when back button is pressed
      if (showPostModal) {
        handleCloseModal();
      } else if (showProjectModal) {
        handleCloseProjectModal();
      }
      // Let the browser handle the navigation normally
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [showPostModal, showProjectModal, handleCloseModal, handleCloseProjectModal]);


  // Legacy logic for city selection from query params (can be phased out)
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    const citySlug = params.get('city');

    if (citySlug && cities.some(c => c.slug === citySlug)) {
        if (isInitialLoadRef.current) {
            setSelectedCity(citySlug);
            setIsCityDetermined(true);
            localStorage.setItem('selectedCity', citySlug);
        }
    }
    isInitialLoadRef.current = false;
  }, [searchParams, cities, setSelectedCity, setIsCityDetermined]);

  // --- Effect to handle city slug as query parameter ---
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    
    // Check if any query parameter matches a city slug
    const citySlugFromParams = Array.from(params.keys()).find(param =>
      cities.some(city => city.slug === param)
    );

    if (citySlugFromParams) {
      handleCitySelect(citySlugFromParams);
      removeQueryParam(citySlugFromParams);
    }
  }, [searchParams, cities, handleCitySelect, removeQueryParam]);
} 