import { GoogleGenerativeAI } from '@google/generative-ai'

function getGeminiApiKey(): string | null {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || null
}

export function hasGeminiKey(): boolean {
  return !!getGeminiApiKey()
}

let _genAI: GoogleGenerativeAI | null = null

function getGenAI(): GoogleGenerativeAI {
  if (_genAI) return _genAI
  const apiKey = getGeminiApiKey()
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY (or GOOGLE_API_KEY) is not set')
  }
  _genAI = new GoogleGenerativeAI(apiKey)
  return _genAI
}

function extractJson(text: string): string {
  const trimmed = (text || '').trim()
  if (!trimmed) return '{}'
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return trimmed

  // Try to recover JSON blob from fenced/extra text
  const firstObj = trimmed.indexOf('{')
  const lastObj = trimmed.lastIndexOf('}')
  if (firstObj >= 0 && lastObj > firstObj) return trimmed.slice(firstObj, lastObj + 1)

  const firstArr = trimmed.indexOf('[')
  const lastArr = trimmed.lastIndexOf(']')
  if (firstArr >= 0 && lastArr > firstArr) return trimmed.slice(firstArr, lastArr + 1)

  return '{}'
}

export async function geminiGenerateText(opts: {
  system?: string
  user: string
  model?: string
  temperature?: number
}): Promise<string> {
  // Default to Gemini 2.0 Flash for higher free tier (1500 RPD vs 20 RPD for 2.5)
  // Can override via opts.model or GEMINI_TEXT_MODEL env var
  const modelName = opts.model || process.env.GEMINI_TEXT_MODEL || 'gemini-2.0-flash-exp'
  const temperature = opts.temperature ?? 0.4

  const genAI = getGenAI()
  const model = genAI.getGenerativeModel({ model: modelName })

  const prompt =
    (opts.system ? `SYSTEM:\n${opts.system}\n\n` : '') + `USER:\n${opts.user}\n`

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature },
  })

  return result.response.text()
}

export async function geminiGenerateJson<T = any>(opts: {
  system?: string
  user: string
  model?: string
  temperature?: number
}): Promise<T> {
  const text = await geminiGenerateText({
    ...opts,
    user:
      `${opts.user}\n\n` +
      `Return ONLY valid JSON. No markdown, no explanations, no code fences.`,
  })

  const jsonText = extractJson(text)
  return JSON.parse(jsonText) as T
}

