'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef, useTransition, startTransition } from 'react';
import { Map as MapboxMap, Marker, Popup, NavigationControl, GeolocateControl, ViewStateChangeEvent, ViewState, MarkerEvent, MapRef, LayerProps } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { AnyLayer } from 'mapbox-gl';
import { fetchProjectsForMap, MapProjectData, fetchFirstProjectImageById } from '@/components/map';
import { Button } from '@/components/ui/button';
import { MapPin, Loader2, X, Maximize, Minimize, MonitorSmartphone, Layers, Rotate3D } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Filter } from "@/components/ui/filters";
import { useTheme } from 'next-themes';
import { cn, scheduleIdleCallback } from '@/lib/utils';
import { perfLog } from '@/lib/utils/performance-monitor-client';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

// --- Hardcoded City Coordinates ---
const CITY_COORDINATES: Record<string, { latitude: number; longitude: number; zoom: number }> = {
  'la': { latitude: 34.0522, longitude: -118.2437, zoom: 10 },
  'atlanta': { latitude: 33.7490, longitude: -84.3880, zoom: 10 },
  'austin': { latitude: 30.2672, longitude: -97.7431, zoom: 11 },
  'chicago': { latitude: 41.8781, longitude: -87.6298, zoom: 10 },
  'dallas': { latitude: 32.7767, longitude: -96.7970, zoom: 10 },
  'detroit': { latitude: 42.3314, longitude: -83.0458, zoom: 10 },
  'miami': { latitude: 25.7617, longitude: -80.1918, zoom: 10 },
  'nyc': { latitude: 40.7128, longitude: -74.0060, zoom: 10 },
  'sf': { latitude: 37.7749, longitude: -122.4194, zoom: 11 },
  'seattle': { latitude: 47.6062, longitude: -122.3321, zoom: 10 },
  'toronto': { latitude: 43.6532, longitude: -79.3832, zoom: 10 },
  'dc': { latitude: 38.9072, longitude: -77.0369, zoom: 11 },
  // Add other cities as needed, ensuring slugs match Sanity slugs
};
const DEFAULT_CITY_SLUG = 'la'; // Fallback city

// --- 3D Building Layer Configuration ---
const createBuildingLayer = (theme: string | undefined): AnyLayer => {
  const isDark = theme === 'dark';
  return {
    id: '3d-buildings',
    source: 'composite', // Default source for Mapbox styles like streets-v12, dark-v11
    'source-layer': 'building',
    filter: ['==', 'extrude', 'true'], // Filter for buildings with extrusion data
    type: 'fill-extrusion',
    minzoom: 15,
    paint: {
      'fill-extrusion-color': isDark ? '#334155' : '#cbd5e1', // Darker gray for light, lighter for dark
      'fill-extrusion-height': [
        'interpolate',
        ['linear'],
        ['zoom'],
        15, 0, // Start extrusion at zoom 15
        15.05, ['get', 'height'] // Use 'height' property from data
      ],
      'fill-extrusion-base': [
        'interpolate',
        ['linear'],
        ['zoom'],
        15, 0, // Start base at zoom 15
        15.05, ['get', 'min_height'] // Use 'min_height' property
      ],
      'fill-extrusion-opacity': 0.7
    }
  } as AnyLayer;
};

interface ProjectMapProps {
  citySlug?: string | null; // New prop for filtering
  searchQuery?: string | null; // New prop
  actionId?: string | null; // New prop
  priorityProjectIds?: string[]; // New prop for priority IDs
  onFullScreenToggle?: (isFullScreen: boolean) => void;
  hoveredItemId: string | null; // Sanity Post _id
  setHoveredItemId: (id: string | null) => void;
  isFullScreen: boolean; // Add isFullScreen prop
  mapFilters?: Filter[]; // <-- Add mapFilters prop
  onViewProjectClick: (project: MapProjectData) => void; // <-- New prop for handling view click
  isSearching?: boolean; // <-- Add isSearching prop for search loading state
}

