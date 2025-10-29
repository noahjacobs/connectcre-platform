import { useMemo } from 'react';
import { useSession } from '@clerk/nextjs';
import { createClerkSupabaseClient } from '@/lib/supabase/clerk-client';

/**
 * Custom hook that provides a Clerk-authenticated Supabase client.
 * This centralizes the authentication logic and ensures all database operations
 * use the properly authenticated client.
 * 
 * @returns Authenticated Supabase client or null if no session
 */
export function useAuthenticatedSupabase() {
  const { session, isLoaded } = useSession();

  const supabase = useMemo(() => {
    // Don't create client until session is loaded
    if (!isLoaded) {
      return null;
    }
    
    if (!session) {
      return null;
    }
    
    return createClerkSupabaseClient(async () => {
      try {
        const token = await session.getToken();
        if (!token) {
          console.error('[useAuthenticatedSupabase] Failed to get token from session');
          return null;
        }
        return token;
      } catch (error) {
        console.error('[useAuthenticatedSupabase] Error getting token:', error);
        return null;
      }
    });
  }, [session?.id, isLoaded]); // Use session.id instead of session to prevent unnecessary recreations

  return supabase;
}

/**
 * Hook that provides an authenticated Supabase client with error handling.
 * Throws an error if no authenticated client is available.
 * 
 * @returns Authenticated Supabase client (guaranteed to be non-null)
 * @throws Error if no session is available
 */
export function useRequiredSupabase() {
  const supabase = useAuthenticatedSupabase();
  
  if (!supabase) {
    throw new Error('Authentication required. User must be logged in to perform this operation.');
  }
  
  return supabase;
} 