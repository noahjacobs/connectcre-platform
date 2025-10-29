import { createClient } from '@supabase/supabase-js'

// Client-side Supabase client with Clerk native integration
export function createClerkSupabaseClient(getToken: () => Promise<string | null>) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      accessToken: async () => {
        try {
          return await getToken();
        } catch (error) {
          console.error('[createClerkSupabaseClient] Error getting token:', error);
          return null;
        }
      },
    }
  )
}

// Server-side Supabase client with Clerk native integration  
export function createServerSupabaseClient(getToken: () => Promise<string | null>) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      accessToken: async () => {
        try {
          return await getToken();
        } catch (error) {
          console.error('[createServerSupabaseClient] Error getting token:', error);
          return null;
        }
      },
    }
  )
} 