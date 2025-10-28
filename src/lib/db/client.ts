import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

if (!process.env.POSTGRES_URL) {
  throw new Error('POSTGRES_URL environment variable is not set');
}

// Create postgres client
const client = postgres(process.env.POSTGRES_URL);

// Create drizzle instance
// ⚠️ WARNING: This bypasses RLS policies!
// Only use for:
// - Schema management (drizzle-kit generate/push/migrate)
// - Local development/seeding
// - Admin operations that need to bypass RLS
//
// For all user-facing queries, use Supabase client instead:
// - Server: createServerSupabaseClient() from '@/lib/supabase/server'
// - Client: useSupabase() from '@/lib/supabase/client'
export const db = drizzle(client, { schema });
