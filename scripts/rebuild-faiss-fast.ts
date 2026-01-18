/**
 * Fast FAISS index rebuild - generates embeddings from JSON file and builds index
 * This is faster than rebuilding from database
 */

import { generateVCEmbedding } from '../lib/embeddings'
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { execSync } from 'child_process'

async function main() {
  console.log('🚀 Fast FAISS index rebuild...\n')

  // Read existing VC data from JSON file
  const jsonlPath = join(process.cwd(), 'faiss-data', 'vcs_embedding_inputs_trimmed.json')
  const jsonlContent = readFileSync(jsonlPath, 'utf-8')
  const vcRows = jsonlContent.split('\n').filter(line => line.trim()).map(line => JSON.parse(line))

  console.log(`Found ${vcRows.length} VCs in JSON file\n`)
  console.log('🔄 Generating 768-dimensional embeddings...\n')

  const embeddings: number[][] = []
  const vcData: any[] = []

  // Generate embeddings for each VC
  for (let i = 0; i < vcRows.length; i++) {
    const vc = vcRows[i]
    
    try {
      if ((i + 1) % 50 === 0) {
        console.log(`[${i + 1}/${vcRows.length}] Processing ${vc.firm_name}...`)
      }

      // Extract VC profile from JSON data
      const vcProfile = {
        firmName: vc.firm_name,
        fundType: vc.metadata?.investor_type || 'vc',
        stages: vc.metadata?.stages || [],
        sectors: Object.keys(vc.metadata?.sector_preferences || {}),
        geography: vc.metadata?.geography || [],
        checkSizeMin: vc.metadata?.check_size?.min_usd || 0,
        checkSizeMax: vc.metadata?.check_size?.max_usd || 0,
        leadFollow: 'either',
        thesis: vc.metadata?.thesis || vc.embedding_text || '',
        valueAddTags: [],
        portfolio: [],
        notableInvestments: [],
      }

      // Generate embedding
      const embedding = await generateVCEmbedding(vcProfile)

      // Verify dimension
      if (embedding.length !== 768) {
        console.log(`⚠️  Warning: ${vc.firm_name} has dimension ${embedding.length}, expected 768`)
        continue
      }

      embeddings.push(embedding)

      // Update VC data entry with ID if available
      const vcEntry = {
        id: vc.id || vc.firm_name.toLowerCase().replace(/\s+/g, '_'),
        firm_name: vc.firm_name,
        embedding_text: vc.embedding_text || '',
        metadata: vc.metadata || {},
      }

      vcData.push(vcEntry)

      // Rate limiting - wait 100ms between requests (faster than 200ms)
      if (i < vcRows.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    } catch (error: any) {
      console.error(`❌ Error processing ${vc.firm_name}:`, error.message)
    }
  }

  if (embeddings.length === 0) {
    console.log('❌ No valid embeddings generated')
    return
  }

  console.log(`\n✅ Generated ${embeddings.length} embeddings (768 dimensions each)\n`)

  // Write updated JSONL file
  const updatedJsonlPath = join(process.cwd(), 'faiss-data', 'vcs_embedding_inputs_trimmed.json')
  const jsonlContent = vcData.map(vc => JSON.stringify(vc)).join('\n')
  writeFileSync(updatedJsonlPath, jsonlContent, 'utf-8')
  console.log(`✅ Updated VC data file`)

  // Write embeddings as JSON for Python script
  const embeddingsPath = join(process.cwd(), 'faiss-data', 'embeddings.json')
  writeFileSync(embeddingsPath, JSON.stringify(embeddings), 'utf-8')
  console.log(`✅ Wrote embeddings to ${embeddingsPath}`)

  console.log('\n🔨 Building FAISS index...')
  
  // Run Python script to build index
  try {
    const pythonScript = join(process.cwd(), 'faiss-service', 'build_index.py')
    execSync(`python "${pythonScript}"`, { 
      cwd: process.cwd(),
      stdio: 'inherit'
    })
    console.log('\n✅ FAISS index rebuilt successfully!')
    console.log('   - Dimension: 768 (Gemini text-embedding-004)')
    console.log('   - Vectors: ' + embeddings.length)
    console.log('\n🔄 Restart the FAISS service to use the new index:')
    console.log('   cd faiss-service')
    console.log('   python -m uvicorn faiss_api:app --host 0.0.0.0 --port 8001')
  } catch (error: any) {
    console.error('\n❌ Error building FAISS index:', error.message)
    console.log('\nYou can manually build it by running:')
    console.log('   cd faiss-service')
    console.log('   python build_index.py')
  }
}

main()
  .catch(error => {
    console.error('Fatal error:', error)
    process.exit(1)
  })