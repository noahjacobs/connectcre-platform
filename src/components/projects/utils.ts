// Project utility functions

import { Project, ProjectStatus } from './types';

export function getProjectStatusColor(status: ProjectStatus): string {
  switch (status) {
    case 'proposed':
      return 'text-yellow-600 bg-yellow-50';
    case 'approved':
      return 'text-blue-600 bg-blue-50';
    case 'under_construction':
      return 'text-orange-600 bg-orange-50';
    case 'completed':
      return 'text-green-600 bg-green-50';
    case 'cancelled':
      return 'text-red-600 bg-red-50';
    case 'on_hold':
      return 'text-gray-600 bg-gray-50';
    default:
      return 'text-gray-600 bg-gray-50';
  }
}

export function getProjectStatusLabel(status: ProjectStatus): string {
  switch (status) {
    case 'proposed':
      return 'Proposed';
    case 'approved':
      return 'Approved';
    case 'under_construction':
      return 'Under Construction';
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    case 'on_hold':
      return 'On Hold';
    default:
      return 'Unknown';
  }
}

export function generateProjectSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function formatProjectAddress(project: Project): string {
  return project.address || 'Address not available';
}

// TODO: Move address normalization function here from lib/utils.ts
