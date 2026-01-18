/**
 * Speech Pattern Analysis for Video Pitches
 * Analyzes transcript to extract speech patterns, pacing, clarity, and confidence signals
 */

export interface SpeechPatterns {
  pacing: {
    wordsPerMinute: number
    averagePauseLength: number
    pacingScore: number // 0-100
    description: string
  }
  clarity: {
    fillerWordCount: number
    repetitionCount: number
    clarityScore: number // 0-100
    description: string
  }
  confidence: {
    hesitationCount: number
    certaintyWords: number
    confidenceScore: number // 0-100
    description: string
  }
  structure: {
    hasIntroduction: boolean
    hasProblem: boolean
    hasSolution: boolean
    hasTraction: boolean
    hasAsk: boolean
    structureScore: number // 0-100
  }
  summary: string
}

const FILLER_WORDS = ['um', 'uh', 'like', 'you know', 'so', 'well', 'actually', 'basically', 'literally']
const HESITATION_PATTERNS = ['um', 'uh', 'er', 'ah', 'hmm']
const CERTAINTY_WORDS = ['definitely', 'absolutely', 'certainly', 'clearly', 'obviously', 'surely', 'undoubtedly']
const PROBLEM_KEYWORDS = ['problem', 'issue', 'challenge', 'pain', 'frustration', 'difficulty', 'struggle']
const SOLUTION_KEYWORDS = ['solution', 'solve', 'build', 'create', 'develop', 'product', 'service']
const TRACTION_KEYWORDS = ['revenue', 'users', 'customers', 'growth', 'mrr', 'arr', 'traction', 'metrics']
const ASK_KEYWORDS = ['raise', 'funding', 'investment', 'invest', 'capital', 'round', 'seed', 'series']

/**
 * Analyze speech patterns from transcript
 */
export function analyzeSpeechPatterns(transcript: string): SpeechPatterns {
  const words = transcript.toLowerCase().split(/\s+/)
  const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 0)
  const totalWords = words.length
  const totalDuration = estimateDuration(totalWords) // Rough estimate: 150 words per minute
  
  // Pacing analysis
  const wordsPerMinute = totalDuration > 0 ? (totalWords / totalDuration) * 60 : 150
  const pauses = transcript.match(/[.!?,;:]\s+/g) || []
  const averagePauseLength = pauses.length > 0 ? transcript.length / pauses.length : 0
  
  let pacingScore = 100
  let pacingDesc = 'Optimal pacing'
  if (wordsPerMinute < 100) {
    pacingScore = 60
    pacingDesc = 'Slow pacing - may lose audience attention'
  } else if (wordsPerMinute > 200) {
    pacingScore = 70
    pacingDesc = 'Fast pacing - may be hard to follow'
  } else if (wordsPerMinute >= 120 && wordsPerMinute <= 180) {
    pacingScore = 95
    pacingDesc = 'Excellent pacing - engaging and clear'
  }
  
  // Clarity analysis
  const fillerWordCount = words.filter(w => FILLER_WORDS.includes(w)).length
  const fillerRatio = totalWords > 0 ? fillerWordCount / totalWords : 0
  
  // Check for repetition (simple: consecutive repeated words)
  let repetitionCount = 0
  for (let i = 1; i < words.length; i++) {
    if (words[i] === words[i - 1] && words[i].length > 2) {
      repetitionCount++
    }
  }
  
  let clarityScore = 100
  let clarityDesc = 'Clear and articulate'
  if (fillerRatio > 0.05) {
    clarityScore -= 20
    clarityDesc = `High filler word usage (${fillerWordCount} instances) - reduces clarity`
  }
  if (repetitionCount > 5) {
    clarityScore -= 15
    clarityDesc += ` - Some repetition detected`
  }
  clarityScore = Math.max(0, clarityScore)
  
  // Confidence analysis
  const hesitationCount = words.filter(w => HESITATION_PATTERNS.includes(w)).length
  const certaintyWords = words.filter(w => CERTAINTY_WORDS.includes(w)).length
  
  let confidenceScore = 50 // Base score
  let confidenceDesc = 'Moderate confidence'
  
  if (hesitationCount > 10) {
    confidenceScore -= 20
    confidenceDesc = `High hesitation (${hesitationCount} instances) - may indicate uncertainty`
  } else if (hesitationCount < 3) {
    confidenceScore += 15
    confidenceDesc = 'Low hesitation - confident delivery'
  }
  
  if (certaintyWords > 5) {
    confidenceScore += 15
    confidenceDesc += ' - Uses confident language'
  }
  
  confidenceScore = Math.min(100, Math.max(0, confidenceScore))
  
  // Structure analysis
  const transcriptLower = transcript.toLowerCase()
  const hasIntroduction = sentences.length > 0 && sentences[0].length > 20
  const hasProblem = PROBLEM_KEYWORDS.some(kw => transcriptLower.includes(kw))
  const hasSolution = SOLUTION_KEYWORDS.some(kw => transcriptLower.includes(kw))
  const hasTraction = TRACTION_KEYWORDS.some(kw => transcriptLower.includes(kw))
  const hasAsk = ASK_KEYWORDS.some(kw => transcriptLower.includes(kw))
  
  const structureElements = [hasIntroduction, hasProblem, hasSolution, hasTraction, hasAsk]
  const structureScore = (structureElements.filter(Boolean).length / structureElements.length) * 100
  
  // Summary
  const summary = `Pacing: ${Math.round(wordsPerMinute)} WPM (${pacingDesc}). Clarity: ${clarityDesc}. Confidence: ${confidenceDesc}. Structure: ${structureElements.filter(Boolean).length}/5 key elements present.`
  
  return {
    pacing: {
      wordsPerMinute: Math.round(wordsPerMinute),
      averagePauseLength: Math.round(averagePauseLength),
      pacingScore,
      description: pacingDesc,
    },
    clarity: {
      fillerWordCount,
      repetitionCount,
      clarityScore,
      description: clarityDesc,
    },
    confidence: {
      hesitationCount,
      certaintyWords,
      confidenceScore,
      description: confidenceDesc,
    },
    structure: {
      hasIntroduction,
      hasProblem,
      hasSolution,
      hasTraction,
      hasAsk,
      structureScore,
    },
    summary,
  }
}

/**
 * Estimate video duration based on word count
 */
function estimateDuration(wordCount: number): number {
  // Average speaking rate: 150 words per minute
  return wordCount / 150
}
