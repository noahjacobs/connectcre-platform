export interface Post {
  id: string;
  title: string;
  subtitle?: string | null;
  content: any;
  images: string[];
  city?: string | null;
  neighborhood?: string | null;
  tags: string[];
  created_at: string;
  published_at: string | null;
  author_id: string;
  project_id?: string | null;
}

export interface Project {
  id: string;
  title: string;
  description?: string | null;
  city?: string | null;
  neighborhood?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  images: string[];
  status: string;
  property_types: string[];
}

export interface City {
  id: string;
  name: string;
  slug: string;
  state?: string;
}

export interface Neighborhood {
  id: string;
  name: string;
  slug: string;
  city_id: string;
}

export interface PostImage {
  url: string;
  alt?: string;
  width?: number;
  height?: number;
}
