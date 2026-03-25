/**
 * BACKGROUND WORKER ENTRY POINT
 * 
 * Runs continuously to keep data fresh and accurate
 * Can be run as a standalone process or in the background
 */

const { spawn } = require('child_process')
const path = require('path')

console.log('🚀 Starting Background Worker...')
console.log('📋 This will keep all data updated automatically\n')

// Add Node.js to PATH if not already there (Windows fix)
const nodePath = process.platform === 'win32' ? 'C:\\Program Files\\nodejs' : ''
const envPath = nodePath && !process.env.PATH?.includes(nodePath) 
  ? `${process.env.PATH};${nodePath}` 
  : process.env.PATH

// Run the TypeScript worker using tsx
const worker = spawn('npx', ['tsx', 'scripts/worker-start.ts'], {
  cwd: process.cwd(),
  stdio: 'inherit',
  shell: true, // Required for Windows to find npx.cmd
  env: {
    ...process.env,
    PATH: envPath,
    NODE_ENV: process.env.NODE_ENV || 'production'
  }
})

worker.on('error', (error) => {
  console.error('❌ Worker error:', error)
  process.exit(1)
})

worker.on('exit', (code) => {
  if (code !== 0) {
    console.error(`❌ Worker exited with code ${code}`)
    process.exit(code)
  } else {
    console.log('✅ Worker exited successfully')
  }
})

// Handle signals for graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n📥 Received SIGTERM, shutting down...')
  worker.kill('SIGTERM')
})

process.on('SIGINT', () => {
  console.log('\n📥 Received SIGINT, shutting down...')
  worker.kill('SIGINT')
})
