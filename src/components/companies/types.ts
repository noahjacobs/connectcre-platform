// Company-related types

export interface Company {
  id: string;
  name: string;
  slug: string;
  description?: string;
  
  // Company details
  categories?: string[];
  propertyTypes?: string[];
  location?: string;
  
  // Contact information
  contact?: {
    email?: string;
    phone?: string;
    website?: string;
  };
  
  // Branding
  logo?: {
    asset: {
      url: string;
    };
  };
  uploadedLogoUrl?: string;
  
  // Status and verification
  status: CompanyStatus;
  isVerified: boolean;
  
  // Metrics
  projectCount: number;
  rating?: number;
  reviewCount: number;
  activityLevel: ActivityLevel;
  experienceLevel: ExperienceLevel;
  
  // Projects
  activeProjects?: CompanyProject[];
  completedProjects?: CompanyProject[];
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export type CompanyStatus = 'active' | 'pending' | 'suspended' | 'archived';

export type ActivityLevel = 'high' | 'medium' | 'low';

export type ExperienceLevel = 'senior' | 'mid' | 'junior';

export interface CompanyProject {
  id: string;
  name: string;
  slug: string;
  city?: string;
  neighborhood?: string;
  status: string;
  address?: string;
  completedDate?: string;
}

export interface CompanyReview {
  id: string;
  companyId: string;
  userId: string;
  rating: number;
  content: string;
  createdAt: string;
  user: {
    id: string;
    email: string;
    profile: {
      fullName?: string;
      avatar?: string;
    };
  };
}

export interface CreateCompanyData {
  name: string;
  description?: string;
  categories?: string[];
  propertyTypes?: string[];
  location?: string;
  contact?: {
    email?: string;
    phone?: string;
    website?: string;
  };
  logo?: File;
}

export interface UpdateCompanyData extends Partial<CreateCompanyData> {
  status?: CompanyStatus;
  isVerified?: boolean;
}

export interface CompanyFilters {
  role?: string[];
  location?: string[];
  activityLevel?: ActivityLevel[];
  experienceLevel?: ExperienceLevel[];
  rating?: number[];
  propertyType?: string[];
  isVerified?: boolean;
}

export interface CompanySearchParams {
  query?: string;
  filters?: CompanyFilters;
  page?: number;
  limit?: number;
  sort?: 'name' | 'rating' | 'activity' | 'experience' | 'newest';
}
