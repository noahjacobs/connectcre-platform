import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { useSession } from '@clerk/nextjs';

// Use this in client components to get an authenticated Supabase client
export function useSupabase() {
  const { session } = useSession();

  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      global: {
        async fetch(url, options = {}) {
          const clerkToken = await session?.getToken();

          const headers = new Headers(options.headers);
          headers.set('Authorization', `Bearer ${clerkToken}`);

          return fetch(url, {
            ...options,
            headers,
          });
        },
      },
    }
  );
}
