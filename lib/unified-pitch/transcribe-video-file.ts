import { logger } from '@/lib/logger'

export function validateUnifiedVideoFile(file: File): { valid: boolean; error?: string } {
  const maxSize = 500 * 1024 * 1024
  const allowedTypes = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo', 'video/mpeg']
  if (file.size > maxSize) return { valid: false, error: 'File size must be less than 500MB' }
  const name = file.name.toLowerCase()
  const extOk = ['.mp4', '.mov', '.webm', '.mpeg', '.avi'].some((e) => name.endsWith(e))
  if (!allowedTypes.includes(file.type) && !extOk) {
    return { valid: false, error: 'Only MP4, MOV, and WebM video files are supported' }
  }
  return { valid: true }
}

/** Deepgram then Whisper — mirrors analyze-video-pitch (no route import). */
export async function transcribeVideoFile(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const deepgramKey = process.env.DEEPGRAM_API_KEY
  const openaiKey = process.env.OPENAI_API_KEY

  if (deepgramKey) {
    const deepgramUrl = 'https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true'
    const response = await fetch(deepgramUrl, {
      method: 'POST',
      headers: {
        Authorization: `Token ${deepgramKey}`,
        'Content-Type': file.type || 'video/mp4',
      },
      body: buffer,
    })
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Deepgram transcription failed: ${response.status}. ${errorText.substring(0, 200)}`)
    }
    const result = (await response.json()) as {
      results?: { channels?: { alternatives?: { transcript?: string }[] }[] }
    }
    const transcriptText = result.results?.channels?.[0]?.alternatives?.[0]?.transcript || ''
    if (!transcriptText || transcriptText.trim().length < 20) {
      throw new Error('Video audio could not be transcribed. Please ensure your video has clear, audible speech.')
    }
    logger.log(`[UNIFIED-PITCH] Deepgram transcript length: ${transcriptText.length}`)
    return transcriptText.trim()
  }

  if (openaiKey) {
    const { default: OpenAI } = await import('openai')
    const openaiClient = new OpenAI({ apiKey: openaiKey })
    const whisperFile = new File([buffer], file.name, { type: file.type })
    const transcription = await openaiClient.audio.transcriptions.create({
      file: whisperFile,
      model: 'whisper-1',
      language: 'en',
      response_format: 'text',
    })
    const transcriptText =
      typeof transcription === 'string' ? transcription : (transcription as { text?: string }).text || ''
    if (!transcriptText || transcriptText.trim().length < 50) {
      throw new Error('Transcription too short or empty. Please ensure your video has clear audio.')
    }
    return transcriptText.trim()
  }

  throw new Error('No transcription service available. Set DEEPGRAM_API_KEY or OPENAI_API_KEY.')
}
