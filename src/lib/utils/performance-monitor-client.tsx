'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, Activity, Clock, Zap, Filter, Download, Trash2 } from 'lucide-react';

// ==================================
// PERFORMANCE MONITORING CONFIGURATION
// ==================================
// Set this to true/false to enable/disable all performance logging
// This is the ONLY place you need to change to turn on/off monitoring
const PERFORMANCE_MONITORING_ENABLED = true;

// Category configuration
const PERFORMANCE_CONFIG = {
  enabled: PERFORMANCE_MONITORING_ENABLED,
  categories: {
    'CitySelect': { enabled: true, color: 'bg-blue-100 text-blue-800' },
    'FetchCityData': { enabled: true, color: 'bg-green-100 text-green-800' },
    'FetchArticles': { enabled: true, color: 'bg-purple-100 text-purple-800' },
    'GetFilteredProjectIds': { enabled: true, color: 'bg-orange-100 text-orange-800' },
    'FetchProjectsForMap': { enabled: true, color: 'bg-red-100 text-red-800' },
    'Map': { enabled: true, color: 'bg-indigo-100 text-indigo-800' },
    'InitEffect': { enabled: true, color: 'bg-gray-100 text-gray-800' },
    'FilterEffect': { enabled: true, color: 'bg-yellow-100 text-yellow-800' },
    'ScrollEffect': { enabled: true, color: 'bg-pink-100 text-pink-800' },
    'RequestCleanup': { enabled: true, color: 'bg-teal-100 text-teal-800' },
    'FetchSearchData': { enabled: true, color: 'bg-cyan-100 text-cyan-800' },
    'FetchActionData': { enabled: true, color: 'bg-lime-100 text-lime-800' },
    'Cache': { enabled: true, color: 'bg-amber-100 text-amber-800' },
    'System': { enabled: true, color: 'bg-slate-100 text-slate-800' }
  } as const
};

interface PerformanceLog {
  timestamp: number;
  operation: string;
  duration: number;
  details?: any;
  type: 'info' | 'warning' | 'error';
  category: string;
  location: string;
     // Enhanced performance context
   performanceContext?: {
     // System metrics
     memoryUsage?: {
       usedJSHeapSize?: number;
       totalJSHeapSize?: number;
       jsHeapSizeLimit?: number;
       delta?: number;
     };
    // Network conditions
    networkInfo?: {
      effectiveType?: string;
      downlink?: number;
      rtt?: number;
      saveData?: boolean;
    };
    // Browser performance
    browserMetrics?: {
      domContentLoaded?: number;
      firstContentfulPaint?: number;
      largestContentfulPaint?: number;
      cumulativeLayoutShift?: number;
      firstInputDelay?: number;
    };
    // React/Component specific
    reactContext?: {
      renderCount?: number;
      componentStack?: string;
      propsSize?: number;
      stateSize?: number;
    };
    // Database/API specific
    databaseContext?: {
      queryComplexity?: 'simple' | 'medium' | 'complex';
      indexUsage?: string[];
      recordsScanned?: number;
      recordsReturned?: number;
      cacheHit?: boolean;
      connectionPoolSize?: number;
    };
    // User interaction context
    userContext?: {
      sessionDuration?: number;
      interactionCount?: number;
      deviceType?: 'mobile' | 'tablet' | 'desktop';
      viewportSize?: { width: number; height: number };
    };
    // Request context
    requestContext?: {
      concurrent?: number;
      queueDepth?: number;
      retryCount?: number;
      aborted?: boolean;
      fromCache?: boolean;
    };
    // Performance bottlenecks
    bottlenecks?: {
      cpuIntensive?: boolean;
      memoryIntensive?: boolean;
      networkBound?: boolean;
      diskBound?: boolean;
      renderBlocking?: boolean;
    };
  };
 }

// ==================================
// EFFICIENT PERFORMANCE LOGGING API
// ==================================
// This is optimized to have ZERO performance impact when disabled

// No-op functions when disabled (zero overhead)
const noOpTimer = {
  end: () => {}
};

