/**
 * Start `next dev` on 127.0.0.1 using the first free port in [PORT..PORT+10]
 * (default PORT=3000) to avoid EADDRINUSE when an old dev server is still running.
 */
import net from 'node:net'
import path from 'node:path'
import { spawn } from 'node:child_process'

const HOST = '127.0.0.1'

function portFree(host, port) {
  return new Promise((resolve) => {
    const srv = net.createServer()
    srv.once('error', () => resolve(false))
    srv.listen({ host, port }, () => {
      srv.close(() => resolve(true))
    })
  })
}

async function main() {
  const start = Math.max(1, parseInt(process.env.PORT || '3000', 10) || 3000)
  const max = start + 10
  let port = start
  for (; port <= max; port++) {
    if (await portFree(HOST, port)) break
  }
  if (port > max) {
    console.error(`[dev] No free port between ${start} and ${max} on ${HOST}`)
    process.exit(1)
  }
  if (port !== start) {
    console.warn(`[dev] Port ${start} is in use — starting on http://${HOST}:${port}`)
  }

  const nextCli = path.join(process.cwd(), 'node_modules', 'next', 'dist', 'bin', 'next')
  const child = spawn(process.execPath, [nextCli, 'dev', '-H', HOST, '-p', String(port)], {
    stdio: 'inherit',
    cwd: process.cwd(),
    env: { ...process.env, PORT: String(port), NEXT_DIST_PORT: String(port) },
  })
  child.on('exit', (code, signal) => {
    if (signal) process.kill(process.pid, signal)
    process.exit(code ?? 1)
  })
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
