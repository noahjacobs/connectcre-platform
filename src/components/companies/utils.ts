// companies utility functions - TODO: implement

/**
 * Formats an array of categories for display
 * @param categories - Array of category strings
 * @param maxDisplay - Maximum number of categories to show before truncating (default: 3)
 * @returns Formatted display string or JSX elements for rendering
 */
export function formatCategoriesForDisplay(
  categories: string[] | string | null | undefined,
  maxDisplay: number = 3
): { displayText: string; hasMore: boolean; totalCount: number } {
  if (!categories) {
    return { displayText: '', hasMore: false, totalCount: 0 };
  }

  // Handle single string (backward compatibility)
  const categoryArray = Array.isArray(categories) ? categories : [categories];
  
  if (categoryArray.length === 0) {
    return { displayText: '', hasMore: false, totalCount: 0 };
  }

  if (categoryArray.length <= maxDisplay) {
    return {
      displayText: categoryArray.join(', '),
      hasMore: false,
      totalCount: categoryArray.length
    };
  }

  const displayCategories = categoryArray.slice(0, maxDisplay);
  const remainingCount = categoryArray.length - maxDisplay;
  
  return {
    displayText: `${displayCategories.join(', ')} +${remainingCount} more`,
    hasMore: true,
    totalCount: categoryArray.length
  };
}

/**
 * Gets the primary category from an array of categories
 * @param categories - Array of category strings
 * @returns First category or 'Other' as fallback
 */
export function getPrimaryCategory(categories: string[] | string | null | undefined): string {
  if (!categories) {
    return 'Other';
  }

  const categoryArray = Array.isArray(categories) ? categories : [categories];
  return categoryArray[0] || 'Other';
}

/**
 * Checks if categories include a specific role
 * @param categories - Array of category strings
 * @param role - Role to check for
 * @returns Whether the role is included
 */
export function hasCategory(categories: string[] | string | null | undefined, role: string): boolean {
  if (!categories) {
    return false;
  }

  const categoryArray = Array.isArray(categories) ? categories : [categories];
  return categoryArray.includes(role);
}
