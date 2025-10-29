import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatDate = (date: string): string => {
  const dateObj = new Date(date);
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  return dateObj.toLocaleDateString("en-US", options);
};

export function formatCurrency(
  amount: number | null | undefined | string,
  options?: Intl.NumberFormatOptions
): string {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

  if (numericAmount === null || numericAmount === undefined || isNaN(numericAmount)) {
    return "$--";
  }

  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    ...options,
  });

  return formatter.format(numericAmount);
}

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

export function getImageUrl(image: any): string | null {
  if (!image) return null;

  if (Array.isArray(image)) {
    const firstImage = image[0];
    if (firstImage) {
      if (firstImage.url) {
        return firstImage.url;
      }
      if (typeof firstImage === 'string') {
        return firstImage;
      }
    }
    return null;
  }

  if (typeof image === 'object' && image.url) {
    return image.url;
  }

  if (typeof image === 'string') {
    return image;
  }

  return null;
}

// Re-export navigation utilities
export {
  getPostUrl,
  getCitySlugFromName,
  getNeighborhoodSlugFromName,
  getNeighborhoodNameFromSlug,
  getCityNameFromSlug,
  getSupportedCities,
  getCitiesAsObjects,
  navigateToTab,
  supportedCities,
  type City,
  type Neighborhood
} from './navigation';

// Re-export address utilities
export { normalizeAddress } from './address';

// Re-export browser utilities
export {
  scheduleIdleCallback,
  isRequestIdleCallbackSupported,
  createSafeResizeObserver,
  isResizeObserverSupported
} from './browser';
