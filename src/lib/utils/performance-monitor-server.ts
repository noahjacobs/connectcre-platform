// ==================================
// SERVER-SIDE PERFORMANCE MONITORING
// ==================================
// This is optimized for server-side operations with zero performance impact when disabled

// Set this to true/false to enable/disable all server-side performance logging
const PERFORMANCE_MONITORING_ENABLED = false;

// No-op functions when disabled (zero overhead)
const noOpTimer = {
  end: () => {}
};

const createServerPerfLog = () => {
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

  // Server-side logging implementation
  return {
    log: (category: string, message: string, duration?: number, details?: any) => {
      const emoji = getServerEmojiForCategory(category);
      const durationText = duration !== undefined ? ` ${duration.toFixed(1)}ms` : '';
      console.log(`${emoji} [${category}] ${message}${durationText}`, details || '');
    },
    
    warn: (category: string, message: string, duration?: number, details?: any) => {
      const emoji = getServerEmojiForCategory(category);
      const durationText = duration !== undefined ? ` ${duration.toFixed(1)}ms` : '';
      console.warn(`${emoji} [${category}] ${message}${durationText}`, details || '');
    },
    
    error: (category: string, message: string, details?: any) => {
      const emoji = '❌';
      console.error(`${emoji} [${category}] ${message}`, details || '');
    },

    time: (category: string, operation: string) => {
      const startTime = Date.now();
      return {
        end: (additionalDetails?: any) => {
          const duration = Date.now() - startTime;
          const emoji = getServerEmojiForCategory(category);
          const durationText = ` ${duration.toFixed(1)}ms`;
          console.log(`${emoji} [${category}] ${operation} completed${durationText}`, additionalDetails || '');
          return duration;
        }
      };
    },

    isEnabled: () => PERFORMANCE_MONITORING_ENABLED
  };
};

function getServerEmojiForCategory(category: string): string {
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
    'Database': '🗃️',
    'ServerAction': '⚡',
    'APIRoute': '🌍'
  };
  return emojiMap[category] || '📊';
}

// ==================================
// ENHANCED SERVER-SIDE CONTEXT COLLECTION
// ==================================

// Helper to collect server-side performance context
function collectServerContext(): any {
  const context: any = {};
  
  // Node.js process metrics
  if (typeof process !== 'undefined') {
    const memUsage = process.memoryUsage();
    context.serverMetrics = {
      memoryUsage: {
        rss: memUsage.rss,
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external
      },
      uptime: process.uptime(),
      pid: process.pid,
      nodeVersion: process.version
    };
    
    // CPU usage if available
    if (process.cpuUsage) {
      context.serverMetrics.cpuUsage = process.cpuUsage();
    }
  }
  
  // Environment context
  context.environment = {
    nodeEnv: process.env.NODE_ENV,
    platform: process.platform,
    arch: process.arch
  };
  
  return context;
}

// Enhanced server perfLog with context collection
const createEnhancedServerPerfLog = () => {
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

  // Server-side logging implementation with enhanced context
  return {
    log: (category: string, message: string, duration?: number, details?: any) => {
      const emoji = getServerEmojiForCategory(category);
      const durationText = duration !== undefined ? ` ${duration.toFixed(1)}ms` : '';
      const context = collectServerContext();
      
      console.log(`${emoji} [${category}] ${message}${durationText}`, {
        ...details,
        serverContext: context,
        timestamp: new Date().toISOString()
      });
    },
    
    warn: (category: string, message: string, duration?: number, details?: any) => {
      const emoji = getServerEmojiForCategory(category);
      const durationText = duration !== undefined ? ` ${duration.toFixed(1)}ms` : '';
      const context = collectServerContext();
      
      console.warn(`${emoji} [${category}] ${message}${durationText}`, {
        ...details,
        serverContext: context,
        timestamp: new Date().toISOString()
      });
    },
    
    error: (category: string, message: string, details?: any) => {
      const emoji = '❌';
      const context = collectServerContext();
      
      console.error(`${emoji} [${category}] ${message}`, {
        ...details,
        serverContext: context,
        timestamp: new Date().toISOString()
      });
    },

    time: (category: string, operation: string) => {
      const startTime = Date.now();
      const startContext = collectServerContext();
      
      return {
        end: (additionalDetails?: any) => {
          const duration = Date.now() - startTime;
          const endContext = collectServerContext();
          const emoji = getServerEmojiForCategory(category);
          const durationText = ` ${duration.toFixed(1)}ms`;
          
          // Calculate memory delta
          const memoryDelta = endContext.serverMetrics?.memoryUsage?.heapUsed - 
                             startContext.serverMetrics?.memoryUsage?.heapUsed;
          
          console.log(`${emoji} [${category}] ${operation} completed${durationText}`, {
            ...additionalDetails,
            serverContext: {
              ...endContext,
              memoryDelta: memoryDelta ? `${(memoryDelta / 1024 / 1024).toFixed(2)}MB` : undefined
            },
            timestamp: new Date().toISOString()
          });
          
          return duration;
        }
      };
    },

    isEnabled: () => PERFORMANCE_MONITORING_ENABLED
  };
};

// Export the enhanced server-side performance logging API
export const serverPerfLog = createEnhancedServerPerfLog(); 