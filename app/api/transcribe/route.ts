import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { saveFileToDisk, buildFounderSnapshot } from '@/lib/file-storage'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/transcribe
 *
 * Accepts an audio file (from browser MediaRecorder) and transcribes it
 * using OpenAI Whisper. Also saves the audio file to disk and stores a
 * VoiceRecording record in the database for training data collection.
 *
 * Returns: { transcript: string, voiceRecordingId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const founder = await db.founder.findUnique({
      where: { email: user.email },
    })

    if (!founder) {
      return NextResponse.json(
        { error: 'Founder profile not found. Please complete onboarding first.' },
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Parse the uploaded audio file
    let formData: FormData
    try {
      formData = await request.formData()
    } catch {
      return NextResponse.json(
        { error: 'Invalid request. Expected multipart form data.' },
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const audioFile = formData.get('audio') as File | null
    if (!audioFile || audioFile.size === 0) {
      return NextResponse.json(
        { error: 'No audio file provided.' },
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Validate file size (max 25MB - Whisper limit)
    if (audioFile.size > 25 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Audio file too large. Maximum 25MB allowed.' },
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Check if this is an interim (live) transcription request — skip DB/file saving
    const isInterim = request.nextUrl.searchParams.get('interim') === 'true'

    logger.log(`[TRANSCRIBE] Received audio: ${audioFile.name}, ${audioFile.type}, ${(audioFile.size / 1024).toFixed(1)}KB${isInterim ? ' (interim)' : ''}`)

    // Get the duration if provided
    const durationStr = formData.get('duration') as string | null
    const durationSeconds = durationStr ? parseFloat(durationStr) : null

    const buffer = Buffer.from(await audioFile.arrayBuffer())

    // Only save file to disk for final (non-interim) requests
    let savedFilePath = ''
    if (!isInterim) {
      try {
        savedFilePath = await saveFileToDisk(buffer, 'voice-recordings', founder.id, audioFile.name)
        logger.log(`[TRANSCRIBE] Saved audio to: ${savedFilePath}`)
      } catch (saveErr: any) {
        logger.error('[TRANSCRIBE] Failed to save audio file (non-critical):', saveErr.message)
      }
    }

    // Transcribe: try Deepgram first (same as video pitch), fall back to OpenAI Whisper
    const deepgramKey = process.env.DEEPGRAM_API_KEY
    const openaiKey = process.env.OPENAI_API_KEY

    logger.log('[TRANSCRIBE] API Keys check:', {
      hasDeepgram: !!deepgramKey,
      hasOpenAI: !!openaiKey,
    })

    if (!deepgramKey && !openaiKey) {
      return NextResponse.json(
        {
          error: 'Transcription service unavailable',
          message: 'No transcription API key configured. Please set DEEPGRAM_API_KEY or OPENAI_API_KEY in your .env.local file.',
        },
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      )
    }

    let transcriptText = ''
    let detectedLanguage = 'en'

    try {
      if (deepgramKey) {
        // Primary: Deepgram Nova-2 (same as video pitch analysis)
        logger.log('[TRANSCRIBE] Using Deepgram for transcription...')

        const deepgramUrl = 'https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&detect_language=true'
        const dgResponse = await fetch(deepgramUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Token ${deepgramKey}`,
            'Content-Type': audioFile.type || 'audio/webm',
          },
          body: buffer,
        })

        if (!dgResponse.ok) {
          const errorText = await dgResponse.text()
          logger.error(`[TRANSCRIBE] Deepgram error: ${dgResponse.status}`, errorText)
          throw new Error(`Deepgram transcription failed: ${dgResponse.status}`)
        }

        const dgResult = await dgResponse.json() as any
        transcriptText = dgResult.results?.channels?.[0]?.alternatives?.[0]?.transcript || ''
        detectedLanguage = dgResult.results?.channels?.[0]?.detected_language || 'en'

        logger.log(`[TRANSCRIBE] Deepgram transcription successful: ${transcriptText.length} chars, language: ${detectedLanguage}`)

      } else if (openaiKey) {
        // Fallback: OpenAI Whisper
        logger.log('[TRANSCRIBE] Using OpenAI Whisper for transcription...')

        const OpenAI = require('openai').default
        const openaiClient = new OpenAI({ apiKey: openaiKey })

        const whisperFile = new File([buffer], audioFile.name || 'recording.webm', {
          type: audioFile.type || 'audio/webm',
        })

        const transcription = await openaiClient.audio.transcriptions.create({
          file: whisperFile,
          model: 'whisper-1',
          language: 'en',
          response_format: 'verbose_json',
        })

        transcriptText = transcription.text || ''
        detectedLanguage = transcription.language || 'en'

        logger.log(`[TRANSCRIBE] Whisper transcription successful: ${transcriptText.length} chars, language: ${detectedLanguage}`)
      }
    } catch (transcribeErr: any) {
      logger.error('[TRANSCRIBE] Transcription error:', transcribeErr.message)

      // If Deepgram failed and OpenAI is available, try OpenAI as fallback
      if (deepgramKey && openaiKey) {
        logger.log('[TRANSCRIBE] Deepgram failed, falling back to OpenAI Whisper...')
        try {
          const OpenAI = require('openai').default
          const openaiClient = new OpenAI({ apiKey: openaiKey })

          const whisperFile = new File([buffer], audioFile.name || 'recording.webm', {
            type: audioFile.type || 'audio/webm',
          })

          const transcription = await openaiClient.audio.transcriptions.create({
            file: whisperFile,
            model: 'whisper-1',
            language: 'en',
            response_format: 'verbose_json',
          })

          transcriptText = transcription.text || ''
          detectedLanguage = transcription.language || 'en'

          logger.log(`[TRANSCRIBE] Whisper fallback successful: ${transcriptText.length} chars`)
        } catch (whisperErr: any) {
          logger.error('[TRANSCRIBE] Whisper fallback also failed:', whisperErr.message)
          return NextResponse.json(
            {
              error: 'Transcription failed',
              message: 'Both Deepgram and OpenAI Whisper failed. Please try again.',
            },
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          )
        }
      } else {
        return NextResponse.json(
          {
            error: 'Transcription failed',
            message: transcribeErr.message || 'Could not transcribe the audio.',
          },
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
      }
    }

    if (!transcriptText || transcriptText.trim().length < 5) {
      return NextResponse.json(
        {
          error: 'No speech detected',
          message: 'Could not detect any speech in the audio. Please speak clearly and try again.',
        },
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // For interim requests, just return the transcript — no DB save
    if (isInterim) {
      return NextResponse.json(
        { transcript: transcriptText, language: detectedLanguage },
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Save the voice recording to the database for training data (final request only)
    let voiceRecordingId = ''
    try {
      const voiceRecording = await (db as any).voiceRecording.create({
        data: {
          founderId: founder.id,
          fileName: audioFile.name || 'recording.webm',
          fileUrl: savedFilePath || null,
          fileType: audioFile.type || 'audio/webm',
          fileSize: audioFile.size,
          durationSeconds: durationSeconds,
          transcript: transcriptText,
          language: detectedLanguage,
          founderSnapshot: JSON.stringify(buildFounderSnapshot(founder)),
        },
      })
      voiceRecordingId = voiceRecording.id
      logger.log(`[TRANSCRIBE] Saved voice recording to DB: ${voiceRecordingId}`)
    } catch (dbErr: any) {
      logger.error('[TRANSCRIBE] Failed to save voice recording to DB (non-critical):', dbErr.message)
    }

    return NextResponse.json(
      {
        transcript: transcriptText,
        voiceRecordingId,
        language: detectedLanguage,
        durationSeconds,
      },
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    logger.error('[TRANSCRIBE] Unexpected error:', error?.message || error)
    return NextResponse.json(
      { error: 'Transcription failed', message: error?.message || 'Unknown error' },
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

