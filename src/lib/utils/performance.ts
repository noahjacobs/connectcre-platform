// Debounce function
export function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

// Generate cache key function
export const generateCacheKey = (base: string, params: Record<string, any> = {}): string => {
  const sortedParams = Object.keys(params).sort().map(key => `${key}=${params[key]}`).join('&');
  return `${base}${sortedParams ? `?${sortedParams}` : ''}`;
}; 