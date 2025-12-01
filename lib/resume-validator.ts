/**
 * Resume Validation
 * Checks if uploaded file is actually a resume and not random content
 * Trained on sample resumes for better recognition
 */

export interface ValidationResult {
  isValid: boolean
  confidence: number
  reasons: string[]
  warnings?: string[]
}

// Enhanced keywords learned from sample resumes
const RESUME_KEYWORDS = [
  // Contact info
  'email', 'phone', 'linkedin', 'github', 'twitter',
  
  // Sections (learned from samples)
  'experience', 'education', 'skills', 'work history',
  'employment', 'projects', 'achievements', 'summary',
  'objective', 'profile', 'qualifications',
  'current venture', 'seeking', 'traction', 'metrics',
  'open source', 'awards', 'certifications',
  
  // Job titles (expanded from samples)
  'engineer', 'developer', 'manager', 'director', 'founder',
  'ceo', 'cto', 'cfo', 'coo', 'president', 'designer', 
  'analyst', 'consultant', 'lead', 'senior', 'junior', 
  'intern', 'vp', 'vice president', 'researcher',
  
  // Education (expanded)
  'university', 'college', 'bachelor', 'master', 'phd',
  'degree', 'diploma', 'graduate', 'undergraduate',
  'bs', 'ba', 'ms', 'ma', 'mba', 'gpa',
  
  // Skills (expanded from technical resumes)
  'python', 'javascript', 'typescript', 'java', 'go', 'rust',
  'react', 'node', 'sql', 'pytorch', 'tensorflow',
  'aws', 'gcp', 'docker', 'kubernetes', 'git',
  'management', 'leadership', 'communication',
  
  // Traction keywords (from sample resumes)
  'mrr', 'arr', 'revenue', 'users', 'customers', 'mau', 'dau',
  'growth', 'retention', 'pipeline', 'cac', 'ltv',
  'stars', 'downloads', 'contributors',
  
  // Dates (resume-like patterns)
  '2020', '2021', '2022', '2023', '2024', '2025', '2026',
  'present', 'current',
]

const SUSPICIOUS_PATTERNS = [
  // Non-resume content
  /once upon a time/i,
  /dear (sir|madam)/i,
  /chapter \d+/i,
  /table of contents/i,
  /copyright \d{4}/i,
  /lorem ipsum/i,
  
  // Spam/inappropriate
  /click here to buy/i,
  /get rich quick/i,
  /congratulations you won/i,
]