const createPerfLog = () => {
  // If disabled, return no-op functions (zero overhead)
  if (!PERFORMANCE_MONITORING_ENABLED) {
    return {
      log: () => {},
      warn: () => {},
      error: () => {},
      time: () => noOpTimer,
      isEnabled: () => false
    };
  }

  // Only create the actual logging system if enabled
  const getLogger = () => {
    return getGlobalLogger();
  };

  return {
    log: (category: string, message: string, duration?: number, details?: any) => {
      if (typeof window !== 'undefined') {
        const logger = getLogger();
        if (logger) {
          logger.addLogEntry({
            timestamp: Date.now(),
            operation: message,
            duration: duration || 0,
            details: details,
            type: 'info',
            category,
            location: category
          });
        }
      }
    },
    
    warn: (category: string, message: string, duration?: number, details?: any) => {
      if (typeof window !== 'undefined') {
        const logger = getLogger();
        if (logger) {
          logger.addLogEntry({
            timestamp: Date.now(),
            operation: message,
            duration: duration || 0,
            details: details,
            type: 'warning',
            category,
            location: category
          });
        }
      }
    },
    
    error: (category: string, message: string, details?: any) => {
      if (typeof window !== 'undefined') {
        const logger = getLogger();
        if (logger) {
          logger.addLogEntry({
            timestamp: Date.now(),
            operation: message,
            duration: 0,
            details: details,
            type: 'error',
            category,
            location: category
          });
        }
      }
    },

    time: (category: string, operation: string) => {
      if (typeof window === 'undefined') {
        return noOpTimer;
      }
      
      const startTime = performance.now();
      return {
        end: (additionalDetails?: any) => {
          const duration = performance.now() - startTime;
          const logger = getLogger();
          if (logger) {
            logger.addLogEntry({
              timestamp: Date.now(),
              operation: `${operation} completed`,
              duration,
              details: additionalDetails,
              type: 'info',
              category,
              location: category
            });
          }
          return duration;
        }
      };
    },

    isEnabled: () => PERFORMANCE_MONITORING_ENABLED
  };
};

function getEmojiForCategory(category: string): string {
  const emojiMap: Record<string, string> = {
    'CitySelect': '🏙️',
    'FetchCityData': '📊',
    'FetchArticles': '🗄️',
    'GetFilteredProjectIds': '🎯',
    'FetchProjectsForMap': '🗺️',
    'Map': '🌐',
    'InitEffect': '🚀',
    'FilterEffect': '🎛️',
    'ScrollEffect': '📜',
    'RequestCleanup': '🧹',
    'FetchSearchData': '🔍',
    'FetchActionData': '🎯',
    'Cache': '💽',
    'System': '⚙️'
  };
  return emojiMap[category] || '📊';
}

// Global logger instance for sharing between perfLog and UI
let globalLogger: PerformanceLogger | null = null;

function getGlobalLogger(): PerformanceLogger | null {
  if (!globalLogger && typeof window !== 'undefined' && PERFORMANCE_MONITORING_ENABLED) {
    globalLogger = new PerformanceLogger();
    // Add a test log to verify the system is working
    globalLogger.addLogEntry({
      timestamp: Date.now(),
      operation: 'Performance monitor initialized',
      duration: 0,
      details: { system: 'ready' },
      type: 'info',
      category: 'System',
      location: 'PerformanceMonitor'
    });
  }
  return globalLogger;
}

// ==================================
// ENHANCED PERFORMANCE CONTEXT COLLECTION
// ==================================