// Helper function to format status string
const formatStatus = (status: string | null | undefined): string => {
  if (!status) return 'N/A';
  return status
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Define color mapping for project statuses
const STATUS_COLORS: Record<string, string> = {
  Proposed: 'text-purple-500 fill-purple-500/30',
  Approved: 'text-green-600 fill-green-600/30',
  'Under Construction': 'text-yellow-600 fill-yellow-600/30',
  Completed: 'text-blue-600 fill-blue-600/30',
  Cancelled: 'text-gray-500 fill-gray-500/30',
  'N/A': 'text-gray-500 fill-gray-500/30'
};

export default React.memo(function ProjectMap({
  citySlug,
  searchQuery,
  actionId,
  priorityProjectIds,
  hoveredItemId,
  setHoveredItemId,
  isFullScreen,
  mapFilters,
  onViewProjectClick,
  isSearching
}: ProjectMapProps) {
  const mapRef = useRef<MapRef | null>(null);
  const { resolvedTheme } = useTheme();
  
  // Add React 18 concurrent features
  const [isPending, startTransition] = useTransition();
  
  const [mapLoaded, setMapLoaded] = useState(false);
  const [targetPitch, setTargetPitch] = useState<0 | 45>(0);
  const [defaultCityZoom, setDefaultCityZoom] = useState<number>(CITY_COORDINATES[DEFAULT_CITY_SLUG].zoom);
  const [mapBounds, setMapBounds] = useState<mapboxgl.LngLatBounds | null>(null);
  
  const [viewState, setViewState] = useState<ViewState>(() => {
      // Use hardcoded coordinates based on prop or default
      const slugToUse = citySlug && CITY_COORDINATES[citySlug] 
                      ? citySlug 
                      : DEFAULT_CITY_SLUG;
      const cityCoords = CITY_COORDINATES[slugToUse];
      
      perfLog.log('Map', 'Initial viewState set', undefined, { slugToUse, ...cityCoords });
      
      return {
          latitude: cityCoords.latitude,
          longitude: cityCoords.longitude,
          zoom: cityCoords.zoom,
          pitch: 0,
          bearing: 0,
          padding: { top: 0, bottom: 0, left: 0, right: 0 }
      };
  });

  const [projects, setProjects] = useState<MapProjectData[]>([]);
  const [selectedProject, setSelectedProject] = useState<MapProjectData | null>(null);
  const [selectedProjectImageUrl, setSelectedProjectImageUrl] = useState<string | null>(null);
  const [isPopupImageLoading, setIsPopupImageLoading] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [mapPinHoveredId, setMapPinHoveredId] = useState<string | null>(null);
  const [componentMounted, setComponentMounted] = useState(false);

  // === PERFORMANCE OPTIMIZATION: Enhanced deduplication ===
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const backgroundFetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchParamsRef = useRef<string | null>(null);
  const lastMergeRef = useRef<{ timestamp: number; count: number } | null>(null);
  const requestCache = useRef<Map<string, Promise<any>>>(new Map<string, Promise<any>>());

  // === PROGRESSIVE LOADING: Load initial data quickly, then enhance ===
  const useProgressiveLoading = useCallback(async (params: any, isInitial = false) => {
    const cacheKey = `map-dataV1:${JSON.stringify(params)}:${isInitial ? 'initial' : 'full'}`;
    
    if (requestCache.current.has(cacheKey)) {
      perfLog.log('Map', 'Using cached map data');
      return requestCache.current.get(cacheKey);
    }

    // PERFORMANCE OPTIMIZATION: Progressive loading with chunked requests
    const promise = isInitial 
      ? fetchProjectsForMap({ 
          ...params,
          fetchMode: 'initial',
          limit: 150  // Reduced initial load
        })
      : fetchProjectsForMap({ 
          ...params,
          fetchMode: 'full'
        });
    
    requestCache.current.set(cacheKey, promise);
    
    // Clear cache after 60 seconds
    setTimeout(() => requestCache.current.delete(cacheKey), 60000);
    
    return promise;
  }, []);

  // Effect to ensure component is mounted before doing API calls
  useEffect(() => {
    setComponentMounted(true);
  }, []);

  // === OPTIMIZED PROJECT MERGING: Eliminate duplicates ===
  const mergeProjectsOptimized = useCallback((newProjects: MapProjectData[], existingProjects: MapProjectData[]): MapProjectData[] => {
    const now = Date.now();
    
    // Prevent rapid duplicate merges
    if (lastMergeRef.current && 
        now - lastMergeRef.current.timestamp < 100 && 
        lastMergeRef.current.count === newProjects.length) {
      perfLog.log('Map', 'Skipping duplicate merge operation');
      return existingProjects;
    }
    
    lastMergeRef.current = { timestamp: now, count: newProjects.length };
    
    const projectMap = new Map<string, MapProjectData>();
    
    // Add existing projects first (maintain priority)
    existingProjects.forEach(p => projectMap.set(p.id, p));
    
    // Add/overwrite with new projects
    newProjects.forEach(p => projectMap.set(p.id, p));
    
    const mergedProjects: MapProjectData[] = Array.from(projectMap.values());
    
    perfLog.log('Map', 'Projects merged', undefined, {
      previousCount: existingProjects.length,
      newCount: newProjects.length,
      finalCount: mergedProjects.length
    });
    
    return mergedProjects;
  }, []);

  // Effect to load projects based on new props and screen size (OPTIMIZED)
  useEffect(() => {    
    if (!componentMounted) {
      return;
    }
    
    perfLog.log('Map', 'Effect triggered for initial projects load', undefined, {
      searchQuery,
      actionId,
      citySlug,
      priorityProjectIdsCount: priorityProjectIds?.length || 0,
      mapFiltersCount: mapFilters?.length || 0
    });

    // Clear any existing timeout
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
      fetchTimeoutRef.current = null;
    }

    // Use default city if citySlug is null/undefined
    const effectiveCitySlug = citySlug || DEFAULT_CITY_SLUG;
    
    // Create a unique identifier for this request
    const currentParams = JSON.stringify({
      searchQuery,
      actionId,
      citySlug: effectiveCitySlug,
      priorityProjectIds: priorityProjectIds?.sort(),
      mapFilters: mapFilters?.map(f => ({ type: f.type, value: f.value?.sort() }))
    });
    
    perfLog.log('Map', 'Loading projects with params', undefined, {
      searchQuery,
      actionId,
      citySlug,
      effectiveCitySlug,
      priorityProjectIdsCount: priorityProjectIds?.length || 0,
      mapFiltersCount: mapFilters?.length || 0
    });

    // Enhanced duplicate detection with shorter timeframe
    const now = Date.now();
    const timeSinceLastRequest = lastFetchParamsRef.current ? 
      (now - (lastFetchParamsRef.current as any).timestamp || 0) : 1000;
    
    if (lastFetchParamsRef.current === currentParams && timeSinceLastRequest < 50) {
      perfLog.log('Map', 'Skipping very recent duplicate request (within 50ms)');
      return;
    }

    // Update last fetch params with timestamp
    (lastFetchParamsRef as any).current = currentParams;
    (lastFetchParamsRef as any).timestamp = now;

    perfLog.log('Map', 'Starting legitimate map fetch');

    const loadInitialProjects = async () => {
      const fetchStart = performance.now();
      
      // Use concurrent features for loading state
      startTransition(() => {
        setIsLoading(true);
        setError(null);
      });
      
      try {
        perfLog.log('Map', 'Starting initial project fetch...');
        
        // PERFORMANCE OPTIMIZATION: Progressive loading strategy
        const params = { 
          query: searchQuery, 
          actionId, 
          citySlug: effectiveCitySlug, 
          priorityProjectIds, 
          mapFilters
        };
        
        // Load essential data first with lower limit
        const initialResult = await useProgressiveLoading(params, true);
        
        const initialFetchTime = performance.now() - fetchStart;
        perfLog.log('Map', 'Initial project fetch completed', initialFetchTime, {
          projectCount: initialResult.projects?.length || 0,
          hasError: !!initialResult.error
        });

        if (initialFetchTime > 500) {
          perfLog.warn('Map', 'SLOW INITIAL FETCH DETECTED', initialFetchTime);
        }
        
        if (initialResult.error) {
          console.warn('[Map] fetchProjectsForMap returned error:', initialResult.error);
          startTransition(() => {
            setProjects([]);
          });
        } else {
          // PERFORMANCE OPTIMIZATION: Set initial data immediately for fast render
          startTransition(() => {
            setProjects(initialResult.projects || []);
            setInitialLoadComplete(true);
          });
          
          // PERFORMANCE OPTIMIZATION: Background load remaining data
          scheduleIdleCallback(async () => {
            try {
              const fullResult = await useProgressiveLoading(params, false);
              if (fullResult.projects && fullResult.projects.length > initialResult.projects.length) {
                startTransition(() => {
                  setProjects(fullResult.projects);
                });
              }
            } catch (bgError) {
              console.warn('[Map] Background fetch failed:', bgError);
            }
          }, { timeout: 1000 });
        }
      } catch (err: any) {
        console.error("Failed to fetch initial projects for map:", err);
        startTransition(() => {
          setError(err.message || "Failed to load projects.");
          setProjects([]);
        });
      } finally {
        startTransition(() => {
          setIsLoading(false);
        });
      }
    };

    // Always load projects - the map div itself is hidden on mobile via CSS
    fetchTimeoutRef.current = setTimeout(() => {
      loadInitialProjects();
    }, 50);

    // Cleanup function
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
        fetchTimeoutRef.current = null;
      }
    };

  }, [componentMounted, searchQuery, actionId, citySlug, priorityProjectIds, mapFilters, useProgressiveLoading]);

  // Effect to update map position when city changes
  useEffect(() => {
    if (!citySlug || !mapRef.current || !mapLoaded) return;
    
    const cityCoords = CITY_COORDINATES[citySlug];
    if (!cityCoords) {
      console.warn(`No coordinates found for city: ${citySlug}`);
      return;
    }
    
    perfLog.log('Map', 'Flying to new city', undefined, { citySlug, ...cityCoords });
    
    // Fly to the new city coordinates
    mapRef.current.flyTo({
      center: [cityCoords.longitude, cityCoords.latitude],
      zoom: cityCoords.zoom,
      pitch: 0, // Reset to top-down view for city overview
      bearing: 0, // Reset bearing
      duration: 1000 // Smooth transition
    });
    
    // Update the stored default zoom for this city
    setDefaultCityZoom(cityCoords.zoom);
    
    // Clear any selected project when changing cities
    setSelectedProject(null);
    
  }, [citySlug, mapLoaded]);

  // Enhanced background fetch with better deduplication
  useEffect(() => {
    if (!initialLoadComplete) return;
    
    perfLog.log('Map', 'Background fetch effect triggered');
    
    // Clear any existing background fetch timeout
    if (backgroundFetchTimeoutRef.current) {
      clearTimeout(backgroundFetchTimeoutRef.current);
      backgroundFetchTimeoutRef.current = null;
    }
    
    // Increased debounce for background fetch to reduce duplicate calls
    backgroundFetchTimeoutRef.current = setTimeout(async () => {
      const backgroundFetchStart = performance.now();
      perfLog.log('Map', 'Starting background fetch for full project set...');
      
      try {
        // Use default city if citySlug is null/undefined for background fetch too
        const effectiveCitySlug = citySlug || DEFAULT_CITY_SLUG;
        
        const params = { 
          query: searchQuery, 
          actionId, 
          citySlug: effectiveCitySlug, 
          priorityProjectIds, 
          mapFilters
        };
        
        const result = await useProgressiveLoading(params, false);
        
        const backgroundFetchTime = performance.now() - backgroundFetchStart;
        perfLog.log('Map', 'Background fetch completed', backgroundFetchTime, {
          projectCount: result.projects?.length || 0
        });

        if (backgroundFetchTime > 2000) {
          perfLog.warn('Map', 'SLOW BACKGROUND FETCH DETECTED', backgroundFetchTime);
        }
        
        if (result.error) {
          console.warn("Background fetch of all projects failed:", result.error);
          return;
        }
        
        // Use optimized merging with concurrent features
        startTransition(() => {
          setProjects(prevProjects => {
            return mergeProjectsOptimized(result.projects, prevProjects);
          });
        });

      } catch (err: any) {
        console.warn("Error in background fetch of all projects:", err);
      }
    }, 1000); // Reduced from 2000ms to 1000ms for better responsiveness
    
    return () => {
      if (backgroundFetchTimeoutRef.current) {
        clearTimeout(backgroundFetchTimeoutRef.current);
        backgroundFetchTimeoutRef.current = null;
      }
    };

  }, [initialLoadComplete, searchQuery, actionId, citySlug, priorityProjectIds, mapFilters, useProgressiveLoading, mergeProjectsOptimized]);

  // Effect to fetch image when selectedProject changes
  useEffect(() => {
    // If no project is selected, clear image and loading state
    if (!selectedProject) {
      setSelectedProjectImageUrl(null);
      setIsPopupImageLoading(false);
      return;
    }

    // Project selected, start loading process
    let isCancelled = false; // Flag to handle component unmount or dependency change mid-fetch
    setIsPopupImageLoading(true);
    setSelectedProjectImageUrl(null); // Ensure previous image is cleared

    const fetchImage = async () => {
      try {
        const imageUrl = await fetchFirstProjectImageById(selectedProject.id);
        if (!isCancelled) { // Only update state if the effect hasn't been cancelled
          setSelectedProjectImageUrl(imageUrl);
        }
      } catch (error) {
        console.error("Error fetching image for popup:", error);
        if (!isCancelled) {
          setSelectedProjectImageUrl(null); // Clear image URL on error
        }
      } finally {
        if (!isCancelled) {
          setIsPopupImageLoading(false); // Stop loading indicator
        }
      }
    };

    fetchImage();

    // Cleanup function to set the cancelled flag if effect re-runs or component unmounts
    return () => {
      isCancelled = true;
    };
  }, [selectedProject]); // Re-run this effect only when selectedProject changes

  const handleMove = useCallback((event: ViewStateChangeEvent) => {
    setViewState(prev => ({ ...prev, ...event.viewState }));
    // --- Updated: Better map bounds handling ---
    if (mapRef.current) {
      const map = mapRef.current.getMap();
      const bounds = map.getBounds();
      if (bounds) {
        setMapBounds(bounds);
      }
    }
  }, []);

  // Define the zoom level for when a marker is selected
  const ZOOMED_IN_LEVEL = 16;

  // Simplified handleMarkerClick: sets the selected project, zooms in, and tilts if needed using flyTo
  const handleMarkerClick = useCallback((project: MapProjectData, e: MarkerEvent<MouseEvent>) => {
    e.originalEvent.stopPropagation();
    const map = mapRef.current;
    if (!map) return;

    // Always set 45-degree pitch when clicking a marker
    const nextPitch = 45;

    // Use flyTo for a smooth transition - handle ALL navigation directly here
    map.flyTo({
      center: [project.longitude, project.latitude],
      zoom: ZOOMED_IN_LEVEL,
      pitch: nextPitch, // Always fly to 45 degrees for marker views
      duration: 1000 // Animation duration in ms
    });

    // Set selected project immediately
    setSelectedProject(project);

    // Update targetPitch AFTER direct flyTo animation starts
    // Short delay ensures we don't trigger a double flyTo but keeps state in sync
    setTimeout(() => {
      setTargetPitch(45);
    }, 1100);

  }, [ZOOMED_IN_LEVEL]);

  const handlePopupClose = useCallback(() => {
    setSelectedProject(null);
    const map = mapRef.current;
    if (!map) return;

    map.flyTo({
      zoom: defaultCityZoom,
      duration: 1000 // Animation duration in ms
    });

  }, [defaultCityZoom]); // Depend on the stored default city zoom

  // --- Effect to smoothly change pitch when targetPitch changes ---
  // This effect handles the manual pitch toggle button
  useEffect(() => {
    const map = mapRef.current;
    // Only fly if map exists and pitch needs changing
    if (map && viewState.pitch !== targetPitch) {
        // Check if the current map pitch already matches targetPitch
        const currentMapPitch = map.getMap().getPitch();
        const pitchDifference = Math.abs(currentMapPitch - targetPitch);
        
        // Only do flyTo if the actual map pitch differs significantly from targetPitch
        if (pitchDifference > 5) { // Using a small threshold to account for tiny differences
            map.resize(); // Ensure map knows its current size before animating
            map.flyTo({
                pitch: targetPitch,
                duration: 250 // Faster duration for manual toggle
            });
        }
        
        // Update React state immediately
        setViewState(prev => ({ ...prev, pitch: targetPitch }));
    }
  }, [targetPitch]); // Only depend on targetPitch

  // --- NEW: Effect to pan to hovered item from the parent (e.g., post grid) ---
  useEffect(() => {
    if (!mapLoaded || !hoveredItemId || !mapRef.current) return;

    const hoveredProjectDetails = projects.find(p => p.id === hoveredItemId);
    const map = mapRef.current.getMap(); // Get the map instance

    const MEANINGFUL_DIFFERENCE_THRESHOLD = 0.00001; // Define a small tolerance

    if (
      hoveredProjectDetails &&
      hoveredProjectDetails.latitude != null && // Check for non-null latitude
      hoveredProjectDetails.longitude != null && // Check for non-null longitude
      hoveredProjectDetails.id !== selectedProject?.id // Don't re-pan if it's already selected
    ) {
      const currentCenter = map.getCenter();
      // Check if the coordinates have a meaningful difference before flying
      if (
        Math.abs(hoveredProjectDetails.longitude - currentCenter.lng) > MEANINGFUL_DIFFERENCE_THRESHOLD ||
        Math.abs(hoveredProjectDetails.latitude - currentCenter.lat) > MEANINGFUL_DIFFERENCE_THRESHOLD
      ) {
        mapRef.current.flyTo({
          center: [hoveredProjectDetails.longitude, hoveredProjectDetails.latitude],
          // Keep current zoom and pitch, only change center
          duration: 500 // A shorter duration for hover pan
        });
      }
    }
  }, [hoveredItemId, projects, mapLoaded, selectedProject]);

  // --- Effect to add 3D buildings ---
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || !mapLoaded) return; // Ensure map and style are loaded

    const buildingLayerId = '3d-buildings';

    // Remove existing layer if it exists (for theme changes)
    if (map.getLayer(buildingLayerId)) {
      map.removeLayer(buildingLayerId);
    }

    // Create the layer config based on the current theme
    const buildingLayer = createBuildingLayer(resolvedTheme);

    // Find a suitable layer to insert the 3D buildings before.
    // We want buildings above roads/land but below labels/POIs.
    // Finding a label layer (`*-label`) is a good heuristic.
    const layers = map.getStyle().layers;
    let beforeLayerId;
    // Iterate backwards to find the first label layer from the top
    for (let i = layers.length - 1; i >= 0; i--) {
      if (layers[i].type === 'symbol' && layers[i].id.includes('-label')) {
          beforeLayerId = layers[i].id;
          break;
      }
    }

    // Fallback: If no specific label layer found, try the first symbol layer
    if (!beforeLayerId) {
        for (const layer of layers) {
            if (layer.type === 'symbol') {
                beforeLayerId = layer.id;
                break;
            }
        }
    }

    // Add the 3D building layer before the found layer ID.
    // If no suitable layer is found, it will be added on top (Mapbox default).
    map.addLayer(buildingLayer, beforeLayerId);

    // Cleanup function to remove the layer on unmount or theme change
    return () => {
      if (map.getLayer(buildingLayerId)) {
        try {
          // Check if map style still exists before removing
          if (map.isStyleLoaded()) {
             map.removeLayer(buildingLayerId);
          }
        } catch (e) {
          console.warn("Error removing 3d building layer during cleanup:", e);
        }
      }
    };
  }, [resolvedTheme, mapLoaded]); // Depend on theme and map load state

  // --- NEW: Combined logic for zoom-based visibility and hover effect ---
  const visibleProjects = useMemo(() => {
    const zoom = viewState.zoom;
    let zoomLimit: number;

    if (zoom < 11) {
      zoomLimit = 300;
    } else if (zoom < 13) {
      zoomLimit = 500;
    } else if (zoom < 15) {
      zoomLimit = 1000;
    } else if (zoom < 17) {
      zoomLimit = 2000;
    } else {
      zoomLimit = 5000; // Cap at 5000 for higher zoom levels
    }

    // Ensure baseLimit doesn't exceed actual number of projects or the calculated zoomLimit
    const baseLimit = Math.min(zoomLimit, projects.length);
    
    // Start with a slice of projects. If projects.length is less than baseLimit, this just takes all projects.
    let tempVisibleProjects = projects.slice(0, baseLimit);

    // --- NEW: Filter by map bounds ---
    if (mapBounds) {
      tempVisibleProjects = tempVisibleProjects.filter(project => {
        if (project.longitude != null && project.latitude != null) { // Ensure coords exist
          return mapBounds.contains([project.longitude, project.latitude]);
        }
        return false;
      });
    }
    // --- End NEW ---

    const hoveredProject = hoveredItemId ? projects.find(p => p.id === hoveredItemId) : null;

    if (hoveredProject) {
      const isHoveredProjectInTempList = tempVisibleProjects.some(p => p.id === hoveredProject.id);
      if (!isHoveredProjectInTempList) {
        // If the list is full (potentially after viewport filtering) and we need to add the hovered project,
        // we might exceed the original zoomLimit slightly, but prioritize showing the hovered item.
        // A more complex strategy could remove another item if strictly adhering to zoomLimit is critical even with hover.
        // For now, if it's not in the list, add it. If the list was full *before* viewport filtering, one was already popped.
        // If it became "full" according to zoomLimit *after* viewport filtering, this adds one more.
        tempVisibleProjects.push(hoveredProject);
      }
    }

    // --- NEW: Ensure selectedProject is always visible ---
    if (selectedProject) {
      const isSelectedProjectInTempList = tempVisibleProjects.some(p => p.id === selectedProject.id);
      if (!isSelectedProjectInTempList) {
        // If selectedProject is not in the list, add it.
        // This might make the list exceed zoom/viewport limits slightly, but selected takes precedence.
        tempVisibleProjects.push(selectedProject);
      }
    }
    
    // Remove the sorting since we're handling z-index with style prop now
    return tempVisibleProjects;

  }, [projects, hoveredItemId, viewState.zoom, mapBounds, selectedProject]);

  // TODO: Use mapFilters to filter markers/data fetched
  // useEffect(() => {
  //   // console.log("Map Filters received:", mapFilters);
  //   // Implement filtering logic here based on mapFilters
  //   // This might involve refetching data with filters or filtering existing markers
  // }, [mapFilters]);

  // --- Effect to handle full screen map resize ---
  useEffect(() => {
    if (mapLoaded && mapRef.current) {
      // Wait for CSS transition to complete before resizing
      const timeoutId = setTimeout(() => {
        if (mapRef.current) {
          const map = mapRef.current.getMap();
          map.resize();
          
          // Update bounds after resize
          setMapBounds(map.getBounds());
        }
      }, 250); // Wait for the 200ms CSS transition + buffer
      
      return () => clearTimeout(timeoutId);
    }
  }, [mapLoaded, isFullScreen]); // Listen to isFullScreen changes

  // --- Effect to force redraw of markers when map loaded or visibleProjects change ---
  useEffect(() => {
    if (mapLoaded && mapRef.current) {
      // Force a resize to ensure all markers are visible
      const map = mapRef.current.getMap();
      map.resize();
      
      // Update bounds after resize
      setMapBounds(map.getBounds());
    }
  }, [mapLoaded, visibleProjects.length]);

  // Determine map style based on theme
  const mapStyle = resolvedTheme === 'dark' 
                   ? 'mapbox://styles/mapbox/dark-v11' 
                   : 'mapbox://styles/mapbox/streets-v12';

  if (!MAPBOX_TOKEN) {
    return <div className="flex items-center justify-center h-96 text-red-500">Mapbox Access Token is missing.</div>;
  }

  return (
    <div className="relative h-full w-full">
      {/* Map Container - Hidden on mobile (md breakpoint) */}
      <div className="h-full w-full hidden md:block">
        <MapboxMap
          ref={mapRef} // Assign the ref here
          {...viewState}
          onMove={handleMove}
          onMouseLeave={() => setHoveredItemId(null)}
          onLoad={() => {
            setMapLoaded(true); // <-- Set map loaded state
            // --- NEW: Set initial map bounds on load ---
            if (mapRef.current) {
              const map = mapRef.current.getMap();
              setMapBounds(map.getBounds());
              // Force a resize to ensure proper rendering of all components
              map.resize();
              // Slight delay to ensure bounds are properly calculated after resize
              setTimeout(() => {
                setMapBounds(map.getBounds());
              }, 100);
            }
          }}
          mapboxAccessToken={MAPBOX_TOKEN}
          mapStyle={mapStyle} // <-- Use dynamic map style
          style={{ width: '100%', height: '100%' }}
        >
          <GeolocateControl position="top-left" />
          <NavigationControl position="top-left" />

          {visibleProjects.map((project) => {
            // Determine if the current marker should be highlighted
            const isHoveredByGrid = project.id === hoveredItemId; // Hovered via parent (grid)
            const isHoveredOnMap = project.id === mapPinHoveredId;  // Hovered directly on map pin
            const isEffectivelyHovered = isHoveredByGrid || isHoveredOnMap; // Combined hover state for styling

            const isSelected = project.id === selectedProject?.id; // Check if this marker is the selected one

            // Determine pin style based on selection first, then hover
            let pinColor: string;
            let pinSize: string;

            // Get color based on status
            const formattedStatus = formatStatus(project.status);
            const statusColor = STATUS_COLORS[formattedStatus] || STATUS_COLORS['N/A']; // Default to N/A color if status not found

            if (isSelected) {
                pinColor = resolvedTheme === 'dark' ? "text-white fill-white/40" : "text-red-600 fill-red-600/40";
                pinSize = "w-9 h-9"; // Selected is larger
            } else if (isEffectivelyHovered) { // Use combined hover state
                pinColor = resolvedTheme === 'dark' ? "text-white fill-white/40" : "text-red-600 fill-red-600/40";
                pinSize = "w-8 h-8"; // Hovered is larger
            } else {
                pinColor = statusColor; // Default to status color
                pinSize = "w-6 h-6"; // Default size
            }

            return (
              <Marker
                key={project.id} // Use Supabase project ID as key
                longitude={project.longitude}
                latitude={project.latitude}
                anchor="bottom"
                onClick={(e: MarkerEvent<MouseEvent>) => handleMarkerClick(project, e)}
                style={{ zIndex: isEffectivelyHovered ? 9 : isSelected ? 8 : 1 }} // Use combined hover state for zIndex
              >
                <MapPin
                  className={`${pinSize} ${pinColor} cursor-pointer transition-all duration-150 ease-out`}
                  onMouseEnter={() => setMapPinHoveredId(project.id)} // Use local state setter
                  onMouseLeave={() => setMapPinHoveredId(null)}      // Clear local state on leave
                />
              </Marker>
            );
          })}

          {selectedProject && (
            <Popup
              longitude={selectedProject.longitude}
              latitude={selectedProject.latitude}
              onClose={handlePopupClose}
              closeOnClick={true}
              closeButton={false}
              anchor="top"
              offset={10}
              className="z-20 rounded-lg shadow-md p-0! max-w-xs! w-64 bg-white"
            >
              <div className="flex flex-col">
                <div className="relative h-36 w-full bg-gray-100 dark:bg-gray-700 rounded-t-lg flex items-center justify-center overflow-hidden border-b border-gray-200 dark:border-gray-700">
                  {isPopupImageLoading ? (
                    <Loader2 className="w-6 h-6 text-gray-400 dark:text-gray-500 animate-spin" />
                  ) : selectedProjectImageUrl ? (
                    <Image
                      src={selectedProjectImageUrl}
                      alt={`${selectedProject.title || 'project'}`}
                      layout="fill"
                      objectFit="cover"
                      // className="transition-opacity duration-300 ease-in-out"
                    />
                  ) : (
                    <span className="text-xs text-gray-400 dark:text-gray-500 italic">Image not available</span>
                  )}
                </div>
                <div className="p-2 pt-1 space-y-1">
                  <h3 className="font-semibold text-base line-clamp-2 text-gray-900">{selectedProject.title || 'Unnamed Project'}</h3>
                  
                  <div className="flex items-center justify-between pt-1">
                    <Badge variant="outline" className="text-xs font-medium text-gray-900">
                      {formatStatus(selectedProject.status)} 
                    </Badge>
                    
                    {selectedProject.slug && (
                      <Button
                        variant="link"
                        size="sm"
                        className="inline-flex items-center justify-center px-2.5 py-0.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 h-auto"
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewProjectClick(selectedProject);
                        }}
                      >
                        View Project
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Popup>
          )}
        </MapboxMap>
      </div>

      {/* --- Pitch Toggle Button --- */}
      <Button
        variant="outline"
        className="h-[33px] w-[33px] p-2 absolute top-[145px] left-[8px] z-8 border-2 bg-white dark:border-gray-800 hover:bg-gray-100 shadow-md hidden md:inline-flex" // Position below NavControl
        onClick={() => setTargetPitch(prev => prev === 0 ? 45 : 0)}
        title={targetPitch === 0 ? "Switch to 3D View" : "Switch to Top-Down View"}
      >
        <Rotate3D className="h-4 w-4 dark:text-gray-700" />
      </Button>

      {/* Subtle loading indicator for updates (when not initial load) */}
      {isPending && !isLoading && (
        <div className="absolute top-4 right-4 z-20 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg border border-gray-200 dark:border-gray-700 hidden md:flex items-center gap-2">
          <Loader2 className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-spin" />
          <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
            Updating...
          </span>
        </div>
      )}

      {/* Search loading indicator */}
      {isSearching && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg border border-gray-200 dark:border-gray-700 hidden md:flex items-center gap-2">
          <Loader2 className="w-4 h-4 text-green-600 dark:text-green-400 animate-spin" />
          <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
            Searching...
          </span>
        </div>
      )}

      {/* Map Legend - Only shows on md+ screens */}
      <div className="absolute right-2 bottom-2 bg-white/80 dark:bg-gray-800/80 p-3 rounded-md shadow-md z-10 hidden md:block">
        <h4 className="text-sm font-semibold mb-2 text-gray-700 dark:text-gray-200">Project Status Legend</h4>
        <ul className="space-y-1">
          {Object.entries(STATUS_COLORS)
            .filter(([status]) => status !== 'Cancelled' && status !== 'N/A')
            .map(([status, colorClass]) => (
              <li key={status} className="flex items-center space-x-2">
                <MapPin className={`w-4 h-4 ${colorClass}`} />
                <span className="text-xs text-gray-600 dark:text-gray-300">{status}</span>
              </li>
            ))}
        </ul>
      </div>

      {/* Loading and Error overlays - Keep them outside the responsive containers so they show regardless */}
      {/* {isLoading && (
        <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm flex flex-col items-center justify-center z-30">
          <Loader2 className="w-10 h-10 text-blue-600 dark:text-blue-400 animate-spin mb-3" />
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Loading projects...
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {citySlug ? `Finding projects in ${citySlug.toUpperCase()}` : 'Finding projects in LA'}
          </div>
        </div>
      )} */}
      {error && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-red-100 text-red-700 p-3 rounded-md shadow-lg z-30 text-sm flex items-center gap-2">
           <span>{error}</span>
           <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setError(null)}>
                <X className="h-4 w-4"/>
           </Button>
        </div>
      )}
    </div>
  );
});
