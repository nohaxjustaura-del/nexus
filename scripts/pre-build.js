#!/usr/bin/env node

/**
 * Pre-build optimization script
 * Runs before the build to optimize assets and clean up
 */

const fs = require('fs')
const path = require('path')

console.log('🚀 Running pre-build optimizations...\n')

// 1. Clean up old build artifacts
console.log('📦 Cleaning old build artifacts...')
const cleanDirs = ['.next', 'out']
cleanDirs.forEach(dir => {
  const dirPath = path.join(process.cwd(), dir)
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true })
    console.log(`   ✓ Removed ${dir}`)
  }
})

// 2. Verify environment variables
console.log('\n🔍 Checking environment variables...')
const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'OPENAI_API_KEY',
]

const missingVars = requiredEnvVars.filter(varName => !process.env[varName])
if (missingVars.length > 0) {
  console.warn(`   ⚠️  Warning: Missing environment variables: ${missingVars.join(', ')}`)
} else {
  console.log('   ✓ All required environment variables present')
}

// 3. Check for large files
console.log('\n📊 Checking for large files...')
const maxSize = 1024 * 1024 // 1MB
const publicDir = path.join(process.cwd(), 'public')

function checkFileSize(dir) {
  if (!fs.existsSync(dir)) return
  
  const files = fs.readdirSync(dir)
  files.forEach(file => {
    const filePath = path.join(dir, file)
    const stats = fs.statSync(filePath)
    
    if (stats.isDirectory()) {
      checkFileSize(filePath)
    } else if (stats.size > maxSize) {
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(2)
      console.warn(`   ⚠️  Large file detected: ${filePath} (${sizeMB}MB)`)
    }
  })
}

checkFileSize(publicDir)
console.log('   ✓ File size check complete')

// 4. Generate build info
console.log('\n📝 Generating build info...')
const buildInfo = {
  timestamp: new Date().toISOString(),
  version: require('../package.json').version,
  nodeVersion: process.version,
  platform: process.platform,
}

fs.writeFileSync(
  path.join(process.cwd(), 'public', 'build-info.json'),
  JSON.stringify(buildInfo, null, 2)
)
console.log('   ✓ Build info generated')

console.log('\n✨ Pre-build optimizations complete!\n')




