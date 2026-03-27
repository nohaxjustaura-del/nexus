import { logger } from '@/lib/logger'

/** Full-file extraction (same approach as analyze-pitch-deck). Normalize/cap in orchestrator. */
export async function extractDeckTextFromFile(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  try {
    const text = buffer.toString('utf-8', 0, Math.min(buffer.length, 500_000))
    return text.replace(/[^\x20-\x7E\n\r\t]/g, ' ')
  } catch (error) {
    logger.error('[UNIFIED-PITCH] extractDeckTextFromFile:', error)
    return ''
  }
}

export function validateDeckFile(file: File): { valid: boolean; error?: string } {
  const maxSize = 50 * 1024 * 1024
  const allowedTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-powerpoint',
  ]
  const allowedExtensions = ['.pdf', '.pptx', '.ppt']
  if (file.size > maxSize) return { valid: false, error: 'File size must be less than 50MB' }
  const fileName = file.name.toLowerCase()
  const hasValidExtension = allowedExtensions.some((ext) => fileName.endsWith(ext))
  if (!allowedTypes.includes(file.type) && !hasValidExtension) {
    return { valid: false, error: 'Only PDF and PowerPoint files are supported' }
  }
  return { valid: true }
}
