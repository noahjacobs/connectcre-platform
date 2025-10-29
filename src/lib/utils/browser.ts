/**
 * Browser compatibility utilities
 * Provides polyfills and fallbacks for browser APIs that may not be universally supported
 */

/**
 * Schedule a callback to run when the browser is idle, with fallback for unsupported browsers
 * @param callback The function to run when idle
 * @param options Options for requestIdleCallback (only used if native support exists)
 */
export function scheduleIdleCallback(
  callback: () => void,
  options?: { timeout?: number }
): void {
  if (typeof window !== 'undefined' && typeof requestIdleCallback !== 'undefined') {
    // Use native requestIdleCallback if available
    requestIdleCallback(callback, options);
  } else {
    // Fallback for Safari and other browsers that don't support requestIdleCallback
    // Use setTimeout with 0ms delay to defer execution to next tick
    setTimeout(callback, 0);
  }
}

/**
 * Check if requestIdleCallback is supported in the current browser
 */
export function isRequestIdleCallbackSupported(): boolean {
  return typeof window !== 'undefined' && typeof requestIdleCallback !== 'undefined';
}

/**
 * Safe ResizeObserver with fallback for unsupported browsers
 * @param callback The resize callback function
 */
export function createSafeResizeObserver(
  callback: (entries: ResizeObserverEntry[]) => void
): {
  observe: (element: Element) => void;
  disconnect: () => void;
} | null {
  if (typeof window !== 'undefined' && typeof ResizeObserver !== 'undefined') {
    const observer = new ResizeObserver(callback);
    return {
      observe: (element: Element) => observer.observe(element),
      disconnect: () => observer.disconnect(),
    };
  }
  
  // For browsers without ResizeObserver, return null
  // The calling code should handle graceful degradation
  return null;
}

/**
 * Check if ResizeObserver is supported in the current browser
 */
export function isResizeObserverSupported(): boolean {
  return typeof window !== 'undefined' && typeof ResizeObserver !== 'undefined';
} 