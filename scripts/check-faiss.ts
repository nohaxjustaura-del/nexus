/**
 * Verify FAISS setup: index, metadata JSONL, embeddings.json (count/dim), + HTTP /health.
 *
 * Run (local):  npm run check-faiss
 * Override URL (works on Windows PowerShell):  npm run check-faiss -- --url=https://internal.example.com
 * Or env: bash `FAISS_SERVICE_URL=... npm run check-faiss` — PowerShell: `$env:FAISS_SERVICE_URL='...'; npm run check-faiss`
 * (Do not use `set VAR=...` in PowerShell; that is cmd.exe syntax and will not apply to Node.)
 *
 * On the production app host, run with the same FAISS_SERVICE_URL as Next.js uses.
 */

import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

/** Must match Voyage voyage-3 dimension in lib/embeddings.ts */
const EXPECTED_EMBEDDING_DIM = 1024

const root = process.cwd()
const INDEX = join(root, 'faiss-data', 'vc_index.faiss')
const METADATA = join(root, 'faiss-data', 'vcs_embedding_inputs_trimmed.json')
const EMBEDDINGS_JSON = join(root, 'faiss-data', 'embeddings.json')

function countJsonlLines(filePath: string): number {
  const text = readFileSync(filePath, 'utf-8')
  let n = 0
  for (const line of text.split(/\n/)) {
    if (line.trim()) n++
  }
  return n
}

function urlFromArgs(): string | null {
  for (const a of process.argv.slice(2)) {
    if (a.startsWith('--url=')) return a.slice('--url='.length).trim() || null
  }
  return null
}

function baseUrl(): string {
  const fromArg = urlFromArgs()
  const u =
    (fromArg && fromArg.length > 0 ? fromArg : process.env.FAISS_SERVICE_URL?.trim()) ||
    'http://127.0.0.1:8001'
  return u.replace(/\/$/, '')
}

async function main() {
  console.log('FAISS checklist\n')

  let ok = true

  // --- Files (needed wherever build_index.py / faiss_api runs) ---
  console.log('1. Index file (faiss-data/vc_index.faiss)')
  if (existsSync(INDEX)) {
    console.log('   OK  exists\n')
  } else {
    console.log('   FAIL  missing — run: npm run build-faiss-index then faiss:build (see faiss-service/README)\n')
    ok = false
  }

  console.log('2. VC metadata JSONL (faiss-data/vcs_embedding_inputs_trimmed.json)')
  let metadataLines = 0
  if (existsSync(METADATA)) {
    try {
      metadataLines = countJsonlLines(METADATA)
      console.log(`   OK  exists (${metadataLines} records)\n`)
    } catch (e: any) {
      console.log(`   FAIL  could not read: ${e?.message ?? e}\n`)
      ok = false
    }
  } else {
    console.log('   FAIL  missing — produced by build-faiss-index / rebuild scripts\n')
    ok = false
  }

  console.log('3. Embeddings array (faiss-data/embeddings.json) — build_index.py input')
  if (!existsSync(EMBEDDINGS_JSON)) {
    console.log('   FAIL  missing — run npm run build-faiss-index (or rebuild-faiss-index)\n')
    ok = false
  } else {
    try {
      const raw = readFileSync(EMBEDDINGS_JSON, 'utf-8')
      const arr = JSON.parse(raw) as unknown
      if (!Array.isArray(arr) || arr.length === 0) {
        console.log('   FAIL  must be a non-empty JSON array of number[]\n')
        ok = false
      } else {
        const first = arr[0]
        const dim = Array.isArray(first) ? first.length : 0
        if (dim !== EXPECTED_EMBEDDING_DIM) {
          console.log(
            `   FAIL  first vector length ${dim} — expected ${EXPECTED_EMBEDDING_DIM} (Voyage voyage-3)\n`,
          )
          ok = false
        } else if (metadataLines > 0 && arr.length !== metadataLines) {
          console.log(
            `   FAIL  ${arr.length} vectors but metadata has ${metadataLines} lines — rebuild so they match\n`,
          )
          ok = false
        } else {
          console.log(`   OK  ${arr.length} vectors × ${dim} dimensions\n`)
        }
      }
    } catch (e: any) {
      console.log(`   FAIL  invalid JSON: ${e?.message ?? e}\n`)
      ok = false
    }
  }

  // --- Service ---
  const serviceBase = baseUrl()
  const url = `${serviceBase}/health`
  console.log(`4. FAISS HTTP service GET ${url}`)
  const src = urlFromArgs() ? '--url=…' : process.env.FAISS_SERVICE_URL?.trim() ? 'FAISS_SERVICE_URL' : 'default'
  console.log(`   (base=${serviceBase}, from ${src})\n`)

  try {
    const ac = new AbortController()
    const t = setTimeout(() => ac.abort(), 8000)
    const res = await fetch(url, { signal: ac.signal })
    clearTimeout(t)

    if (!res.ok) {
      console.log(`   FAIL  HTTP ${res.status}\n`)
      ok = false
    } else {
      const body = (await res.json()) as { status?: string; vc_count?: number; index_size?: number }
      const vc = body.vc_count ?? 0
      const ix = body.index_size ?? 0
      console.log(`   Response: ${JSON.stringify(body)}\n`)
      if (body.status === 'healthy' && vc > 0 && ix > 0) {
        console.log('   OK  healthy, non-empty index\n')
      } else {
        console.log('   WARN  service up but vc_count or index_size is 0 — rebuild index / check data paths on that host\n')
        ok = false
      }
    }
  } catch (e: any) {
    const msg = e?.name === 'AbortError' ? 'timeout (8s)' : (e?.message ?? String(e))
    console.log(`   FAIL  ${msg}`)
    console.log('   Start locally: npm run faiss:start  (or uvicorn in faiss-service/README)\n')
    ok = false
  }

  console.log('--- Production (tixmaster.org / hosting) ---')
  console.log('5. Next.js env FAISS_SERVICE_URL must point at the running service *from the app server*')
  console.log('   (not localhost on your PC unless the app only runs on your PC).')
  console.log('6. After a deploy, trigger a match and read host logs for:')
  console.log('   [ORCHESTRATOR] Step 5 — FAISS:')
  console.log('   If you see "in-memory" or "falling back", FAISS was not used for that request.\n')

  if (!ok) {
    console.log('Result: some checks failed.\n')
    process.exit(1)
  }
  console.log('Result: local data files + service checks passed.\n')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
