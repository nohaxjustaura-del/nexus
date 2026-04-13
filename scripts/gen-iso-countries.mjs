import https from 'https'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const url =
  'https://raw.githubusercontent.com/lukes/ISO-3166-Countries-with-Regional-Codes/master/all/all.json'

function fetchJson(u) {
  return new Promise((resolve, reject) => {
    https
      .get(u, (r) => {
        let d = ''
        r.on('data', (c) => (d += c))
        r.on('end', () => resolve(JSON.parse(d)))
      })
      .on('error', reject)
  })
}

const j = await fetchJson(url)
const rows = j
  .map((x) => ({
    code: String(x['alpha-2']).toUpperCase(),
    name: String(x.name),
  }))
  .filter((x) => x.code && x.name && x.code.length === 2)
  .sort((a, b) => a.name.localeCompare(b.name))

const body = rows
  .map((x) => `  { code: '${x.code}', name: ${JSON.stringify(x.name)} },`)
  .join('\n')

const out = `/** ISO 3166-1 alpha-2 countries (English short names), sorted by name. */
export type IsoCountry = { code: string; name: string }

export const ISO_COUNTRIES_SORTED: readonly IsoCountry[] = [
${body}
] as const

export function getCountryByCode(code: string | null | undefined): IsoCountry | undefined {
  if (!code) return undefined
  const u = code.toUpperCase()
  return ISO_COUNTRIES_SORTED.find((c) => c.code === u)
}
`

const target = path.join(__dirname, '..', 'lib', 'geo', 'iso3166-countries.ts')
fs.mkdirSync(path.dirname(target), { recursive: true })
fs.writeFileSync(target, out, 'utf8')
console.log('wrote', rows.length, '->', target)
