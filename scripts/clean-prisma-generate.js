#!/usr/bin/env node
/**
 * Prisma on Windows often fails with:
 *   EPERM: operation not permitted, rename '...query_engine-windows.dll.node.tmp...' -> '...query_engine-windows.dll.node'
 * when another process still has the old engine loaded (Next.js dev server, Prisma Studio, test runner, etc.).
 *
 * Removing node_modules/.prisma/client first avoids replacing a file that is in use (after you stop those processes).
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const root = path.join(__dirname, '..')
const clientDir = path.join(root, 'node_modules', '.prisma', 'client')

function sleepMs(ms) {
  try {
    if (process.platform === 'win32') {
      execSync(`powershell -NoProfile -Command "Start-Sleep -Milliseconds ${ms}"`, { stdio: 'ignore' })
    } else {
      execSync(`sleep ${Math.max(1, Math.ceil(ms / 1000))}`, { stdio: 'ignore' })
    }
  } catch {
    /* ignore */
  }
}

function removeClientDir() {
  if (!fs.existsSync(clientDir)) return

  const opts = { recursive: true, force: true }
  const attempts = 15
  for (let i = 0; i < attempts; i++) {
    try {
      fs.rmSync(clientDir, opts)
      return
    } catch (e) {
      if (i === attempts - 1) throw e
      console.warn(
        `[clean-prisma-generate] remove client dir attempt ${i + 1}/${attempts}: ${e.code || e.message}`,
      )
      sleepMs(300 + i * 100)
    }
  }
}

try {
  removeClientDir()
} catch (e) {
  console.error('\n[clean-prisma-generate] FAILED to delete:', clientDir)
  console.error('   ', e.message)
  console.error('\n   Something still has the Prisma engine DLL open. Do this:')
  console.error('   1) Stop every terminal running `npm run dev` / `next dev`.')
  console.error('   2) Close Prisma Studio if it is open.')
  console.error('   3) In Task Manager, end extra "Node.js JavaScript Runtime" tasks for this repo (or restart the PC if unsure).')
  console.error('   4) Run again: npm run db:generate\n')
  process.exit(1)
}

console.log('[clean-prisma-generate] prisma generate …')
try {
  execSync('npx prisma generate', { stdio: 'inherit', cwd: root, shell: true })
} catch {
  process.exit(1)
}