export async function validateResume(text: string): Promise<ValidationResult> {
  const textLower = text.toLowerCase()
  const words = text.split(/\s+/).length
  const lines = text.split('\n').filter(line => line.trim().length > 0)
  
  // Check minimum length - resumes should have substantial content (VERY LENIENT)
  if (words < 30) {
    return {
      isValid: false,
      confidence: 0,
      reasons: ['File is too short to be a resume (minimum 30 words required)'],
    }
  }

  // Check maximum length
  if (words > 10000) {
    return {
      isValid: false,
      confidence: 0,
      reasons: ['File is extremely long (over 10,000 words). Please upload a condensed resume or CV.'],
    }
  }

  const warnings: string[] = []
  if (words > 5000) {
    warnings.push('Resume is quite long. Consider condensing to 1-2 pages for better readability.')
  }

  // Check for suspicious patterns (non-resume content)
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(text)) {
      return {
        isValid: false,
        confidence: 0,
        reasons: ['Content does not appear to be a resume (suspicious patterns detected)'],
      }
    }
  }

  // STRICT: Check for assignment/homework patterns
  const assignmentPatterns = [
    /assignment\s+#?\d+/i,
    /homework\s+#?\d+/i,
    /due\s+date/i,
    /submitted\s+by/i,
    /course\s+code/i,
    /professor|instructor/i,
    /rubric|grading/i,
    /question\s+\d+/i,
    /problem\s+\d+/i,
    /chapter\s+\d+/i,
    /textbook/i,
    /reading\s+response/i,
  ]

  for (const pattern of assignmentPatterns) {
    if (pattern.test(text)) {
      return {
        isValid: false,
        confidence: 0,
        reasons: [
          'This appears to be a school assignment or homework, not a resume',
          'Please upload a professional resume or CV document',
        ],
      }
    }
  }

  // ENHANCED: Check for resume sections (learned from sample resumes)
  // Recognize various section header formats (=== CURRENT VENTURE ===, EXPERIENCE, etc.)
  const sectionHeaderPatterns = [
    /^===+\s*(CURRENT\s+VENTURE|EXPERIENCE|EDUCATION|SKILLS|PROJECTS|SEEKING|OPEN\s+SOURCE|AWARDS)/i,
    /^---+\s*(CURRENT\s+VENTURE|EXPERIENCE|EDUCATION|SKILLS|PROJECTS|SEEKING|OPEN\s+SOURCE|AWARDS)/i,
    /^(EXPERIENCE|EDUCATION|SKILLS|PROJECTS|CURRENT\s+VENTURE|SEEKING|OPEN\s+SOURCE|AWARDS)\s*$/i,
  ]
  
  const hasSectionHeaders = sectionHeaderPatterns.some(pattern => pattern.test(text))
  
  // Check for Experience section with actual job entries (ULTRA-FLEXIBLE patterns)
  const experienceSection = /(?:experience|work\s+history|employment|professional\s+experience|career|current\s+venture|background|roles|positions)/i.test(text)
  const hasJobEntries = 
    // Founder/executive roles (very flexible)
    /(?:founder|ceo|cto|cfo|coo|president|co-founder|owner|proprietor)(?:.*?)(?:-|at|@|of|&|\s+[-–—])\s*[A-Z]/i.test(text) ||
    // ANY professional role (expanded massively)
    /(?:engineer|developer|manager|director|analyst|designer|lead|senior|junior|intern|consultant|specialist|coordinator|assistant|executive|vp|vice\s+president|researcher|player|coach|editor|producer|writer|content\s+creator|influencer|streamer|athlete|trainer|instructor|teacher|tutor|advisor|strategist|architect|administrator|officer|partner|associate).*?(?:at|@|for|with|of|company|startup|inc|llc|corp|ltd|lab|business|team|league|media|platform|studio|agency|firm)/i.test(text) ||
    // Action verbs indicating work (massively expanded)
    /(?:worked|employed|position|role|job|founded|co-founded|started|created|built|developed|led|managed|organized|edited|produced|wrote|researched|coached|mentored|spearheaded|generated|trained|ranked|earned|grew|won|achieved|launched|scaled|designed|implemented|executed|delivered|directed|coordinated|oversaw|supervised|advised|consulted|analyzed|optimized|streamlined|increased|decreased|improved|transformed).*?(?:at|@|as|for|with|on|in)/i.test(text) ||
    // Company names with roles (super flexible)
    /(?:^|\n)\s*[A-Z][a-zA-Z\s&]+(?:Inc|LLC|Corp|Ltd|Technologies|Systems|Solutions|Ventures|Capital|Fund|Business|Team|League|Media|Clothing|Gaming|Esports|Studios|Group|Partners)?\s*[-–—]\s*[A-Z]/i.test(text) ||
    // [Role] at/of [Company] patterns (e.g., "Manager of XPLeague")
    /(?:manager|founder|owner|creator|lead|director|head|coordinator)\s+(?:of|at|for)\s+[A-Z][a-zA-Z]+/i.test(text) ||
    // Professional [Specialty] patterns (e.g., "Professional Fortnite Player", "Content Creator")
    /professional\s+(?:\w+\s+)?(?:player|streamer|creator|athlete|trainer)/i.test(text) ||
    // Company name followed by date in parentheses (e.g., "KWUClothing Business (August 2023)")
    /[A-Z][a-zA-Z]{2,}(?:\s+[A-Z][a-z]+)*(?:\s+Business|\s+Team|\s+League|\s+Media|\s+Clothing|\s+Gaming|\s+Esports)?\s*\([A-Z][a-z]+\s+\d{4}/i.test(text) ||
    // Simple "Role - Company" format (e.g., "Software Engineer - Google")
    /[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+[-–—]\s+[A-Z][a-z]+/i.test(text) ||
    // ANY line with a year and a role-sounding word
    /(?:20\d{2}|19\d{2}).*?(?:engineer|developer|manager|founder|player|coach|creator|analyst|designer|consultant|intern)/i.test(text) ||
    // Freelance/Contract work patterns
    /(?:freelance|contract|self-employed|independent).*?(?:developer|designer|consultant|writer|creator|coach|trainer)/i.test(text)
  
  // Check for Education section with actual school/degree info (ULTRA-FLEXIBLE)
  const educationSection = /(?:education|academic|university|college|school|training|qualifications|certifications)/i.test(text)
  const hasEducationEntries = 
    // ANY university name (not just top ones)
    /(?:university|college|school|institute|academy)(?:\s+of\s+[A-Z][a-z]+)*/i.test(text) ||
    // Top universities specifically (to be extra sure we catch them)
    /(?:stanford|mit|harvard|berkeley|carnegie|mellon|caltech|cornell|yale|princeton|columbia|nyu|ucla|georgia\s+tech|ut\s+austin|michigan|illinois|wisconsin|penn|duke|northwestern|boston|johns\s+hopkins)/i.test(text) ||
    // Degree types (any degree = education)
    /(?:bachelor|master|phd|doctorate|degree|diploma|certificate|bs|ba|ms|ma|mba|ph\.?d\.?|associates|aa|as)/i.test(text) ||
    // Major/Field of study patterns
    /(?:major|degree|studying).*?(?:in|of)\s+(?:computer|science|engineering|business|arts|mathematics|physics|chemistry|biology|economics|finance|marketing)/i.test(text) ||
    // School with year (any 4-digit year = likely education)
    /(?:school|college|university|institute).*?(?:20\d{2}|19\d{2})/i.test(text) ||
    // High school (valid education)
    /high\s+school|secondary\s+school|preparatory/i.test(text) ||
    // GPA mentioned (strong education signal)
    /gpa|grade\s+point/i.test(text) ||
    // Currently enrolled patterns
    /(?:currently|presently|now)\s+(?:enrolled|attending|studying|pursuing)/i.test(text) ||
    // Year + education keyword
    /(?:20\d{2}|19\d{2}).*?(?:graduate|graduated|degree|diploma|student|enrolled)/i.test(text)
  
  // Check for Skills section (ULTRA-FLEXIBLE - accept almost any skills)
  const skillsSection = /(?:skills|expertise|proficiencies|technical\s+skills|competencies|programming|tools|capabilities|strengths|abilities)/i.test(text)
  const hasSkillsList = 
    // Technical skills (massively expanded)
    /(?:python|javascript|typescript|java|c#|c\+\+|php|ruby|swift|kotlin|scala|rust|go|perl|r|matlab|html|css|react|angular|vue|svelte|next|node|express|django|flask|rails|spring|asp\.net|sql|nosql|postgresql|mysql|mongodb|redis|firebase|aws|azure|gcp|heroku|vercel|netlify|docker|kubernetes|jenkins|gitlab|github|terraform|ansible|linux|unix|windows|mac|ios|android|git|svn|jira|confluence|slack|notion|figma|adobe|photoshop|illustrator|sketch|pytorch|tensorflow|keras|scikit|pandas|numpy|opencv|nlp|llm|gpt|openai|hugging\s*face|langchain|rag|machine\s+learning|deep\s+learning|ai|ml|data\s+science|analytics)/i.test(text) ||
    // Business/GTM/Soft skills (massively expanded)
    /(?:sales|marketing|gtm|go-to-market|b2b|b2c|saas|revenue|customers|clients|pipeline|forecasting|crm|salesforce|hubspot|cac|ltv|retention|churn|acquisition|growth|product|strategy|analytics|metrics|kpi|roi|seo|sem|ppc|content|social\s+media|email|campaigns|branding|positioning|messaging|copywriting|storytelling|presentation|negotiation|closing|prospecting|cold\s+calling|networking|relationship|leadership|management|team|collaboration|communication|public\s+speaking|writing|research|analysis|problem\s+solving|critical\s+thinking|creativity|innovation|agile|scrum|kanban|lean|product\s+management|project\s+management|program\s+management|strategy|planning|execution|operations|logistics|supply\s+chain|finance|accounting|budgeting|fundraising|investor\s+relations|legal|compliance|hr|recruiting|hiring|training|mentoring|coaching)/i.test(text) ||
    // Skills list patterns
    /(?:proficient|experienced|skilled|expert|familiar|knowledgeable|competent|capable|strong|advanced|intermediate|beginner|learning).*?(?:in|with|using|at)/i.test(text) ||
    // Colon-separated skills (any list format)
    /(?:programming|skills|tools|technologies|languages|frameworks|platforms|software|applications|competencies)[:]\s*[A-Za-z,\s]+/i.test(text) ||
    // Bullet points with skills (common format)
    /(?:^|\n)\s*[-•*]\s*(?:proficient|experienced|skilled|knowledge)/i.test(text) ||
    // ANY technical or professional term repeated multiple times (likely a skills list)
    /(?:python|javascript|react|aws|sales|marketing|leadership)/i.test(text)
  
  // Check for contact information
  const hasEmail = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(text)
  const hasPhone = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\d{10}/.test(text)
  const hasContact = hasEmail || hasPhone || /linkedin\.com|github\.com/i.test(text)
  
  // Check for dates (resume timeline) - improved patterns from samples - VERY FLEXIBLE
  const hasDateRanges = 
    // Year ranges (2020 - Present, 2023-2024, 2020 - 2025, 2020–2025)
    /(?:20\d{2}|19\d{2})\s*(?:[-–—]|to)\s*(?:20\d{2}|19\d{2}|present|current)/i.test(text) ||
    // Month Year ranges (Jan 2023 - Present, August 2023 - August 2025, Aug 2023-Aug 2025)
    /(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{4}\s*(?:[-–—]|to)\s*(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|present|current|\d{4})/i.test(text) ||
    // Full month names with years (January 2020, August 2023 - August 2025)
    /(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{4}\s*(?:[-–—]|to)\s*(?:january|february|march|april|may|june|july|august|september|october|november|december|present|current|\d{4})/i.test(text) ||
    // Full month names alone (indicates dates present)
    /(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{4}/i.test(text) ||
    // MM/YYYY format
    /\d{1,2}\/\d{4}/.test(text) ||
    // Just years with "Present" or "Current" nearby
    /(?:20\d{2}|19\d{2}).*?(?:present|current)/i.test(text) ||
    // Any year followed by dash/hyphen (very lenient)
    /(?:20\d{2}|19\d{2})\s*[-–—]/.test(text) ||
    // Year in parentheses (common resume format)
    /\([A-Z][a-z]+\s+(?:20\d{2}|19\d{2})/.test(text) ||
    // Just presence of years (very lenient fallback)
    /(?:20\d{2}|19\d{2})/.test(text)
  
  // Check for company/organization names (improved patterns from samples) - VERY FLEXIBLE
  const hasCompanyNames = 
    // At/with company pattern
    /(?:at|@|with|founded|co-founded)\s+[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*(?:\s+(?:Inc|LLC|Corp|Ltd|Company|Technologies|Systems|Solutions|Ventures|Capital|Fund|Lab|Labs|Business|Team|League|Clothing|Media|University|College|School|Institute))?/i.test(text) ||
    // Company name - Role pattern (from samples) - more flexible
    /[A-Z][a-zA-Z\s&]+(?:Inc|LLC|Corp|Ltd|Technologies|Systems|Solutions|Ventures|Capital|Fund|Lab|Labs|Business|Team|League|Clothing|Media|University|College|School|Institute)?\s*[-–—]\s*(?:founder|ceo|cto|engineer|developer|manager|director|analyst|player|coach|intern|researcher|specialist|coordinator)/i.test(text) ||
    // Role at Company pattern
    /(?:founder|ceo|cto|engineer|developer|manager|director|analyst|intern|researcher|player|coach|manager\s+of|professional|senior|junior|lead)\s+(?:at|@|-|of)\s+[A-Z][a-zA-Z]+/i.test(text) ||
    // Standalone capitalized business names (KWUClothing, XSET, XPLeague) - more flexible
    /(?:^|\n)\s*[A-Z][A-Za-z]{2,}(?:[A-Z][a-z]+)?(?:\s+[A-Z][a-z]+)*(?:\s+Business|\s+Team|\s+League|\s+Media|\s+Clothing|\s+University|\s+College|\s+School)?\s*\(/i.test(text) ||
    // Business/Company names followed by dates (common resume format)
    /[A-Z][a-zA-Z]{2,}(?:\s+[A-Z][a-z]+)*(?:\s+Business|\s+Team|\s+League|\s+Media|\s+Clothing|\s+University|\s+College|\s+School)?\s*\([A-Z][a-z]+\s+\d{4}/i.test(text) ||
    // Capitalized words that look like company names (very lenient)
    /(?:^|\n)\s*[A-Z][A-Za-z]{3,}(?:\s+[A-Z][a-z]+)+\s*\(/i.test(text) ||
    // Any capitalized multi-word entity followed by parentheses (likely company)
    /[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,}\s*\(/i.test(text)
  
  // Check for traction metrics (from sample resumes)
  const hasTractionMetrics = 
    /(?:mrr|arr|revenue|users|customers|mau|dau|growth|retention|pipeline|cac|ltv|stars|downloads|contributors)/i.test(text) &&
    /\d+[km]?\s*(?:mrr|arr|revenue|users|customers|mau|dau|growth|retention|pipeline|cac|ltv|stars|downloads|contributors)/i.test(text)

  // ENHANCED VALIDATION: Score sections more accurately (learned from samples)
  const sectionScores = {
    experience: (experienceSection ? 2 : 0) + (hasJobEntries ? 3 : 0) + (hasCompanyNames ? 1 : 0),
    education: (educationSection ? 2 : 0) + (hasEducationEntries ? 3 : 0),
    skills: (skillsSection ? 2 : 0) + (hasSkillsList ? 3 : 0),
  }
  
  // Bonus for founder-focused resumes (common in samples)
  const hasFounderSection = /(?:current\s+venture|seeking|raising|funding|startup)/i.test(text)
  if (hasFounderSection) {
    sectionScores.experience += 2 // Founder section counts as experience
  }

  const totalSectionScore = sectionScores.experience + sectionScores.education + sectionScores.skills
  
  // Must have at least 2 sections with actual content (score >= 3 each, or 1 excellent + 1 good)
  const validSections = Object.values(sectionScores).filter(score => score >= 3).length
  const goodSections = Object.values(sectionScores).filter(score => score >= 2).length
  
  // More lenient: accept if 2+ good sections OR 1 excellent section
  const hasMinimumSections = validSections >= 2 || (validSections >= 1 && goodSections >= 2)
  
  // Additional indicators
  const hasName = /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+/m.test(text.split('\n').slice(0, 3).join('\n'))
  const hasLocation = /(?:location|address|city|state|country|based\s+in)/i.test(text) || /[A-Z][a-z]+,\s*[A-Z]{2}/.test(text)

  // Calculate confidence based on multiple factors (enhanced scoring)
  let confidence = 0
  confidence += validSections * 20 // Up to 60 points for excellent sections
  confidence += (goodSections - validSections) * 10 // Up to 20 points for good sections
  confidence += hasContact ? 10 : 0
  confidence += hasDateRanges ? 8 : 0
  confidence += hasCompanyNames ? 5 : 0
  confidence += hasTractionMetrics ? 5 : 0 // Bonus for founder resumes with metrics
  confidence += hasFounderSection ? 5 : 0 // Bonus for founder-focused format
  confidence += hasSectionHeaders ? 3 : 0 // Bonus for well-structured format
  confidence = Math.min(100, confidence)

  // ULTRA-LENIENT REQUIREMENTS: Accept resumes that clearly have SOME professional content
  // This is trained to be very accepting of valid resumes while still rejecting garbage
  
  // ANY of these criteria make it a valid resume:
  const hasStrongSections = validSections >= 3 // 3+ excellent sections = definitely a resume
  const hasDecentSections = validSections >= 2 || goodSections >= 3 // 2+ excellent OR 3+ good = probably a resume
  const hasAnyProfessionalContent = 
    (hasJobEntries && hasEducationEntries) || // Has work AND education = resume
    (hasJobEntries && hasSkillsList) || // Has work AND skills = resume
    (hasFounderSection && (hasSkillsList || hasEducationEntries)) || // Founder section + skills/education = startup resume
    (hasTractionMetrics && hasJobEntries) || // Metrics + jobs = founder resume
    (hasCompanyNames && hasDateRanges && goodSections >= 2) // Company names + dates + 2 sections = resume
  
  // We're lenient - if it has SOME professional content OR decent sections OR contact info + sections, it's probably valid
  const hasMinimumContent = 
    hasStrongSections || // 3+ excellent sections = auto-pass
    (hasDecentSections && hasContact) || // 2+ sections + contact = pass
    (hasAnyProfessionalContent && (hasContact || hasDateRanges)) || // Professional content + contact/dates = pass
    (validSections >= 1 && goodSections >= 2 && hasDateRanges) || // 1 excellent + 2 good + dates = pass
    (hasFounderSection && hasContact && (hasCompanyNames || hasTractionMetrics)) // Founder resume = pass
  
  if (!hasMinimumContent) {
    const missing: string[] = []
    missing.push(`Your document doesn't appear to be a professional resume`)
    missing.push(`\nDEBUG INFO:`)
    missing.push(`- Excellent sections (score ≥3): ${validSections}/3`)
    missing.push(`- Good sections (score ≥2): ${goodSections}/3`)
    missing.push(`- Experience section: ${experienceSection ? 'YES' : 'NO'}`)
    missing.push(`- Job entries: ${hasJobEntries ? 'YES' : 'NO'}`)
    missing.push(`- Education section: ${educationSection ? 'YES' : 'NO'}`)
    missing.push(`- Education entries: ${hasEducationEntries ? 'YES' : 'NO'}`)
    missing.push(`- Skills section: ${skillsSection ? 'YES' : 'NO'}`)
    missing.push(`- Skills list: ${hasSkillsList ? 'YES' : 'NO'}`)
    missing.push(`- Contact info: ${hasContact ? 'YES' : 'NO'}`)
    missing.push(`- Date ranges: ${hasDateRanges ? 'YES' : 'NO'}`)
    missing.push(`- Company names: ${hasCompanyNames ? 'YES' : 'NO'}`)
    missing.push(`- Founder section: ${hasFounderSection ? 'YES' : 'NO'}`)
    missing.push(`- Traction metrics: ${hasTractionMetrics ? 'YES' : 'NO'}`)
    missing.push(`\nTO FIX: Ensure your resume has clear sections for Experience, Education, and Skills with actual content.`)

    return {
      isValid: false,
      confidence,
      reasons: missing,
    }
  }

  // Additional quality checks
  if (!hasName) {
    warnings.push('No clear name found at the top of the resume')
  }
  if (validSections < 3) {
    warnings.push('Consider adding all three sections: Experience, Education, and Skills')
  }

  const reasons: string[] = []
  reasons.push(`Resume validated with ${confidence.toFixed(0)}% confidence`)
  reasons.push(`Found ${validSections}/3 required sections with content`)
  if (hasContact) reasons.push('Contact information present')
  if (hasDateRanges) reasons.push('Work timeline present')

  return {
    isValid: true,
    confidence,
    reasons,
    warnings: warnings.length > 0 ? warnings : undefined,
  }
}

/**
 * Quick validation for file type and size
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
  // Check file size (max 5MB)
  const maxSize = 5 * 1024 * 1024 // 5MB
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File is too large. Maximum size is 5MB.',
    }
  }

  // Check file type
  const allowedTypes = [
    'text/plain',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ]

  const allowedExtensions = ['.txt', '.pdf', '.doc', '.docx']
  const extension = '.' + file.name.split('.').pop()?.toLowerCase()

  if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(extension)) {
    return {
      valid: false,
      error: 'Invalid file type. Please upload PDF, DOC, DOCX, or TXT files only.',
    }
  }

  return { valid: true }
}

