"use server";

import { supabaseServer } from '@/lib/supabase/server';
import { cache } from '@/lib/utils/cache';
import { 
  getCityNameFromSlug, 
  getCitySlugFromName, 
  getNeighborhoodSlugFromName,
  getNeighborhoodNameFromSlug,
  getCitiesAsObjects,
  type City,
  type Neighborhood
} from './navigation';

export async function fetchCities(): Promise<City[]> {
  return getCitiesAsObjects();
}

export async function fetchNeighborhoodsByCity(citySlug: string): Promise<Neighborhood[]> {
  return cache<Neighborhood[]>(
    `neighborhoods:${citySlug}`,
    async () => {
      try {
        const cityName = getCityNameFromSlug(citySlug);
        if (!cityName) return [];

        const { data: neighborhoods, error } = await supabaseServer
          .from('articles')
          .select('neighborhood_name')
          .eq('city_name', cityName)
          .not('neighborhood_name', 'is', null)
          .not('published_at', 'is', null);

        if (error) {
          console.error("Error fetching neighborhoods:", error);
          return [];
        }

        // Get unique neighborhoods and transform to match expected structure
        const uniqueNeighborhoods = [...new Set(neighborhoods.map(n => n.neighborhood_name))];
        
        // Sort neighborhoods alphabetically by name
        uniqueNeighborhoods.sort((a, b) => a.localeCompare(b));
        
        return uniqueNeighborhoods.map(neighborhoodName => ({
          _id: `neighborhood-${getNeighborhoodSlugFromName(neighborhoodName)}`,
          title: neighborhoodName,
          slug: getNeighborhoodSlugFromName(neighborhoodName),
          city: citySlug
        }));

      } catch (error) {
        console.error("Error in fetchNeighborhoodsByCity:", error);
        return [];
      }
    },
    {
      ttl: 2 * 60 * 60, // 2 hour cache
      edge: true,
      local: true
    }
  );
}

export async function fetchNeighborhoodBySlug(citySlug: string, neighborhoodSlug: string) {
  try {
    const cityName = getCityNameFromSlug(citySlug);
    const neighborhoodName = getNeighborhoodNameFromSlug(neighborhoodSlug);
    
    if (!cityName) return null;

    // Query for any article that has this city and neighborhood combination
    const { data: article, error } = await supabaseServer
      .from('articles')
      .select('city_name, neighborhood_name')
      .eq('city_name', cityName)
      .eq('neighborhood_name', neighborhoodName)
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows found
        return null;
      }
      console.error(`[fetchNeighborhoodBySlug] Error:`, error);
      return null;
    }

    if (!article) {
      return null;
    }

    // Return neighborhood object in the expected format
    return {
      _id: `neighborhood-${neighborhoodSlug}`,
      title: article.neighborhood_name,
      slug: { current: neighborhoodSlug },
      city: {
        _id: `city-${citySlug}`,
        title: article.city_name,
        slug: { current: citySlug }
      }
    };

  } catch (error) {
    console.error(`[fetchNeighborhoodBySlug] Unexpected error:`, error);
    return null;
  }
}

export const fetchNeighborhoodsStaticParams = async (): Promise<{ citySlug: string; neighborhoodSlug: string }[]> => {
  try {
    // Get all unique city/neighborhood combinations from articles
    const { data: combinations, error } = await supabaseServer
      .from('articles')
      .select('city_name, neighborhood_name')
      .not('city_name', 'is', null)
      .not('neighborhood_name', 'is', null)
      .order('city_name')
      .order('neighborhood_name');

    if (error) {
      console.error("[fetchNeighborhoodsStaticParams] Error fetching neighborhood combinations:", error);
      return [];
    }

    if (!combinations || combinations.length === 0) {
      return [];
    }

    // Create unique combinations and convert to slugs
    const uniqueCombinations = new Map<string, { citySlug: string; neighborhoodSlug: string }>();
    
    combinations.forEach(combo => {
      if (combo.city_name && combo.neighborhood_name) {
        const citySlugValue = getCitySlugFromName(combo.city_name);
        const neighborhoodSlugValue = getNeighborhoodSlugFromName(combo.neighborhood_name);
        const key = `${citySlugValue}-${neighborhoodSlugValue}`;
        
        if (!uniqueCombinations.has(key)) {
          uniqueCombinations.set(key, { citySlug: citySlugValue, neighborhoodSlug: neighborhoodSlugValue });
        }
      }
    });

    return Array.from(uniqueCombinations.values());

  } catch (error) {
    console.error("[fetchNeighborhoodsStaticParams] Unexpected error:", error);
    return [];
  }
};

export const fetchStaticParams = async (): Promise<{ slug: string; citySlug: string; neighborhoodSlug?: string }[]> => {
  try {
    // Only pre-render recent articles (last 6 months) or featured articles
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const { data: articles, error } = await supabaseServer
      .from('articles')
      .select('slug, city_name, neighborhood_name, published_at')
      .not('published_at', 'is', null)
      .not('slug', 'is', null)
      .not('city_name', 'is', null)
      .order('published_at', { ascending: false })
      .limit(1000); // Safety limit

    if (error) {
      console.error("Error fetching articles for static params:", error);
      return [];
    }

    return (articles || []).map(article => {
      const citySlug = getCitySlugFromName(article.city_name);

      return {
        slug: article.slug,
        citySlug,
        neighborhoodSlug: article.neighborhood_name ? getNeighborhoodSlugFromName(article.neighborhood_name) : undefined
      };
    });

  } catch (error) {
    console.error("Error in fetchStaticParams:", error);
    return [];
  }
}; 