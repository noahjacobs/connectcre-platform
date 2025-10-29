'use server';

import { createClient } from '@supabase/supabase-js';

// Create Supabase client for server-side queries (respects RLS)
// Using anon key for public read access
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

export interface Article {
  id: string;
  title: string;
  subtitle: string | null;
  content: any;
  images: string[];
  city: string | null;
  neighborhood: string | null;
  tags: string[];
  created_at: string;
  published_at: string | null;
  author_id: string;
  project_id: string | null;
}

export interface Project {
  id: string;
  title: string;
  city: string | null;
  neighborhood: string | null;
  images: string[];
}

export async function getArticles(params?: {
  limit?: number;
  offset?: number;
  city?: string;
}) {
  const { limit = 20, offset = 0, city } = params || {};

  let query = supabase
    .from('articles')
    .select('*')
    .not('published_at', 'is', null)
    .order('published_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (city) {
    query = query.eq('city', city);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching articles:', error);
    return [];
  }

  return data as Article[];
}

export async function getArticleById(id: string) {
  const { data, error } = await supabase
    .from('articles')
    .select('*, project:projects(*)')
    .eq('id', id)
    .not('published_at', 'is', null)
    .single();

  if (error) {
    console.error('Error fetching article:', error);
    return null;
  }

  return data;
}

export async function getProjects(params?: {
  limit?: number;
  offset?: number;
  city?: string;
}) {
  const { limit = 20, offset = 0, city } = params || {};

  let query = supabase
    .from('projects')
    .select('*')
    .not('published_at', 'is', null)
    .order('published_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (city) {
    query = query.eq('city', city);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching projects:', error);
    return [];
  }

  return data as Project[];
}
