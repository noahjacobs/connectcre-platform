// Geographic and location types
export interface City {
  name: string;
  slug: string;
  state?: string;
  country?: string;
}

export interface Neighborhood {
  name: string;
  slug: string;
  city_slug?: string;
  city_name?: string;
}

export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  neighborhood?: string;
}
