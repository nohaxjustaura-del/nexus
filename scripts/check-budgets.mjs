import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const NEXT_DIR = path.join(ROOT, '.next')
const BUNDLE_BUDGET_KB = Number(process.env.BUNDLE_BUDGET_KB ?? 280)
const CSS_BUDGET_KB = Number(process.env.CSS_BUDGET_KB ?? 180)

function toKb(bytes) {
  return bytes / 1024
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) return null
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function sumFileSizes(relativeFiles) {
  return relativeFiles.reduce((total, rel) => {
    const full = path.join(NEXT_DIR, rel)
    if (!fs.existsSync(full)) return total
    return total + fs.statSync(full).size
  }, 0)
}

function collectRouteBudgets() {
  const buildIdPath = path.join(NEXT_DIR, 'BUILD_ID')
  if (!fs.existsSync(buildIdPath)) {
    throw new Error('Missing production build output (.next/BUILD_ID). Run "npm run build" before budget checks.')
  }
  const buildManifest = readJson(path.join(NEXT_DIR, 'build-manifest.json'))
  const appBuildManifest = readJson(path.join(NEXT_DIR, 'app-build-manifest.json'))
  if (!buildManifest || !appBuildManifest) {
    throw new Error('Missing build manifests. Run "npm run build" before budget checks.')
  }

  const allShared = new Set(buildManifest.pages?.['/_app'] ?? [])
  const routeTargets = [
    '/',
    '/pricing',
    '/founder',
    '/investor',
    '/founder/dashboard',
    '/founder/discover',
    '/founder/ai-analysis',
    '/founder/pitch-deck-analysis',
    '/signup',
    '/login',
  ]

  const report = routeTargets.map((route) => {
    const appFiles = appBuildManifest.pages?.[route] ?? []
    const fileSet = [...allShared, ...appFiles]
    const jsFiles = fileSet.filter(
      (f) => f.endsWith('.js') && !f.includes('hot-update') && !f.includes('/fallback/')
    )
    const totalBytes = sumFileSizes(jsFiles)
    return { route, kb: toKb(totalBytes), files: jsFiles.length }
  })

  return report
}

function collectCssBudget() {
  const staticCssDir = path.join(NEXT_DIR, 'static', 'css')
  if (!fs.existsSync(staticCssDir)) return 0
  const cssFiles = fs.readdirSync(staticCssDir).filter((name) => name.endsWith('.css'))
  const totalBytes = cssFiles.reduce((sum, file) => sum + fs.statSync(path.join(staticCssDir, file)).size, 0)
  return toKb(totalBytes)
}

function printTable(rows) {
  console.log('\nRoute bundle budgets (KB):')
  for (const row of rows) {
    console.log(`- ${row.route.padEnd(20)} ${row.kb.toFixed(1).padStart(7)} KB (${row.files} files)`)
  }
}

function main() {
  const routeBudgets = collectRouteBudgets()
  const cssKb = collectCssBudget()
  printTable(routeBudgets)
  console.log(`\nTotal CSS payload: ${cssKb.toFixed(1)} KB`)

  const routeFailures = routeBudgets.filter((row) => row.kb > BUNDLE_BUDGET_KB)
  const cssFailed = cssKb > CSS_BUDGET_KB

  if (routeFailures.length || cssFailed) {
    console.error('\nBudget check failed:')
    for (const failed of routeFailures) {
      console.error(`- ${failed.route} => ${failed.kb.toFixed(1)} KB (limit ${BUNDLE_BUDGET_KB} KB)`)
    }
    if (cssFailed) {
      console.error(`- CSS => ${cssKb.toFixed(1)} KB (limit ${CSS_BUDGET_KB} KB)`)
    }
    process.exit(1)
  }

  console.log('\nBudget check passed.')
}

main()
