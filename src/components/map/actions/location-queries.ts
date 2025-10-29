"use server";

import { createSupabaseServerClient } from '@/lib/supabase/ssr-server';
import { cache } from '@/lib/utils/cache';
import type { City, Neighborhood } from '../types';

// Migrate fetchNeighborhoodBySlug from main actions
export async function fetchNeighborhoodBySlug(citySlug: string, neighborhoodSlug: string) {
  try {
    const supabaseServer = await createSupabaseServerClient();
    
    const { data, error } = await supabaseServer
      .from('neighborhoods')
      .select('*')
      .eq('city_slug', citySlug)
      .eq('slug', neighborhoodSlug)
      .single();

    if (error) {
      console.error('Error fetching neighborhood:', error);
      return null;
    }

    return data as Neighborhood;
  } catch (error) {
    console.error('Error in fetchNeighborhoodBySlug:', error);
    return null;
  }
}

// Migrate fetchNeighborhoodsByCity from main actions
export async function fetchNeighborhoodsByCity(citySlug: string) {
  try {
    const supabaseServer = await createSupabaseServerClient();
    
    const { data, error } = await supabaseServer
      .from('neighborhoods')
      .select('*')
      .eq('city_slug', citySlug)
      .order('name');

    if (error) {
      console.error('Error fetching neighborhoods:', error);
      return [];
    }

    return (data || []) as Neighborhood[];
  } catch (error) {
    console.error('Error in fetchNeighborhoodsByCity:', error);
    return [];
  }
}

// Placeholder for fetchCities - needs to be implemented
export async function fetchCities(): Promise<City[]> {
  // TODO: Implement this when we have a cities table
  // For now, return empty array to prevent errors
  return [];
} 