// Helper to collect system performance metrics
function collectSystemMetrics(): any {
  if (typeof window === 'undefined') return {};
  
  const metrics: any = {};
  
  // Memory usage
  if ('memory' in performance) {
    const memory = (performance as any).memory;
    metrics.memoryUsage = {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit
    };
  }
  
  // Network information
  if ('connection' in navigator) {
    const connection = (navigator as any).connection;
    metrics.networkInfo = {
      effectiveType: connection.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt,
      saveData: connection.saveData
    };
  }
  
  // Browser performance metrics
  try {
    const paintEntries = performance.getEntriesByType('paint');
    const navigationEntries = performance.getEntriesByType('navigation');
    
    metrics.browserMetrics = {};
    
    if (navigationEntries.length > 0) {
      const nav = navigationEntries[0] as PerformanceNavigationTiming;
      metrics.browserMetrics.domContentLoaded = nav.domContentLoadedEventEnd - nav.domContentLoadedEventStart;
    }
    
    paintEntries.forEach(entry => {
      if (entry.name === 'first-contentful-paint') {
        metrics.browserMetrics.firstContentfulPaint = entry.startTime;
      }
    });
    
    // Use PerformanceObserver for LCP and CLS instead of deprecated getEntriesByType
    if ('PerformanceObserver' in window) {
      try {
        // Use PerformanceObserver for LCP
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          if (entries.length > 0) {
            metrics.browserMetrics.largestContentfulPaint = entries[entries.length - 1].startTime;
          }
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        
        // Use PerformanceObserver for CLS
        const clsObserver = new PerformanceObserver((list) => {
          let cls = 0;
          for (const entry of list.getEntries()) {
            const layoutShiftEntry = entry as any;
            if (!layoutShiftEntry.hadRecentInput) {
              cls += layoutShiftEntry.value;
            }
          }
          metrics.browserMetrics.cumulativeLayoutShift = cls;
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
        
        // Disconnect observers after a short delay to avoid memory leaks
        setTimeout(() => {
          lcpObserver.disconnect();
          clsObserver.disconnect();
        }, 5000);
      } catch (e) {
        // PerformanceObserver might not be fully supported
      }
    }
  } catch (e) {
    // Performance API might not be fully supported
  }
  
  // User context
  metrics.userContext = {
    deviceType: window.innerWidth < 768 ? 'mobile' : window.innerWidth < 1024 ? 'tablet' : 'desktop',
    viewportSize: { width: window.innerWidth, height: window.innerHeight },
    sessionDuration: Date.now() - (window.performance?.timing?.navigationStart || Date.now())
  };
  
  return metrics;
}

// Helper to detect performance bottlenecks
function detectBottlenecks(duration: number, category: string, details?: any): any {
  const bottlenecks: any = {};
  
  // CPU intensive operations
  if (duration > 100 && ['InitEffect', 'FilterEffect', 'CitySelect'].includes(category)) {
    bottlenecks.cpuIntensive = true;
  }
  
  // Memory intensive operations
  if (typeof window !== 'undefined' && 'memory' in performance) {
    const memory = (performance as any).memory;
    if (memory.usedJSHeapSize > memory.totalJSHeapSize * 0.8) {
      bottlenecks.memoryIntensive = true;
    }
  }
  
  // Network bound operations
  if (duration > 1000 && ['FetchArticles', 'FetchCityData', 'FetchProjectsForMap'].includes(category)) {
    bottlenecks.networkBound = true;
  }
  
  // Render blocking operations
  if (duration > 16 && ['ScrollEffect', 'Map'].includes(category)) {
    bottlenecks.renderBlocking = true;
  }
  
  return Object.keys(bottlenecks).length > 0 ? bottlenecks : undefined;
}

// Enhanced perfLog with automatic context collection
const createEnhancedPerfLog = () => {
  const basePerfLog = createPerfLog();
  
  if (!PERFORMANCE_MONITORING_ENABLED) {
    return basePerfLog;
  }
  
  return {
    ...basePerfLog,
    
    log: (category: string, message: string, duration?: number, details?: any) => {
      const performanceContext = collectSystemMetrics();
      performanceContext.bottlenecks = detectBottlenecks(duration || 0, category, details);
      
      if (typeof window !== 'undefined') {
        const logger = getGlobalLogger();
        if (logger) {
          logger.addLogEntry({
            timestamp: Date.now(),
            operation: message,
            duration: duration || 0,
            details: details,
            type: 'info',
            category,
            location: category,
            performanceContext
          });
        }
      }
    },
    
    warn: (category: string, message: string, duration?: number, details?: any) => {
      const performanceContext = collectSystemMetrics();
      performanceContext.bottlenecks = detectBottlenecks(duration || 0, category, details);
      
      if (typeof window !== 'undefined') {
        const logger = getGlobalLogger();
        if (logger) {
          logger.addLogEntry({
            timestamp: Date.now(),
            operation: message,
            duration: duration || 0,
            details: details,
            type: 'warning',
            category,
            location: category,
            performanceContext
          });
        }
      }
    },
    
    time: (category: string, operation: string) => {
      if (typeof window === 'undefined') {
        return noOpTimer;
      }
      
      const startTime = performance.now();
      const startContext = collectSystemMetrics();
      
      return {
        end: (additionalDetails?: any) => {
          const duration = performance.now() - startTime;
          const endContext = collectSystemMetrics();
          
          // Calculate context differences
          const performanceContext = {
            ...endContext,
            bottlenecks: detectBottlenecks(duration, category, additionalDetails),
            requestContext: {
              ...additionalDetails?.requestContext,
              fromCache: additionalDetails?.fromCache || false
            }
          };
          
          // Add memory delta if available
          if (startContext.memoryUsage && endContext.memoryUsage) {
            performanceContext.memoryUsage.delta = 
              endContext.memoryUsage.usedJSHeapSize - startContext.memoryUsage.usedJSHeapSize;
          }
          
          const logger = getGlobalLogger();
          if (logger) {
            logger.addLogEntry({
              timestamp: Date.now(),
              operation: `${operation} completed`,
              duration,
              details: additionalDetails,
              type: 'info',
              category,
              location: category,
              performanceContext
            });
          }
          return duration;
        }
      };
    }
  };
};

// Export the enhanced performance logging API
export const perfLog = createEnhancedPerfLog();

// ==================================
// PERFORMANCE LOGGER CLASS (CLIENT-SIDE ONLY)
// ==================================
class PerformanceLogger {
  private logs: PerformanceLog[] = [];
  private subscribers: ((logs: PerformanceLog[]) => void)[] = [];

  constructor() {
    // Don't intercept console - only show perfLog entries in UI
  }

  // Console interception removed - only showing perfLog entries in UI

  private addLog(log: PerformanceLog) {
    this.logs = [...this.logs.slice(-99), log]; // Keep last 100 logs
    this.notifySubscribers();
  }

  public addLogEntry(log: PerformanceLog) {
    // Defer state updates to avoid updating during render
    setTimeout(() => {
      this.addLog(log);
    }, 0);
  }

  private notifySubscribers() {
    this.subscribers.forEach(callback => callback([...this.logs]));
  }

  subscribe(callback: (logs: PerformanceLog[]) => void): () => void {
    this.subscribers.push(callback);
    callback([...this.logs]); // Send current logs immediately
    
    return () => {
      const index = this.subscribers.indexOf(callback);
      if (index > -1) {
        this.subscribers.splice(index, 1);
      }
    };
  }

  clear() {
    this.logs = [];
    this.notifySubscribers();
  }

  getLogs(): PerformanceLog[] {
    return [...this.logs];
  }

  exportLogs(): string {
    const exportData = {
      timestamp: new Date().toISOString(),
      config: PERFORMANCE_CONFIG,
      logs: this.logs
    };
    return JSON.stringify(exportData, null, 2);
  }

  // Console restoration removed - no longer intercepting console
}

// ==================================
// PERFORMANCE MONITOR UI COMPONENT
// ==================================
export function PerformanceMonitor() {
  const [isVisible, setIsVisible] = useState(false);
  const [logs, setLogs] = useState<PerformanceLog[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  useEffect(() => {
    if (!PERFORMANCE_MONITORING_ENABLED) return;
    
    const logger = getGlobalLogger();
    if (!logger) return;
    
    const unsubscribe = logger.subscribe(setLogs);
    return unsubscribe;
  }, []);

  const clearLogs = () => {
    const logger = getGlobalLogger();
    if (logger) {
      logger.clear();
    }
    setLogs([]);
  };

  const exportLogs = () => {
    const logger = getGlobalLogger();
    const logsToExport = logger ? logger.getLogs() : logs;
    
    const exportData = {
      timestamp: new Date().toISOString(),
      config: PERFORMANCE_CONFIG,
      logs: logsToExport
    };
    const data = JSON.stringify(exportData, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-logs-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const getCategoryColor = (category: string) => {
    return PERFORMANCE_CONFIG.categories[category as keyof typeof PERFORMANCE_CONFIG.categories]?.color || 'bg-gray-100 text-gray-800';
  };

  const getSlowOperations = () => {
    return logs.filter(log => log.duration > 1000).slice(-10);
  };

  const filteredLogs = filterCategory === 'all' 
    ? logs 
    : logs.filter(log => log.category === filterCategory);

  const categories = ['all', ...Object.keys(PERFORMANCE_CONFIG.categories)];

  // Don't render anything if monitoring is disabled
  if (!PERFORMANCE_MONITORING_ENABLED) {
    return null;
  }

  if (!isVisible) {
    return (
      <Button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 z-50"
        size="sm"
        variant="outline"
      >
        <Activity className="h-4 w-4 mr-0.5" />
        Performance 
        {/* <Badge className="ml-1 h-4 w-4 p-0 bg-green-500" /> */}
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 z-50 w-[480px] max-h-[600px] overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center">
            <Activity className="h-4 w-4 mr-0.5" />
            Performance Monitor
            <Badge className="ml-2 bg-green-100 text-green-800">ON</Badge>
          </CardTitle>
          <Button
            onClick={() => setIsVisible(false)}
            size="sm"
            variant="ghost"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={clearLogs}
            size="sm"
            variant="outline"
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Clear
          </Button>
          <Button
            onClick={exportLogs}
            size="sm"
            variant="outline"
            disabled={logs.length === 0}
          >
            <Download className="h-3 w-3 mr-1" />
            Export
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-3 w-3" />
          <select 
            value={filterCategory} 
            onChange={(e) => setFilterCategory(e.target.value)}
            className="text-xs border rounded px-2 py-1"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat === 'all' ? 'All Categories' : cat}
              </option>
            ))}
          </select>
        </div>
      </CardHeader>
      
      <CardContent className="p-3">
        <div className="space-y-2">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="text-center p-2 bg-gray-50 rounded">
              <div className="font-bold text-lg">{filteredLogs.length}</div>
              <div className="text-gray-600">Total Logs</div>
            </div>
            <div className="text-center p-2 bg-yellow-50 rounded">
              <div className="font-bold text-lg text-yellow-600">{getSlowOperations().length}</div>
              <div className="text-gray-600">Slow Ops</div>
            </div>
            <div className="text-center p-2 bg-green-50 rounded">
              <div className="font-bold text-lg text-green-600">
                {filteredLogs.length > 0 ? Math.round(filteredLogs.reduce((acc, log) => acc + log.duration, 0) / filteredLogs.length) : 0}ms
              </div>
              <div className="text-gray-600">Avg Time</div>
            </div>
          </div>

          {/* Slow Operations Alert */}
          {getSlowOperations().length > 0 && (
            <div className="border-l-4 border-yellow-400 bg-yellow-50 p-2">
              <div className="flex items-center text-sm text-yellow-800">
                <Clock className="h-4 w-4 mr-1" />
                {getSlowOperations().length} slow operations detected (greater than 1s)
              </div>
            </div>
          )}
          
          {/* Recent Logs */}
          <div className="max-h-80 overflow-y-auto space-y-1">
            {filteredLogs.slice(-50).reverse().map((log, index) => (
              <div key={index} className="text-xs border rounded p-2 hover:bg-gray-50">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1">
                    <Badge className={getCategoryColor(log.category)}>
                      {log.category}
                    </Badge>
                    <Badge className={getTypeColor(log.type)}>
                      {log.type}
                    </Badge>
                  </div>
                  <div className="flex items-center text-gray-500">
                    {log.duration > 0 && (
                      <>
                        <Clock className="h-3 w-3 mr-1" />
                        <span className={log.duration > 1000 ? 'text-red-600 font-bold' : log.duration > 500 ? 'text-yellow-600 font-medium' : ''}>
                          {log.duration.toFixed(1)}ms
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-gray-700 text-xs leading-relaxed">
                  {getEmojiForCategory(log.category)} {log.operation}
                </div>
                <div className="text-gray-400 text-xs mt-1">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </div>
                {(log.details || log.performanceContext) && (
                  <details className="mt-1">
                    <summary className="text-gray-500 cursor-pointer text-xs flex items-center gap-1">
                      <span>Performance Details</span>
                      {log.performanceContext?.bottlenecks && (
                        <Badge className="bg-red-100 text-red-800 text-xs">Bottlenecks</Badge>
                      )}
                    </summary>
                    <div className="mt-1 space-y-2">
                      {/* Basic Details */}
                      {log.details && (
                        <div>
                          <div className="text-xs font-medium text-gray-600 mb-1">Operation Details:</div>
                          <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-20">
                            {typeof log.details === 'object' 
                              ? JSON.stringify(log.details, null, 2)
                              : String(log.details)
                            }
                          </pre>
                        </div>
                      )}
                      
                      {/* Performance Context */}
                      {log.performanceContext && (
                        <div className="space-y-2">
                          {/* Bottlenecks Alert */}
                          {log.performanceContext.bottlenecks && (
                            <div className="bg-red-50 border border-red-200 rounded p-2">
                              <div className="text-xs font-medium text-red-800 mb-1">⚠️ Performance Bottlenecks:</div>
                              <div className="text-xs text-red-700 space-y-1">
                                {log.performanceContext.bottlenecks.cpuIntensive && <div>• CPU Intensive Operation</div>}
                                {log.performanceContext.bottlenecks.memoryIntensive && <div>• High Memory Usage</div>}
                                {log.performanceContext.bottlenecks.networkBound && <div>• Network Bound Operation</div>}
                                {log.performanceContext.bottlenecks.renderBlocking && <div>• Render Blocking</div>}
                              </div>
                            </div>
                          )}
                          
                                                     {/* Memory Usage */}
                           {log.performanceContext.memoryUsage && (
                             <div className="bg-blue-50 border border-blue-200 rounded p-2">
                               <div className="text-xs font-medium text-blue-800 mb-1">💾 Memory Usage:</div>
                               <div className="text-xs text-blue-700 grid grid-cols-2 gap-1">
                                 {log.performanceContext.memoryUsage.usedJSHeapSize && (
                                   <div>Used: {Math.round(log.performanceContext.memoryUsage.usedJSHeapSize / 1024 / 1024)}MB</div>
                                 )}
                                 {log.performanceContext.memoryUsage.totalJSHeapSize && (
                                   <div>Total: {Math.round(log.performanceContext.memoryUsage.totalJSHeapSize / 1024 / 1024)}MB</div>
                                 )}
                                 {log.performanceContext.memoryUsage.delta && (
                                   <div className="col-span-2">
                                     Delta: {log.performanceContext.memoryUsage.delta > 0 ? '+' : ''}{Math.round(log.performanceContext.memoryUsage.delta / 1024)}KB
                                   </div>
                                 )}
                               </div>
                             </div>
                           )}
                          
                          {/* Network Info */}
                          {log.performanceContext.networkInfo && (
                            <div className="bg-green-50 border border-green-200 rounded p-2">
                              <div className="text-xs font-medium text-green-800 mb-1">🌐 Network:</div>
                              <div className="text-xs text-green-700 grid grid-cols-2 gap-1">
                                <div>Type: {log.performanceContext.networkInfo.effectiveType}</div>
                                <div>Speed: {log.performanceContext.networkInfo.downlink}Mbps</div>
                                <div>RTT: {log.performanceContext.networkInfo.rtt}ms</div>
                                {log.performanceContext.networkInfo.saveData && <div className="col-span-2 text-orange-600">Data Saver ON</div>}
                              </div>
                            </div>
                          )}
                          
                          {/* Browser Metrics */}
                          {log.performanceContext.browserMetrics && Object.keys(log.performanceContext.browserMetrics).length > 0 && (
                            <div className="bg-purple-50 border border-purple-200 rounded p-2">
                              <div className="text-xs font-medium text-purple-800 mb-1">🚀 Browser Metrics:</div>
                              <div className="text-xs text-purple-700 space-y-1">
                                {log.performanceContext.browserMetrics.firstContentfulPaint && (
                                  <div>FCP: {Math.round(log.performanceContext.browserMetrics.firstContentfulPaint)}ms</div>
                                )}
                                {log.performanceContext.browserMetrics.largestContentfulPaint && (
                                  <div>LCP: {Math.round(log.performanceContext.browserMetrics.largestContentfulPaint)}ms</div>
                                )}
                                {log.performanceContext.browserMetrics.cumulativeLayoutShift && (
                                  <div>CLS: {log.performanceContext.browserMetrics.cumulativeLayoutShift.toFixed(3)}</div>
                                )}
                              </div>
                            </div>
                          )}
                          
                          {/* User Context */}
                          {log.performanceContext.userContext && (
                            <div className="bg-orange-50 border border-orange-200 rounded p-2">
                              <div className="text-xs font-medium text-orange-800 mb-1">👤 User Context:</div>
                              <div className="text-xs text-orange-700 grid grid-cols-2 gap-1">
                                <div>Device: {log.performanceContext.userContext.deviceType}</div>
                                <div>Viewport: {log.performanceContext.userContext.viewportSize?.width}x{log.performanceContext.userContext.viewportSize?.height}</div>
                                <div className="col-span-2">Session: {Math.round((log.performanceContext.userContext.sessionDuration || 0) / 1000)}s</div>
                              </div>
                            </div>
                          )}
                          
                          {/* Request Context */}
                          {log.performanceContext.requestContext && (
                            <div className="bg-teal-50 border border-teal-200 rounded p-2">
                              <div className="text-xs font-medium text-teal-800 mb-1">📡 Request Context:</div>
                              <div className="text-xs text-teal-700 space-y-1">
                                {log.performanceContext.requestContext.fromCache && <div>✅ Served from cache</div>}
                                {log.performanceContext.requestContext.concurrent && <div>Concurrent: {log.performanceContext.requestContext.concurrent}</div>}
                                {log.performanceContext.requestContext.retryCount && <div>Retries: {log.performanceContext.requestContext.retryCount}</div>}
                                {log.performanceContext.requestContext.aborted && <div className="text-red-600">❌ Request aborted</div>}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </details>
                )}
              </div>
            ))}
          </div>
          
          {filteredLogs.length === 0 && (
            <div className="text-center text-gray-500 text-sm py-4">
              Waiting for performance logs...
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 