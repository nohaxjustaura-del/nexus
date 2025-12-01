import fs from 'fs'
import path from 'path'

// Reference resume patterns extracted from user's resume
let referenceResumeText: string | null = null
let referenceFeatures: any = null

export async function loadReferenceResume(): Promise<string | null> {
  if (referenceResumeText) {
    return referenceResumeText
  }

  try {
    // Try loading from sample resumes first (better examples)
    const sampleDir = path.join(process.cwd(), 'sample-resumes')
    if (fs.existsSync(sampleDir)) {
      const sampleFiles = fs.readdirSync(sampleDir)
      const txtFiles = sampleFiles.filter(f => f.endsWith('.txt'))
      
      if (txtFiles.length > 0) {
        // Use the first sample resume as reference
        const samplePath = path.join(sampleDir, txtFiles[0])
        referenceResumeText = fs.readFileSync(samplePath, 'utf-8')
        console.log(`✅ Loaded sample resume (${txtFiles[0]}) for pattern matching`)
        return referenceResumeText
      }
    }

    // Fallback to RESUME.pdf if available
    const resumePath = path.join(process.cwd(), 'RESUME.pdf')
    
    if (!fs.existsSync(resumePath)) {
      console.log('Reference resume not found at:', resumePath)
      return null
    }

    // Use dynamic import for pdf-parse (lazy load to avoid build issues)
    // Handle both ESM default export and CommonJS module.exports
    const pdfParseModule = await import('pdf-parse')
    // pdf-parse can export differently, try multiple ways
    let pdfParse: any = pdfParseModule
    if (typeof pdfParseModule === 'object' && (pdfParseModule as any).default) {
      pdfParse = (pdfParseModule as any).default
    } else if (typeof pdfParseModule === 'function') {
      pdfParse = pdfParseModule
    }
    
    const dataBuffer = fs.readFileSync(resumePath)
    const data = await pdfParse(dataBuffer)
    referenceResumeText = data.text
    
    console.log('✅ Loaded reference resume for pattern matching')
    return referenceResumeText
  } catch (error) {
    console.error('Error loading reference resume:', error)
    // Don't throw - this is optional functionality
    // If PDF parsing fails, we just continue without reference resume
    return null
  }
}

export function getReferenceResumeText(): string | null {
  return referenceResumeText
}

export function setReferenceFeatures(features: any) {
  referenceFeatures = features
}

export function getReferenceFeatures() {
  return referenceFeatures
}

// Extract common patterns from reference resume
export function extractReferencePatterns(resumeText: string): {
  structure: string[]
  commonSections: string[]
  formatStyle: string
  metricsPatterns: RegExp[]
} {
  const lines = resumeText.split('\n').map(l => l.trim()).filter(l => l.length > 0)
  
  // Identify section headers
  const sectionHeaders: string[] = []
  const commonSections: string[] = []
  
  lines.forEach(line => {
    const upperLine = line.toUpperCase()
    // Recognize markdown-style headers (=== CURRENT VENTURE ===)
    if (line.match(/^===+\s*(CURRENT\s+VENTURE|EXPERIENCE|EDUCATION|SKILLS|PROJECTS|SEEKING|OPEN\s+SOURCE|AWARDS|CERTIFICATIONS|SUMMARY|OBJECTIVE)/i)) {
      const sectionName = line.replace(/[=\-]/g, '').trim() // Fixed: escape hyphen or use [=-]
      sectionHeaders.push(sectionName)
      commonSections.push(sectionName.toLowerCase())
    }
    // Recognize standard headers
    else if (upperLine.match(/^(EXPERIENCE|EDUCATION|SKILLS|PROJECTS|CURRENT\s+VENTURE|SEEKING|OPEN\s+SOURCE|AWARDS|CERTIFICATIONS|SUMMARY|OBJECTIVE|TRACTION|METRICS)/)) {
      sectionHeaders.push(line)
      commonSections.push(line.toLowerCase())
    }
  })

  // Identify format style
  let formatStyle = 'standard'
  if (resumeText.includes('===') || resumeText.includes('---')) {
    formatStyle = 'markdown'
  } else if (resumeText.match(/\d{4}\s*[-–]\s*(present|current|\d{4})/gi)) {
    formatStyle = 'chronological'
  }

  // Extract metrics patterns (enhanced from sample resumes)
  const metricsPatterns: RegExp[] = [
    // Revenue metrics
    /\$?\d+[km]?\s*(mrr|arr|revenue|monthly\s+recurring|annual\s+recurring)/i,
    // User metrics
    /\d+[km]?\s*(users|customers|mau|dau|subscribers|active\s+users|reps)/i,
    // Growth metrics
    /\d+%\s*(mom|yoy|growth|monthly\s+growth|year\s+over\s+year|retention|conversion|win\s+rate)/i,
    // Open source metrics
    /\d+\+\s*(github\s*)?stars/i,
    /\d+\+\s*(repos|repositories|contributors)/i,
    /\d+[km]?\s*(downloads|installs|views|npm\s+installs|weekly\s+downloads)/i,
    // Sales metrics
    /\$?\d+[km]?\s*(pipeline|deals|closed|won|cac|ltv|payback)/i,
    // Engagement metrics
    /\d+[km]?\s*(daily\s+active|monthly\s+active|retention|nps|satisfaction)/i,
  ]

  return {
    structure: sectionHeaders,
    commonSections,
    formatStyle,
    metricsPatterns,
  }
}

