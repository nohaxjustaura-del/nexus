import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

// Debug endpoint to check logging and system status
export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now()
    
    logger.debug('DEBUG', 'Debug endpoint accessed')
    logger.info('DEBUG', 'System status check')
    
    // Test all log levels
    logger.debug('DEBUG', 'Debug message test')
    logger.info('DEBUG', 'Info message test')
    logger.warn('DEBUG', 'Warning message test')
    logger.error('DEBUG', 'Error message test (this is intentional)')
    
    const duration = Date.now() - startTime
    logger.performance('DEBUG_ENDPOINT', duration)
    
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      debugMode: process.env.DEBUG === 'true',
      logLevel: process.env.LOG_LEVEL || 'default',
      duration: `${duration}ms`,
      message: 'Debug endpoint working. Check console for logs.',
    })
  } catch (error: any) {
    logger.error('DEBUG', 'Debug endpoint error:', error)
    return NextResponse.json(
      { error: 'Debug endpoint failed', message: error.message },
      { status: 500 }
    )
  }
}




