// Enhanced Debugging & Logging System
const isDev = process.env.NODE_ENV === 'development'
const DEBUG = process.env.DEBUG === 'true' || isDev

// Color codes for terminal output (Node.js only)
const isNode = typeof process !== 'undefined' && process.versions && process.versions.node

const colors = isNode ? {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
} : {
  reset: '',
  bright: '',
  dim: '',
  red: '',
  green: '',
  yellow: '',
  blue: '',
  magenta: '',
  cyan: '',
  white: '',
}

// Get timestamp
const timestamp = () => {
  const now = new Date()
  return now.toISOString().split('T')[1].split('.')[0] // HH:MM:SS
}

// Format log message with timestamp and color
const formatLog = (level: string, color: string, ...args: any[]) => {
  const time = `${colors.dim}[${timestamp()}]${colors.reset}`
  const levelTag = `${color}${level}${colors.reset}`
  return [time, levelTag, ...args]
}

export const logger = {
  // Regular log - development only
  log: (...args: any[]) => {
    if (isDev) console.log(...formatLog('🔵 LOG', colors.blue, ...args))
  },
  
  // Errors - always logged with full stack trace
  error: (...args: any[]) => {
    console.error(...formatLog('❌ ERROR', colors.red, ...args))
    // In production, you could send to error tracking service here
    if (!isDev && typeof window === 'undefined') {
      // Server-side production error - could send to Sentry, etc.
    }
  },
  
  // Warnings - development only
  warn: (...args: any[]) => {
    if (isDev) console.warn(...formatLog('⚠️  WARN', colors.yellow, ...args))
  },
  
  // Info - development only
  info: (...args: any[]) => {
    if (isDev) console.info(...formatLog('ℹ️  INFO', colors.cyan, ...args))
  },
  
  // Success messages
  success: (...args: any[]) => {
    if (isDev) console.log(...formatLog('✅ SUCCESS', colors.green, ...args))
  },
  
  // Debug - only when DEBUG=true
  debug: (...args: any[]) => {
    if (DEBUG) console.log(...formatLog('🐛 DEBUG', colors.magenta, ...args))
  },
  
  // AI performance tracking
  ai: (feature: string, model: string, tokens?: number, duration?: number) => {
    if (isDev) {
      const tokenInfo = tokens ? `${tokens} tokens` : 'N/A'
      const durationInfo = duration ? `${duration}ms` : 'N/A'
      console.log(...formatLog('🤖 AI', colors.cyan, `[${feature}]`, `Model: ${model}`, `| ${tokenInfo}`, `| ${durationInfo}`))
    }
  },
  
  // API request tracking
  api: (method: string, endpoint: string, status?: number, duration?: number) => {
    if (isDev) {
      const statusColor = status && status >= 200 && status < 300 ? colors.green : status && status >= 400 ? colors.red : colors.yellow
      const statusInfo = status ? `${statusColor}${status}${colors.reset}` : 'pending'
      const durationInfo = duration ? `${duration}ms` : 'N/A'
      console.log(...formatLog('🌐 API', colors.blue, `${method} ${endpoint}`, `| Status: ${statusInfo}`, `| ${durationInfo}`))
    }
  },
  
  // Database query tracking
  db: (operation: string, table: string, duration?: number) => {
    if (isDev) {
      const durationInfo = duration ? `${duration}ms` : 'N/A'
      console.log(...formatLog('💾 DB', colors.magenta, `${operation} on ${table}`, `| ${durationInfo}`))
    }
  },
  
  // Performance measurement
  perf: (label: string, startTime: number) => {
    if (isDev) {
      const duration = Date.now() - startTime
      const color = duration < 100 ? colors.green : duration < 500 ? colors.yellow : colors.red
      console.log(...formatLog('⚡ PERF', color, `${label}: ${duration}ms`))
    }
  },
  
  // Group logs together
  group: (label: string) => {
    if (isDev) {
      console.group(`${colors.bright}${colors.blue}▶ ${label}${colors.reset}`)
    }
  },
  
  groupEnd: () => {
    if (isDev) console.groupEnd()
  },
  
  // Table display for objects
  table: (data: any) => {
    if (isDev) console.table(data)
  },
  
  // Trace execution path
  trace: (...args: any[]) => {
    if (DEBUG) {
      console.log(...formatLog('🔍 TRACE', colors.white, ...args))
      console.trace()
    }
  }
}
