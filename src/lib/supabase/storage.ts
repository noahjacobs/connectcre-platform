import { createServerSupabaseClient } from './server';
import type { SupabaseClient } from '@supabase/supabase-js';

export const STORAGE_BUCKETS = {
  ARTICLES: 'articles',
  PROJECTS: 'projects',
  COMPANIES: 'companies',
  AVATARS: 'avatars',
} as const;

// Server-side storage functions (use in Server Actions or API Routes)
export async function uploadFile(
  bucket: keyof typeof STORAGE_BUCKETS,
  path: string,
  file: File
) {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKETS[bucket])
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) throw error;

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(STORAGE_BUCKETS[bucket])
    .getPublicUrl(data.path);

  return urlData.publicUrl;
}

export async function deleteFile(
  bucket: keyof typeof STORAGE_BUCKETS,
  path: string
) {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase.storage
    .from(STORAGE_BUCKETS[bucket])
    .remove([path]);

  if (error) throw error;
}

// Client-side storage functions (use in Client Components)
export async function uploadFileClient(
  supabase: SupabaseClient,
  bucket: keyof typeof STORAGE_BUCKETS,
  path: string,
  file: File
) {
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKETS[bucket])
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) throw error;

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(STORAGE_BUCKETS[bucket])
    .getPublicUrl(data.path);

  return urlData.publicUrl;
}

export async function deleteFileClient(
  supabase: SupabaseClient,
  bucket: keyof typeof STORAGE_BUCKETS,
  path: string
) {
  const { error } = await supabase.storage
    .from(STORAGE_BUCKETS[bucket])
    .remove([path]);

  if (error) throw error;
}
