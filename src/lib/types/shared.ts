// Truly shared types that are not feature-specific

export type NavItem = {
  label: string;
  href: string;
  target: boolean;
};

export type BreadcrumbLink = {
  label: string;
  href: string;
};

// Image handling - simplified since we moved to Supabase storage
export interface PostImage {
  url: string;
  type?: 'banner' | 'gallery';
  caption?: string;
  alt?: string;
}

// Generic types for metadata and flexibility
export interface Block {
  _type: string;
  [key: string]: any;
}

export interface Keyed {
  _key: string;
}

export interface Slug {
  current: string;
}

// Author type (shared across posts and other content)
export interface Author {
  name?: string;
  email?: string;
} 