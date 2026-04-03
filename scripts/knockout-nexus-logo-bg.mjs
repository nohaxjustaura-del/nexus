/**
 * Remove solid black/near-black frame from public/nexus-logo.png (edge flood → alpha 0).
 * Run: node scripts/knockout-nexus-logo-bg.mjs
 */
import sharp from 'sharp'
import { unlinkSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const outputPath = join(root, 'public', 'nexus-logo.png')
const tmpPath = outputPath + '.tmp.png'

const CORNER_TOL = 42 // sum of abs diff from corner sample for “same as edge”
const DARK_CAP = 52 // max channel for “dark slab” heuristic
const DARK_SUM_CAP = 130 // r+g+b below this + dark → bg unless blue-heavy

function isBackgroundLike(r, g, b, cr, cg, cb) {
  const dr = Math.abs(r - cr) + Math.abs(g - cg) + Math.abs(b - cb)
  if (dr <= CORNER_TOL * 3) return true
  const max = Math.max(r, g, b)
  const sum = r + g + b
  // keep logo blues (B usually leads)
  if (b > 72 && b >= max - 12) return false
  if (max < DARK_CAP && sum < DARK_SUM_CAP) return true
  return false
}

async function main() {
  const { data, info } = await sharp(outputPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width, height, channels } = info
  if (channels !== 4) throw new Error('Expected RGBA')

  const cr = data[0]
  const cg = data[1]
  const cb = data[2]

  const visited = new Uint8Array(width * height)
  const queue = []

  function tryEnqueue(x, y) {
    if (x < 0 || y < 0 || x >= width || y >= height) return
    const i = y * width + x
    if (visited[i]) return
    const p = i * 4
    const r = data[p]
    const g = data[p + 1]
    const b = data[p + 2]
    if (!isBackgroundLike(r, g, b, cr, cg, cb)) {
      visited[i] = 2
      return
    }
    visited[i] = 1
    queue.push(i)
  }

  for (let x = 0; x < width; x++) {
    tryEnqueue(x, 0)
    tryEnqueue(x, height - 1)
  }
  for (let y = 0; y < height; y++) {
    tryEnqueue(0, y)
    tryEnqueue(width - 1, y)
  }

  while (queue.length) {
    const i = queue.pop()
    const p = i * 4
    data[p + 3] = 0
    const x = i % width
    const y = (i / width) | 0
    tryEnqueue(x + 1, y)
    tryEnqueue(x - 1, y)
    tryEnqueue(x, y + 1)
    tryEnqueue(x, y - 1)
  }

  await sharp(Buffer.from(data), {
    raw: { width, height, channels: 4 },
  })
    .png({ compressionLevel: 9 })
    .toFile(tmpPath)

  unlinkSync(outputPath)
  await sharp(tmpPath).toFile(outputPath)
  unlinkSync(tmpPath)
  // eslint-disable-next-line no-console
  console.log('Updated', outputPath, 'with transparent knockout from edges.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
