// Post/Article types
export interface Post {
  id: string;
  created_at: string;
  updated_at: string;
  title: string;
  slug: string;
  subtitle?: string;
  images?: any; // jsonb from Supabase - gallery images only
  bannerImage?: any; // jsonb from Supabase - banner image
  body_ai?: string; // text from Supabase  
  city_name?: string;
  neighborhood_name?: string;
  address?: string;
  normalized_address?: string;
  supabase_project_id?: string;
  published_at?: string;
  tags?: string[];
}

export interface Article extends Post {
  // Alias for Post since they're the same table
}

export interface Comment {
  id: string;
  post_id: string;
  content: string;
  created_at: string;
  updated_at?: string;
  author?: {
    id: string;
    name?: string;
    avatar_url?: string;
  };
}

export interface City {
  _id: string;
  title: string;
  slug: { current: string };
  isNeighborhood?: boolean;
}
