import { createClient } from '@supabase/supabase-js';
import { auth } from '@clerk/nextjs/server';

export async function createServerSupabaseClient() {
  const { getToken } = await auth();

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      global: {
        async fetch(url, options = {}) {
          const clerkToken = await getToken();

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
