# 🐛 Debugging & Logging Guide

## Enhanced Logger System

Your app now has a comprehensive logging system in `lib/logger.ts`.

### Available Log Levels

```typescript
import { logger } from '@/lib/logger'

// Regular logs (dev only)
logger.log('This is a regular log message')

// Errors (always logged)
logger.error('Something went wrong!', error)

// Warnings (dev only)
logger.warn('This might be a problem')

// Info messages (dev only)
logger.info('FYI: Something happened')

// Success messages (dev only)
logger.success('Operation completed successfully!')

// Debug messages (only when DEBUG=true)
logger.debug('Detailed debugging info')

// AI performance tracking
logger.ai('RESUME_ANALYSIS', 'gpt-4o', 1234, 2500)
// Output: 🤖 AI [RESUME_ANALYSIS] Model: gpt-4o | 1234 tokens | 2500ms

// API request tracking
logger.api('POST', '/api/analyze-resume', 200, 150)
// Output: 🌐 API POST /api/analyze-resume | Status: 200 | 150ms

// Database query tracking
logger.db('SELECT', 'Investor', 45)
// Output: 💾 DB SELECT on Investor | 45ms

// Performance measurement
const startTime = Date.now()
// ... do something ...
logger.perf('Operation Name', startTime)
// Output: ⚡ PERF Operation Name: 123ms (color-coded: green<100ms, yellow<500ms, red>500ms)

// Group related logs
logger.group('User Authentication')
logger.log('Checking credentials...')
logger.log('Verifying token...')
logger.success('User authenticated!')
logger.groupEnd()

// Table display for objects
logger.table({ name: 'John', age: 30, role: 'founder' })

// Trace execution path (DEBUG mode only)
logger.trace('Execution reached this point')
```

### Environment Variables

Add to your `.env.local`:

```env
# Enable all debug logs
DEBUG=true

# Development mode (default)
NODE_ENV=development
```

### Log Output Format

All logs include:
- ⏰ **Timestamp**: `[HH:MM:SS]`
- 🏷️ **Level**: Emoji + colored tag
- 📝 **Message**: Your log content
- 🎨 **Color coding**: Easy visual parsing

Example output:
```
[14:23:45] 🔵 LOG User login attempt
[14:23:45] 🌐 API POST /api/auth/login | Status: 200 | 85ms
[14:23:45] 💾 DB SELECT on User | 12ms
[14:23:46] ✅ SUCCESS User authenticated
```

### Usage Examples

#### 1. API Route Debugging

```typescript
// app/api/analyze-resume/route.ts
import { logger } from '@/lib/logger'

export async function POST(req: Request) {
  const startTime = Date.now()
  
  try {
    logger.info('Resume analysis started')
    
    const body = await req.json()
    logger.debug('Request body:', body)
    
    // Do analysis...
    const result = await analyzeResume(body)
    
    logger.api('POST', '/api/analyze-resume', 200, Date.now() - startTime)
    logger.success('Resume analysis completed')
    
    return Response.json(result)
  } catch (error) {
    logger.error('Resume analysis failed:', error)
    logger.api('POST', '/api/analyze-resume', 500, Date.now() - startTime)
    return Response.json({ error: 'Failed' }, { status: 500 })
  }
}
```

#### 2. Component Debugging

```typescript
// components/vc-card.tsx
'use client'
import { logger } from '@/lib/logger'

export function VCCard({ investor }) {
  const handleApply = () => {
    logger.group('Apply to VC')
    logger.log('Investor:', investor.firmName)
    logger.debug('Full investor data:', investor)
    
    // Track user action
    logger.info('User clicked Apply button')
    
    logger.groupEnd()
  }
  
  return <button onClick={handleApply}>Apply</button>
}
```

#### 3. Database Query Debugging

```typescript
// lib/db.ts
import { logger } from '@/lib/logger'

export async function getInvestors() {
  const startTime = Date.now()
  
  try {
    const investors = await db.investor.findMany()
    logger.db('SELECT', 'Investor', Date.now() - startTime)
    logger.success(`Found ${investors.length} investors`)
    return investors
  } catch (error) {
    logger.error('DB query failed:', error)
    throw error
  }
}
```

### Debugging Tips

1. **String Replace Errors**
   - These happen when code changes and I try to replace outdated code
   - Solution: I now read files first before editing

2. **PowerShell Execution Policy** (FIXED ✅)
   - Error: Scripts cannot run
   - Solution: `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser`

3. **Finding Issues Quickly**
   - Use `logger.group()` to organize related logs
   - Use `logger.perf()` to find slow operations
   - Use `logger.api()` to track HTTP requests
   - Use `logger.db()` to monitor database performance

4. **Production vs Development**
   - Most logs only show in development
   - Errors always log (can send to Sentry/LogRocket in production)
   - Set `DEBUG=true` for extra verbose output

### Browser Console

In the browser console, you'll see colored emoji logs:
- 🔵 Regular logs
- ❌ Errors
- ⚠️ Warnings
- ℹ️ Info
- ✅ Success
- 🤖 AI operations
- 🌐 API calls
- 💾 Database queries
- ⚡ Performance metrics

### Common Issues & Solutions

#### Issue: Too many logs
```typescript
// Turn off debug mode
process.env.DEBUG = 'false'
```

#### Issue: Missing logs
```typescript
// Check NODE_ENV
console.log(process.env.NODE_ENV) // Should be 'development'

// Check DEBUG flag
console.log(process.env.DEBUG) // Should be 'true' for verbose logs
```

#### Issue: Logs in production
```typescript
// Errors always log, others don't
// To completely disable in production:
if (process.env.NODE_ENV === 'production') {
  logger.log = () => {} // Disable all non-error logs
}
```

### Next Steps

1. ✅ PowerShell execution policy fixed
2. ✅ Enhanced logger created
3. ✅ Modern UI applied to discover page
4. 🔄 Dev server running in background

Your app now has professional-grade debugging! 🎉




