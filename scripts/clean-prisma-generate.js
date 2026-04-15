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

/** When true (npm run dev), EPERM on the engine DLL does not block starting Next.js. */
const softFailOnLock =
  process.argv.includes('--soft-fail-on-lock') ||
  process.env.NEXUS_PRISMA_CLEAN_SOFT_FAIL === '1'

/** Best-effort: show node.exe PIDs that reference this repo (Windows). */
function logWindowsNodeProcessesForRepo() {
  if (process.platform !== 'win32') return
  const rootEscaped = root.replace(/'/g, "''")
  const script = [
    "$ErrorActionPreference = 'SilentlyContinue'",
    "$ProgressPreference = 'SilentlyContinue'",
    `$root = '${rootEscaped}'`,
    '$needle = ($root.Replace([char]92, [char]47)).ToLowerInvariant()',
    "$procs = Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'node.exe' }",
    '$hits = @()',
    'foreach ($p in $procs) {',
    '  if (-not $p.CommandLine) { continue }',
    '  $cl = $p.CommandLine.Replace([char]92, [char]47).ToLowerInvariant()',
    '  if ($cl.Contains($needle)) { $hits += $p }',
    '}',
    '[Console]::WriteLine("")',
    'if ($hits.Count -gt 0) {',
    "  [Console]::WriteLine('[clean-prisma-generate] node.exe tied to this repo - end these in Task Manager, then npm run db:generate:')",
    '  foreach ($h in $hits) {',
    "    [Console]::WriteLine('  PID ' + $h.ProcessId)",
    "    [Console]::WriteLine('  ' + $h.CommandLine)",
    '    [Console]::WriteLine("")',
    '  }',
    '} else {',
    "  [Console]::WriteLine('[clean-prisma-generate] No node.exe with this folder in CommandLine.')",
    "  [Console]::WriteLine('  Lock may be antivirus, Windows Search, another session, or a non-node process.')",
    '}',
    '[Console]::WriteLine("")',
  ].join('\r\n')
  const b64 = Buffer.from(script, 'utf16le').toString('base64')
  try {
    execSync(`powershell -NoProfile -EncodedCommand ${b64}`, { stdio: 'inherit', cwd: root })
  } catch {
    /* ignore diagnostics failure */
  }
}

if (process.argv.includes('--list-node-procs')) {
  logWindowsNodeProcessesForRepo()
  process.exit(0)
}

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

let lockedClientDir = false
try {
  removeClientDir()
} catch (e) {
  const locked = e && (e.code === 'EPERM' || e.code === 'EBUSY')
  if (softFailOnLock && locked) {
    console.warn('\n[clean-prisma-generate] Could not delete (engine DLL is in use):', clientDir)
    console.warn('   ', e.message)
    console.warn('\n   Continuing without prisma generate — Next.js will use the existing client.')
    console.warn('   After you stop other Node/Prisma processes, run `npm run db:generate` if you changed prisma/schema.prisma.\n')
    process.exit(0)
  }
  if (locked) {
    lockedClientDir = true
    console.warn('\n[clean-prisma-generate] Could not remove client dir (engine DLL is in use):', clientDir)
    console.warn('   ', e.message)
    console.warn('\n   Running prisma generate anyway (may succeed if nothing rewrites the engine).')
    console.warn('   If it fails, stop `next dev` / Prisma Studio / extra Node tasks, then retry.\n')
  } else {
    console.error('\n[clean-prisma-generate] FAILED to delete:', clientDir)
    console.error('   ', e.message)
    console.error('\n   Something still has the Prisma engine DLL open. Do this:')
    console.error('   1) Stop every terminal running `npm run dev` / `next dev`.')
    console.error('   2) Close Prisma Studio if it is open.')
    console.error('   3) In Task Manager, end extra "Node.js JavaScript Runtime" tasks for this repo (or restart the PC if unsure).')
    console.error('   4) Run again: npm run db:generate')
    console.error('\n   Tip: `npm run dev` skips clean+generate when the DLL is locked; use that to work until you can free the lock.\n')
    process.exit(1)
  }
}

console.log(
  lockedClientDir
    ? '[clean-prisma-generate] prisma generate (client dir not removed) …'
    : '[clean-prisma-generate] prisma generate …',
)
try {
  execSync('npx prisma generate', { stdio: 'inherit', cwd: root, shell: true })
} catch {
  if (process.platform === 'win32') {
    console.error(
      '\n[clean-prisma-generate] prisma generate failed (often EPERM: engine DLL still loaded). Suspects:\n',
    )
    logWindowsNodeProcessesForRepo()
    console.error('  Run: npm run db:prisma-procs   (same listing anytime)\n')
  }
  process.exit(1)
}
