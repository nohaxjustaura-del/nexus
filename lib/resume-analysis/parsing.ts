import { ResumeFeatures } from '@/lib/ai'
import { extractReferencePatterns } from '@/lib/resume-reference'

export function parseMetric(str: string): number {
  const cleaned = str.replace(/[$,]/g, '')
  const num = parseFloat(cleaned)
  if (str.toLowerCase().includes('m')) return num * 1000000
  if (str.toLowerCase().includes('k')) return num * 1000
  return num
}

export async function smartParseResume(
  resumeText: string,
  founderData: any,
  referencePatterns?: ReturnType<typeof extractReferencePatterns> | null
): Promise<ResumeFeatures> {
  const text = resumeText.toLowerCase()
  const lines = resumeText.split('\n').map(l => l.trim()).filter(l => l.length > 0)
  
  // Use reference patterns if available to improve extraction
  if (referencePatterns) {
    // Match section structure from reference
    const referenceSections = referencePatterns.commonSections
    // Use similar parsing logic based on reference format
  }
  
  // Extract name from first few lines
  const nameMatch = resumeText.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/m)
  const name = nameMatch ? nameMatch[1] : founderData.name

  // Extract email
  const emailMatch = resumeText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)
  const email = emailMatch ? emailMatch[0] : founderData.email

  // Extract location
  const locationMatch = resumeText.match(/(?:location|based in|address)[:]\s*([A-Z][a-z]+(?:,\s*[A-Z]{2})?)/i) ||
                      resumeText.match(/([A-Z][a-z]+),\s*([A-Z]{2}|[A-Z][a-z]+)/)
  const city = locationMatch ? locationMatch[1] : founderData.location?.split(',')[0]

  // Detect technical skills with better patterns
  const programmingSkills: string[] = []
  const mlSkills: string[] = []
  const techKeywords: Record<string, string> = {
    python: 'Python', javascript: 'JavaScript', typescript: 'TypeScript',
    react: 'React', 'node.js': 'Node.js', node: 'Node.js',
    go: 'Go', rust: 'Rust', java: 'Java', cpp: 'C++', 'c++': 'C++',
    pytorch: 'PyTorch', tensorflow: 'TensorFlow', llm: 'LLMs',
    'machine learning': 'Machine Learning', ai: 'AI', 
    'deep learning': 'Deep Learning', transformers: 'Transformers',
    sql: 'SQL', aws: 'AWS', docker: 'Docker', kubernetes: 'Kubernetes',
    git: 'Git', mongodb: 'MongoDB', postgresql: 'PostgreSQL',
  }

  // Look for skills section
  let inSkillsSection = false
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase()
    if (/skills|expertise|proficiencies|technical/i.test(line)) {
      inSkillsSection = true
      continue
    }
    if (inSkillsSection && (line.length < 3 || /experience|education|projects/i.test(line))) {
      inSkillsSection = false
    }
    if (inSkillsSection) {
      for (const [key, value] of Object.entries(techKeywords)) {
        if (line.includes(key)) {
          if (['pytorch', 'tensorflow', 'llm', 'machine learning', 'ai', 'deep learning', 'transformers'].includes(key)) {
            if (!mlSkills.includes(value)) mlSkills.push(value)
          } else {
            if (!programmingSkills.includes(value)) programmingSkills.push(value)
          }
        }
      }
    }
  }

  // Also check entire text if no skills section found
  if (programmingSkills.length === 0 && mlSkills.length === 0) {
    for (const [key, value] of Object.entries(techKeywords)) {
      if (text.includes(key)) {
        if (['pytorch', 'tensorflow', 'llm', 'machine learning', 'ai', 'deep learning', 'transformers'].includes(key)) {
          if (!mlSkills.includes(value)) mlSkills.push(value)
        } else {
          if (!programmingSkills.includes(value)) programmingSkills.push(value)
        }
      }
    }
  }

  // Detect leadership roles
  const leadership = /founder|ceo|cto|director|lead engineer|tech lead|manager|vp|vice president|head of|executive/i.test(resumeText)

  // Extract education entries
  const education: any[] = []
  const universities = [
    'stanford', 'mit', 'harvard', 'berkeley', 'carnegie mellon', 
    'caltech', 'cornell', 'yale', 'princeton', 'columbia', 'nyu',
    'ucla', 'uc berkeley', 'georgia tech', 'cmu', 'ut austin'
  ]
  
  // Look for education section
  let inEducationSection = false
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const lineLower = line.toLowerCase()
    if (/education|academic/i.test(lineLower)) {
      inEducationSection = true
      continue
    }
    if (inEducationSection && (/experience|work|skills|projects/i.test(lineLower))) {
      inEducationSection = false
    }
    if (inEducationSection || i < 20) { // Also check first 20 lines
      for (const uni of universities) {
        if (lineLower.includes(uni)) {
          const degreeMatch = line.match(/(bachelor|master|phd|doctorate|bs|ba|ms|ma|ph\.?d)/i)
          const yearMatch = line.match(/(20\d{2}|19\d{2})/)
          education.push({
            school: uni.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
            degree: degreeMatch ? degreeMatch[1] : 'Degree',
            endYear: yearMatch ? parseInt(yearMatch[1]) : new Date().getFullYear(),
          })
          break
        }
      }
    }
  }

  // Extract work experience
  const experience: any[] = []
  let inExperienceSection = false
  let currentExp: any = null
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const lineLower = line.toLowerCase()
    
    if (/experience|work history|employment|professional/i.test(lineLower)) {
      inExperienceSection = true
      continue
    }
    if (inExperienceSection && (/education|skills|projects|summary/i.test(lineLower))) {
      inExperienceSection = false
      if (currentExp) {
        experience.push(currentExp)
        currentExp = null
      }
    }
    
    if (inExperienceSection || i < 30) {
      // Look for job title patterns
      const titleMatch = line.match(/(?:^|\s)(?:Senior|Junior|Lead|Principal|Staff)?\s*(Engineer|Developer|Manager|Director|Founder|CEO|CTO|Designer|Analyst|Consultant|Specialist)/i)
      const companyMatch = line.match(/(?:at|@)\s+([A-Z][a-zA-Z\s&]+(?:Inc|LLC|Corp|Ltd|Technologies|Systems)?)/i) ||
                          line.match(/^([A-Z][a-zA-Z\s&]+(?:Inc|LLC|Corp|Ltd|Technologies|Systems)?)/)
      const dateMatch = line.match(/(\d{4}|\w+\s+\d{4})\s*(?:-|–|to)\s*(\d{4}|present|current)/i)
      
      if (titleMatch && !currentExp) {
        currentExp = {
          title: titleMatch[0].trim(),
          org: companyMatch ? companyMatch[1].trim() : 'Company',
          start: dateMatch ? dateMatch[1] : undefined,
          end: dateMatch ? dateMatch[2] : undefined,
          sectors: founderData.sectors || [],
          skills: [...programmingSkills, ...mlSkills],
          highlights: [],
        }
      } else if (currentExp && companyMatch && !currentExp.org.includes(companyMatch[1])) {
        currentExp.org = companyMatch[1].trim()
      }
    }
  }
  
  if (currentExp) {
    experience.push(currentExp)
  }
  
  // If no experience found, create a basic one
  if (experience.length === 0) {
    experience.push({
      title: leadership ? 'Founder/CTO' : programmingSkills.length > 0 ? 'Software Engineer' : 'Professional',
      org: founderData.startupName || 'Current Company',
      sectors: founderData.sectors || [],
      skills: [...programmingSkills, ...mlSkills],
      highlights: [],
    })
  }

  // Check if student/early
  const isStudent = /student|undergraduate|college|university|dropout|dropping out/i.test(resumeText) ||
    founderData.willingToDropOut ||
    (founderData.age && founderData.age < 23)

  // Detect traction metrics with ENHANCED patterns - check entire resume
  const traction: any = {}
  
  // Revenue patterns - VERY COMPREHENSIVE
  const revenuePatterns = [
    // Direct patterns: "$30K revenue", "$450K ARR", "$5K MRR"
    /(\$?\d+[km]?)\s*(mrr|arr|revenue|monthly\s+recurring|annual\s+recurring|recurring\s+revenue)/i,
    // In context: "Generated $30,000 in revenue", "Revenue: $450K"
    /(?:generated|revenue|recurring|earned|made)\s*[:\-]?\s*(\$?\d+[km]?)/i,
    // With commas: "$30,000", "$450,000"
    /\$(\d{1,3}(?:,\d{3})*(?:k|m)?)/i,
    // In bullet points: "- $30K revenue", "- Revenue: $450K"
    /[-•]\s*(?:revenue|mrr|arr)[:\-]?\s*(\$?\d+[km]?)/i,
  ]
  
  for (const pattern of revenuePatterns) {
    const match = resumeText.match(pattern)
    if (match) {
      const value = parseMetric(match[1] || match[0])
      if (value > 0) {
        traction.revenue = Math.max(traction.revenue || 0, value)
        break
      }
    }
  }
  
  // User patterns - VERY COMPREHENSIVE
  const userPatterns = [
    // Direct: "1,200 users", "5K customers", "350 MAU"
    /(\d{1,3}(?:,\d{3})*(?:k|m)?)\s*(users|customers|mau|dau|active\s+users|subscribers|members|reps)/i,
    // With context: "Achieved 1,200 monthly active users"
    /(?:achieved|reached|grew\s+to|have|serving)\s+(\d{1,3}(?:,\d{3})*(?:k|m)?)\s*(?:monthly\s+active\s+)?(?:users|customers|mau|dau)/i,
    // In metrics sections: "Users: 1,200", "MAU: 5K"
    /(?:users|customers|mau|dau)[:\-]?\s*(\d{1,3}(?:,\d{3})*(?:k|m)?)/i,
    // With "across" or "serving": "450 sales reps across 22 companies"
    /(\d{1,3}(?:,\d{3})*(?:k|m)?)\s*(?:sales\s+)?(?:reps|users|customers)\s+(?:across|serving)/i,
  ]
  
  for (const pattern of userPatterns) {
    const match = resumeText.match(pattern)
    if (match) {
      const value = parseMetric(match[1] || match[0])
      if (value > 0) {
        traction.users = Math.max(traction.users || 0, value)
        break
      }
    }
  }

  // Growth patterns - VERY COMPREHENSIVE
  const growthPatterns = [
    // Direct: "50% MoM", "28% month-over-month", "40% growth"
    /(\d+)%\s*(mom|yoy|growth|monthly|yearly|month-over-month|year-over-year|monthly\s+growth)/i,
    // In context: "Growing 50% month-over-month", "Growth: 40% MoM"
    /(?:growing|growth|grew)[:\-]?\s*(\d+)%/i,
    // With "for X months": "50% MoM for 4 consecutive months"
    /(\d+)%\s*(?:mom|monthly)\s+(?:for|over|consecutive)/i,
  ]
  
  for (const pattern of growthPatterns) {
    const match = resumeText.match(pattern)
    if (match) {
      traction.growth = `${match[1]}% growth`
      break
    }
  }

  // Model Performance Metrics - NEW COMPREHENSIVE DETECTION
  const modelPerformance: any = {}
  
  // Accuracy patterns
  const accuracyPatterns = [
    /(\d+)%\s*accuracy/i,
    /accuracy[:\-]?\s*(\d+)%/i,
    /achieved\s+(\d+)%\s*accuracy/i,
    /(\d+)%\s*accuracy\s+vs\s+(\d+)%\s*baseline/i,
  ]
  
  for (const pattern of accuracyPatterns) {
    const match = resumeText.match(pattern)
    if (match) {
      modelPerformance.accuracy = parseFloat(match[1])
      break
    }
  }
  
  // Latency/Performance patterns
  const latencyPatterns = [
    /(?:improved|reduced|decreased)\s+(?:latency|model\s+latency|build\s+times|inference\s+time)\s+by\s+(\d+)%/i,
    /(?:latency|inference\s+cost|build\s+time)[:\-]?\s*\$?(\d+\.?\d*)/i,
    /(\d+)%\s*(?:faster|improvement|reduction)\s+(?:in\s+)?(?:latency|performance|speed)/i,
  ]
  
  for (const pattern of latencyPatterns) {
    const match = resumeText.match(pattern)
    if (match) {
      modelPerformance.latency = match[1]
      break
    }
  }
  
  // Benchmark patterns
  const benchmarkPatterns = [
    /(\d+)%\s*accuracy\s+vs\s+(\d+)%\s*(?:baseline|previous)/i,
    /(?:benchmark|evaluation|performance)[:\-]?\s*(\d+)%/i,
    /(\d+)x\s*(?:faster|better|improvement)/i,
  ]
  
  for (const pattern of benchmarkPatterns) {
    const match = resumeText.match(pattern)
    if (match) {
      modelPerformance.benchmark = match[0]
      break
    }
  }
  
  // Store model performance in traction if found
  if (Object.keys(modelPerformance).length > 0) {
    traction.modelPerformance = modelPerformance
  }

  // Detect open source
  const openSource: any = {}
  const starsMatch = resumeText.match(/(\d+)\+?\s*(github\s*)?stars/i)
  if (starsMatch) {
    openSource.stars = parseInt(starsMatch[1])
  }
  const reposMatch = resumeText.match(/(\d+)\+?\s*repos/i)
  if (reposMatch) {
    openSource.repos = parseInt(reposMatch[1])
  }

  // Calculate years of experience from date ranges
  const dateRanges = resumeText.match(/(\d{4}|\w+\s+\d{4})\s*(?:-|–|to)\s*(\d{4}|present|current)/gi) || []
  let totalYears = 0
  const seenRanges = new Set<string>()
  
  dateRanges.forEach(exp => {
    const match = exp.match(/(\d{4}|\w+\s+(\d{4}))\s*(?:-|–|to)\s*(\d{4}|present|current)/i)
    if (match && !seenRanges.has(exp)) {
      seenRanges.add(exp)
      const startYear = match[2] ? parseInt(match[2]) : parseInt(match[1])
      const endYear = match[3].toLowerCase() === 'present' || match[3].toLowerCase() === 'current' 
        ? new Date().getFullYear() 
        : parseInt(match[3])
      if (endYear >= startYear) {
        totalYears += (endYear - startYear)
      }
    }
  })

  return {
    basics: {
      name,
      email,
      city,
      country: 'US',
    },
    education: education.length > 0 ? education : [],
    experience,
    skills: {
      programming: programmingSkills,
      ml: mlSkills,
      gtm: [],
    },
    yearsExp: totalYears > 0 ? totalYears : (leadership ? 2 : 1),
    leadership,
    openSource: Object.keys(openSource).length > 0 ? openSource : undefined,
    traction: Object.keys(traction).length > 0 ? traction : undefined,
    isStudent,
  } as any
}


