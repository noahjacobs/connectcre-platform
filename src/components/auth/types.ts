// Authentication and authorization types

export type UserRole = 'admin' | 'contributor' | 'user' | 'guest';

export interface UserPermissions {
  // Content permissions
  canCreatePosts: boolean;
  canEditPosts: boolean;
  canPublishPosts: boolean;
  canDeletePosts: boolean;
  
  // Project permissions
  canCreateProjects: boolean;
  canEditProjects: boolean;
  canViewProjectBids: boolean;
  canManageProjectBids: boolean;
  
  // Company permissions
  canCreateCompanies: boolean;
  canEditCompanies: boolean;
  canVerifyCompanies: boolean;
  
  // User management permissions
  canManageUsers: boolean;
  canInviteUsers: boolean;
  canViewUserAnalytics: boolean;
  
  // Admin permissions
  canAccessAdmin: boolean;
  canManageSettings: boolean;
  canViewAnalytics: boolean;
  canModerateContent: boolean;
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
  permissions: UserPermissions;
  profile: UserProfile;
  createdAt: string;
  updatedAt: string;
  lastActiveAt?: string;
  
  // Contributor-specific fields
  contributorStatus?: 'pending' | 'approved' | 'suspended';
  contributorSince?: string;
}

export interface UserProfile {
  fullName?: string;
  avatar?: string;
  bio?: string;
  company?: string;
  website?: string;
  location?: string;
  phone?: string;
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  fullName: string;
}

export interface AuthResponse {
  user: User | null;
  error?: string;
} 