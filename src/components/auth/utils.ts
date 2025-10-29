// Authentication utility functions

import { UserRole, UserPermissions } from './types';

export function getDefaultPermissions(role: UserRole): UserPermissions {
  switch (role) {
    case 'admin':
      return {
        canCreatePosts: true,
        canEditPosts: true,
        canPublishPosts: true,
        canDeletePosts: true,
        canCreateProjects: true,
        canEditProjects: true,
        canViewProjectBids: true,
        canManageProjectBids: true,
        canCreateCompanies: true,
        canEditCompanies: true,
        canVerifyCompanies: true,
        canManageUsers: true,
        canInviteUsers: true,
        canViewUserAnalytics: true,
        canAccessAdmin: true,
        canManageSettings: true,
        canViewAnalytics: true,
        canModerateContent: true,
      };
    case 'contributor':
      return {
        canCreatePosts: true,
        canEditPosts: true,
        canPublishPosts: false, // TBD: Requires approval
        canDeletePosts: false,
        canCreateProjects: false,
        canEditProjects: false,
        canViewProjectBids: false,
        canManageProjectBids: false,
        canCreateCompanies: false,
        canEditCompanies: false,
        canVerifyCompanies: false,
        canManageUsers: false,
        canInviteUsers: false,
        canViewUserAnalytics: false,
        canAccessAdmin: false,
        canManageSettings: false,
        canViewAnalytics: false,
        canModerateContent: false,
      };
    case 'user':
      return {
        canCreatePosts: false,
        canEditPosts: false,
        canPublishPosts: false,
        canDeletePosts: false,
        canCreateProjects: true,
        canEditProjects: true,
        canViewProjectBids: true,
        canManageProjectBids: true,
        canCreateCompanies: true,
        canEditCompanies: true,
        canVerifyCompanies: false,
        canManageUsers: false,
        canInviteUsers: false,
        canViewUserAnalytics: false,
        canAccessAdmin: false,
        canManageSettings: false,
        canViewAnalytics: false,
        canModerateContent: false,
      };
    case 'guest':
    default:
      return {
        canCreatePosts: false,
        canEditPosts: false,
        canPublishPosts: false,
        canDeletePosts: false,
        canCreateProjects: false,
        canEditProjects: false,
        canViewProjectBids: false,
        canManageProjectBids: false,
        canCreateCompanies: false,
        canEditCompanies: false,
        canVerifyCompanies: false,
        canManageUsers: false,
        canInviteUsers: false,
        canViewUserAnalytics: false,
        canAccessAdmin: false,
        canManageSettings: false,
        canViewAnalytics: false,
        canModerateContent: false,
      };
  }
}
