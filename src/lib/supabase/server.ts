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

// Alias for compatibility
export const createSupabaseServerClient = createServerSupabaseClient;
export const supabaseServer = createServerSupabaseClient;

export async function getServerAuthUser() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return { user: null, error: 'User not authenticated' };
    }

    const supabase = await createServerSupabaseClient();

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, avatar_url, clerk_id')
      .eq('clerk_id', userId)
      .single();

    if (error) {
      console.error('[getServerAuthUser] Error fetching profile:', error);
      return { user: null, error: error.message };
    }

    return { user: profile, error: null };
  } catch (error) {
    console.error('[getServerAuthUser] Unexpected error:', error);
    return { user: null, error: 'Failed to get user' };
  }
}
