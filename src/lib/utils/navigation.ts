import { type AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

export function navigateToTab(
  tabId: 'tracking' | 'directory' | 'messages' | 'company',
  router: AppRouterInstance,
  pathname: string,
  params?: Record<string, string>
) {
  // Force scroll to top first
  window.scrollTo(0, 0);
  
  // Route to dedicated pages instead of dashboard query parameters
  let targetPath = '';
  
  switch (tabId) {
    case 'tracking':
      targetPath = '/tracking';
      break;
    case 'directory':
      targetPath = '/directory';
      break;
    case 'messages':
      targetPath = '/messages';
      break;
    case 'company':
      targetPath = '/company';
      break;
    default:
      targetPath = '/tracking';
  }
  
  // Add query parameters if provided
  let queryString = '';
  if (params) {
    const urlParams = new URLSearchParams(params);
    const paramString = urlParams.toString();
    if (paramString) {
      queryString = `?${paramString}`;
    }
  }
  
  // Use router.replace instead of push to avoid building up history
  return router.replace(`${targetPath}${queryString}`);
}

// =============================================================================
// LOCATION DATA - Single source of truth
// =============================================================================

export const supportedCities = [
  { name: "Atlanta", slug: "atlanta" },
  { name: "Austin", slug: "austin" },
  { name: "Chicago", slug: "chicago" },
  { name: "Dallas", slug: "dallas" },
  { name: "Detroit", slug: "detroit" },
  { name: "Los Angeles", slug: "la" },
  { name: "Miami", slug: "miami" },
  { name: "New York", slug: "nyc" },
  { name: "San Francisco", slug: "sf" },
  { name: "Seattle", slug: "seattle" },
  { name: "Toronto", slug: "toronto" },
  { name: "Washington DC", slug: "dc" }
];

// =============================================================================
// LOCATION INTERFACES
// =============================================================================

export interface City {
  _id: string;
  title: string;
  slug: string;
  description?: string;
}

export interface Neighborhood {
  _id: string;
  title: string;
  slug: string;
  city: string;
}

// =============================================================================
// CITY FUNCTIONS
// =============================================================================

export function getCitySlugFromName(cityName: string | null | undefined): string {
  if (!cityName) return '';
  
  const normalizedName = cityName.toLowerCase().trim();
  
  // Handle special cases first
  const specialCases: { [key: string]: string } = {
    "washington d.c.": "dc",
    "washington dc": "dc",
    "los angeles": "la",
    "san francisco": "sf",
    "new york": "nyc"
  };
  
  if (specialCases[normalizedName]) {
    return specialCases[normalizedName];
  }
  
  // Search through supported cities
  const city = supportedCities.find(city => 
    city.name.toLowerCase() === normalizedName
  );
  
  if (city) {
    return city.slug;
  }
  
  // Fallback: convert to slug format
  return normalizedName.replace(/\s+/g, '-');
}

export function getCityNameFromSlug(slug: string | null | undefined): string {
  if (!slug) return '';
  
  const city = supportedCities.find(city => city.slug === slug);
  return city ? city.name : '';
}

export function getSupportedCities() {
  return supportedCities;
}

export function getCitiesAsObjects(): City[] {
  return supportedCities.map(city => ({
    _id: `city-${city.slug}`,
    title: city.name,
    slug: city.slug,
    description: `Development projects in ${city.name}`
  }));
}

// =============================================================================
// NEIGHBORHOOD FUNCTIONS
// =============================================================================

export function getNeighborhoodSlugFromName(neighborhoodName: string | null | undefined): string {
  if (!neighborhoodName) return '';
  return neighborhoodName.toLowerCase().replace(/\s+/g, '-');
}

export function getNeighborhoodNameFromSlug(slug: string | null | undefined): string {
  if (!slug) return '';
  return slug.split('-').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
}

// =============================================================================
// URL BUILDING
// =============================================================================

export function getPostUrl(cityName: string | null | undefined, neighborhoodName: string | null | undefined, postSlug: string | null): string {
  if (!postSlug) return '/';
  
  const citySlug = getCitySlugFromName(cityName);
  const neighborhoodSlug = getNeighborhoodSlugFromName(neighborhoodName);
  
  // If there's no neighborhood, use the city/slug format instead of city//slug
  if (!neighborhoodSlug) {
    return `/${citySlug}/${postSlug}`;
  }
  
  return `/${citySlug}/${neighborhoodSlug}/${postSlug}`;
}
