#!/usr/bin/env tsx

/**
 * AUTOMATED EMBEDDINGS REBUILD
 * 
 * Regenerates embeddings for all investors for semantic search (Voyage AI voyage-3).
 * Called automatically by background worker. Uses same lib/embeddings.ts as FAISS rebuild.
 */

import { db } from '../lib/db'
import { logger } from '../lib/logger'
import { spawn } from 'child_process'
import path from 'path'

interface RebuildResult {
  totalInvestors: number
  embeddingsGenerated: number
  faissIndexBuilt: boolean
  duration: number
}

/**
 * Generate embeddings for all investors
 */
async function generateEmbeddings(): Promise<number> {
  logger.info('EMBEDDINGS', '📊 Generating embeddings...')
  
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, 'generate-vc-embeddings.ts')
    
    // Use shell: true for Windows compatibility (finds npx.cmd)
    // Add Node.js to PATH if not already there
    const nodePath = process.platform === 'win32' ? 'C:\\Program Files\\nodejs' : ''
    const envPath = nodePath && !process.env.PATH?.includes(nodePath) 
      ? `${process.env.PATH};${nodePath}` 
      : process.env.PATH
    
    const child = spawn('npx', ['tsx', scriptPath], {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit',
      shell: true,
      env: { ...process.env, PATH: envPath },
    })
    
    child.on('exit', (code) => {
      if (code === 0) {
        resolve(code)
      } else {
        reject(new Error(`Embedding generation failed with code ${code}`))
      }
    })
    
    child.on('error', (error) => {
      reject(error)
    })
  })
}

/**
 * Build FAISS index from DB embeddings (uses rebuild-faiss-index.ts which
 * reads directly from the database, keeping FAISS in sync with stored data)
 */
async function buildFAISSIndex(): Promise<void> {
  logger.info('EMBEDDINGS', '🔧 Building FAISS index from database...')
  
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, 'rebuild-faiss-index.ts')
    
    const nodePath = process.platform === 'win32' ? 'C:\\Program Files\\nodejs' : ''
    const envPath = nodePath && !process.env.PATH?.includes(nodePath) 
      ? `${process.env.PATH};${nodePath}` 
      : process.env.PATH
    
    const child = spawn('npx', ['tsx', scriptPath], {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit',
      shell: true,
      env: { ...process.env, PATH: envPath },
    })
    
    child.on('exit', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`FAISS build failed with code ${code}`))
      }
    })
    
    child.on('error', (error) => {
      reject(error)
    })
  })
}

/**
 * Main rebuild function
 */
export async function rebuildEmbeddings(): Promise<RebuildResult> {
  const startTime = Date.now()
  
  logger.info('EMBEDDINGS', '🚀 Starting embeddings rebuild...')
  
  try {
    // Get total investor count
    const totalInvestors = await db.investor.count()
    logger.info('EMBEDDINGS', `📋 Processing ${totalInvestors} investors...`)
    
    // Generate embeddings
    await generateEmbeddings()
    
    // Build FAISS index
    await buildFAISSIndex()
    
    const duration = Date.now() - startTime
    
    const result: RebuildResult = {
      totalInvestors,
      embeddingsGenerated: totalInvestors,
      faissIndexBuilt: true,
      duration,
    }
    
    logger.info('EMBEDDINGS', `✅ Embeddings rebuilt successfully in ${(duration / 1000).toFixed(2)}s`)
    
    return result
  } catch (error: any) {
    logger.error('EMBEDDINGS', 'Rebuild failed:', error.message)
    throw error
  }
}

/**
 * CLI entry point
 */
async function main() {
  try {
    const result = await rebuildEmbeddings()
    
    console.log('\n📊 Rebuild Summary:')
    console.log(`   Total investors: ${result.totalInvestors}`)
    console.log(`   Embeddings generated: ${result.embeddingsGenerated}`)
    console.log(`   FAISS index: ${result.faissIndexBuilt ? '✅' : '❌'}`)
    console.log(`   Duration: ${(result.duration / 1000).toFixed(2)}s`)
    console.log('\n✅ Embeddings rebuild complete!')
  } catch (error: any) {
    console.error('❌ Rebuild failed:', error.message)
    process.exit(1)
  } finally {
    await db.$disconnect()
  }
}

// Run if called directly
if (require.main === module) {
  main()
}

export default rebuildEmbeddings
