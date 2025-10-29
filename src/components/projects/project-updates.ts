import { Project, ProjectUpdate, ProjectWithUpdates } from './types';

export interface ProjectFieldDiff {
  field: string;
  old_value: any;
  new_value: any;
  update_id: string;
  update_date: string | null;
  update_type: string | null;
}

/**
 * Merges project updates into the base project data
 * Updates are applied in chronological order
 */
export function mergeProjectWithUpdates(
  baseProject: Project,
  updates: ProjectUpdate[]
): ProjectWithUpdates {
  if (!updates || updates.length === 0) {
    return { ...baseProject, updates: [] };
  }

  let mergedProject = { ...baseProject };

  // Sort updates by date (earliest first)
  const sortedUpdates = [...updates].sort((a, b) => {
    const dateA = a.update_date ? new Date(a.update_date).getTime() : 0;
    const dateB = b.update_date ? new Date(b.update_date).getTime() : 0;
    return dateA - dateB;
  });

  // Apply each update in chronological order
  for (const update of sortedUpdates) {
    // Apply field updates
    if (update.updated_fields) {
      // Merge the updated fields into the project
      Object.entries(update.updated_fields).forEach(([field, value]) => {
        (mergedProject as any)[field] = value;
      });
    }

    // Apply status updates
    if (update.status) {
      mergedProject.status = update.status;
    }
  }

  return {
    ...mergedProject,
    updates: sortedUpdates
  };
}

/**
 * Generates a list of field differences from project updates
 */
export function generateProjectDiffs(
  baseProject: Project,
  updates: ProjectUpdate[]
): ProjectFieldDiff[] {
  if (!updates || updates.length === 0) {
    return [];
  }

  const diffs: ProjectFieldDiff[] = [];
  let currentState = { ...baseProject };

  // Sort updates by date (earliest first)
  const sortedUpdates = [...updates].sort((a, b) => {
    const dateA = a.update_date ? new Date(a.update_date).getTime() : 0;
    const dateB = b.update_date ? new Date(b.update_date).getTime() : 0;
    return dateA - dateB;
  });

  for (const update of sortedUpdates) {
    // Handle updated_fields (snake_case from database)
    if (update.updated_fields) {
      Object.entries(update.updated_fields).forEach(([field, newValue]) => {
        const oldValue = (currentState as any)[field];
        
        // Only add diff if values are actually different
        if (oldValue !== newValue) {
          diffs.push({
            field,
            old_value: oldValue,
            new_value: newValue,
            update_id: update.update_id,
            update_date: update.update_date,
            update_type: update.update_type
          });
          
          // Update current state
          (currentState as any)[field] = newValue;
        }
      });
    }

    // Handle status changes
    if (update.status && update.status !== currentState.status) {
      diffs.push({
        field: 'status',
        old_value: currentState.status,
        new_value: update.status,
        update_id: update.update_id,
        update_date: update.update_date,
        update_type: update.update_type
      });
      currentState.status = update.status;
    }
  }

  return diffs;
}

/**
 * Formats field names for display
 */
export function formatFieldName(field: string): string {
  const fieldMap: Record<string, string> = {
    'floors': 'Floors',
    'height_ft': 'Height (ft)',
    'unit_count': 'Unit Count',
    'project_cost': 'Project Cost',
    'completion_date': 'Completion Date',
    'construction_start_date': 'Construction Start Date',
    'status': 'Status',
    'building_area': 'Building Area',
    'lot_area': 'Lot Area',
    'zoning': 'Zoning',
    'land_use': 'Land Use'
  };

  return fieldMap[field] || field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Formats field values for display
 */
export function formatFieldValue(field: string, value: any): string {
  if (value === null || value === undefined) {
    return 'Not specified';
  }

  switch (field) {
    case 'project_cost':
    case 'assessed_value':
      return typeof value === 'number' ? `$${value.toLocaleString()}` : value.toString();
    
    case 'height_ft':
    case 'floors':
    case 'unit_count':
      return typeof value === 'number' ? value.toLocaleString() : value.toString();
    
    case 'building_area':
    case 'lot_area':
      return typeof value === 'number' ? `${value.toLocaleString()} sq ft` : value.toString();
    
    case 'completion_date':
    case 'construction_start_date':
    case 'start_date':
      return value ? new Date(value).toLocaleDateString() : 'Not specified';
    
    case 'status':
      return value.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
    
    default:
      return value.toString();
  }
}