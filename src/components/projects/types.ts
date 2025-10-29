// Project-related types - matches Supabase database schema

export interface Project {
  id: string; // UUID from Supabase
  created_at: string | null;
  updated_at: string | null;
  
  // Identity + Description
  title: string | null;
  slug: string | null;
  description: string | null;
  project_tags: string[] | null;
  
  // Location
  address: string | null;
  normalized_address: string | null;
  city: string | null;
  city_slug: string | null;
  neighborhood: string | null;
  neighborhood_slug: string | null;
  latitude: number | null;
  longitude: number | null;
  
  // Status & Timeline
  status: ProjectStatus | null;
  start_date: string | null; // date
  construction_start_date: string | null; // date
  completion_date: string | null; // date
  
  // Development Details
  zoning: string | null;
  land_use: string | null;
  uses: string[] | null;
  ownership_type: OwnershipType | null;
  construction_type: string | null;
  building_type: BuildingType | null;
  energy_certification: string | null;
  
  // Metrics
  project_cost: number | null;
  assessed_value: number | null;
  floors: number | null;
  height_ft: number | null;
  lot_area: number | null;
  building_area: number | null;
  floor_area_ratio: number | null;
  
  // Unit Breakdown
  unit_count: number | null;
  condo_count: number | null;
  apartment_count: number | null;
  hotel_count: number | null;
  affordable_unit_count: number | null;
  
  // Amenities
  retail_space_sf: number | null;
  office_space_sf: number | null;
  parking_spaces: number | null;
  bike_spaces: number | null;
  
  // Source and Metadata
  sources: string[] | null;
  changelog: any[] | null; // jsonb array
  metadata: any | null; // jsonb
  developerId: string | null; // UUID
  primary_image_url: string | null;
  map_image_url: string | null;
  
  // Derived / Join Fields
  has_articles: boolean | null;
}

export interface ProjectUpdate {
  update_id: string;
  project_id: string;
  update_date: string | null;
  status: ProjectStatus | null;
  update_type: string | null;
  update_tags: string[] | null;
  summary: string | null;
  sources: string[] | null;
  raw_id: string | null;
  contractor_id: string | null;
  developer_id: string | null;
  updated_fields: Record<string, any> | null;
}

export interface ProjectWithUpdates extends Project {
  updates?: ProjectUpdate[];
}

export type ProjectStatus = 
  | 'proposed' 
  | 'approved' 
  | 'under_construction' 
  | 'completed' 
  | 'cancelled' 
  | 'on_hold';

export type OwnershipType = 
  | 'private' 
  | 'public' 
  | 'mixed' 
  | 'nonprofit';

export type BuildingType = 
  | 'new_construction' 
  | 'renovation' 
  | 'demolition' 
  | 'addition' 
  | 'alteration' 
  | 'repair' 
  | 'restoration' 
  | 'conversion' 
  | 'adaptive_reuse' 
  | 'rehabilitation' 
  | 'modernization' 
  | 'expansion' 
  | 'reconstruction' 
  | 'redevelopment' 
  | 'refurbishment' 
  | 'upgrade' 
  | 'seismic_retrofit' 
  | 'historic_preservation' 
  | 'mixed_development' 
  | 'phased_construction';
