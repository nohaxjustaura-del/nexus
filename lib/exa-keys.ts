/**
 * Single source of truth for Exa credentials. Nothing else in the repo should read
 * process.env.EXA_API_KEY / EXA_API_KEYS / EXA_API_KEY_* — import hasExaApiKey / getExaApiKeys only.
 *
 * Failover order (first wins until quota, then next):
 *   1) EXA_API_KEY — optional; if set, tried before the list (legacy / single-key setups)
 *   2) EXA_API_KEYS — comma- or newline-separated list (recommended for multiple keys)
 *   3) EXA_API_KEY_1 … EXA_API_KEY_20 — optional one key per variable
 * Duplicates are removed while preserving first-seen order.
 *
 * Inline `# comment` after a key value is stripped (common in .env).
 */

const NUMBERED_EXA_KEY_SLOTS = 20

function stripInlineComment(value: string): string {
  const idx = value.indexOf('#')
  if (idx === -1) return value.trim()
  return value.slice(0, idx).trim()
}

function dedupeKeys(keys: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const k of keys) {
    if (!k || seen.has(k)) continue
    seen.add(k)
    out.push(k)
  }
  return out
}

export function getExaApiKeys(): string[] {
  const ordered: string[] = []
  const primary = process.env.EXA_API_KEY?.trim()
  if (primary) {
    const k = stripInlineComment(primary)
    if (k) ordered.push(k)
  }
  const multi = process.env.EXA_API_KEYS?.trim()
  if (multi) {
    const parts = multi
      .split(/[\n,]+/)
      .map((s) => stripInlineComment(s))
      .filter(Boolean)
    ordered.push(...parts)
  }
  for (let i = 1; i <= NUMBERED_EXA_KEY_SLOTS; i++) {
    const raw = process.env[`EXA_API_KEY_${i}`]?.trim()
    if (!raw) continue
    const k = stripInlineComment(raw)
    if (k) ordered.push(k)
  }
  return dedupeKeys(ordered)
}

export function hasExaApiKey(): boolean {
  return getExaApiKeys().length > 0
}
