import { logger } from "./logger"
import { getLlmClient, getModelName } from "./openrouter"

// Get AI client — Ollama or OpenRouter first (same as VC workers), then direct OpenAI
export function getAIClient() {
  const llm = getLlmClient()
  if (llm) return llm

  const openaiKey = process.env.OPENAI_API_KEY
  if (!openaiKey) {
    throw new Error(
      'No AI API key configured. Set OLLAMA_BASE_URL (local), OPENROUTER_API_KEY, or OPENAI_API_KEY.',
    )
  }

  const OpenAI = require("openai").default
  return new OpenAI({
    apiKey: openaiKey,
  })
}

export interface ResumeAnalysisResult {
  skills: string[]
  experiences: string[]
  keywords: string[]
  gaps: string[]
  suggestions: string[]
  compatibilityScore: number
  topSectors: string[]
}

// Enhanced structured features
export interface ResumeFeatures {
  basics: {
    name?: string
    email?: string
    city?: string
    country?: string
    linkedIn?: string
    github?: string
  }
  education: Array<{
    school: string
    degree?: string
    field?: string
    endYear?: number
  }>
  experience: Array<{
    title: string
    org: string
    start?: string
    end?: string
    sectors?: string[]
    skills?: string[]
    highlights?: Array<{
      metric: string
      value: number
      unit: string
    }>
  }>
  projects?: Array<{
    name: string
    sectors?: string[]
    skills?: string[]
    description?: string
  }>
  skills: {
    programming?: string[]
    ml?: string[]
    gtm?: string[]
    domain?: string[]
  }
  yearsExp?: number
  leadership?: boolean
  openSource?: {
    stars?: number
    repos?: number
  }
  traction?: {
    revenue?: number
    users?: number
    growth?: string
  }
}

export async function analyzeResume(
  resumeText: string,
  targetStage: string,
  targetSectors: string[]
): Promise<ResumeAnalysisResult> {
  const prompt = `You are a WORLD-CLASS VC analyst with 20+ years at Sequoia, a16z, YC, Benchmark, Index, and Lightspeed. You've personally evaluated 15,000+ founders and have pattern-matched 50+ unicorns.

YOUR SUPERPOWERS:
✓ Instant pattern recognition from 1000+ unicorn founders (Stripe, Airbnb, Coinbase, etc.)
✓ Deep knowledge of 200+ VC firms and their exact investment criteria
✓ Can spot "hidden gem" founders that others miss (early Uber, Dropbox signals)
✓ Brutally honest feedback that turns 6/10 founders into 9/10 fundable profiles
✓ Understanding of student founders (Zuckerberg, Gates), technical founders (Elon), and non-technical founders (Chesky)

CRITICAL CONTEXT - YOU HAVE ACCESS TO 212+ VCS INCLUDING:
- Elite Tier: Sequoia, a16z, Benchmark, Accel, Greylock, Index, Lightspeed, Founders Fund
- Accelerators: YC, Techstars, 500 Global, Entrepreneur First, Antler
- Student-Focused: Dorm Room Fund, 1517 Fund, Neo, Thiel Fellowship candidates
- AI/ML Specialists: AI Ventures, DevTools Ventures, Amplify Partners, Boldstart
- Enterprise/SaaS: B2B Seed, Enterprise First, Costanoa, Battery Ventures
- Fintech: QED, Fintech Collective, BankTech Ventures
- Climate/Deep Tech: Lux Capital, Khosla, Climate VC, Green Seed
- Consumer: Forerunner, M13, Consumer Lab, Slow Ventures
- International: GGV (US-Asia), Accel India, Atomico (Europe), Seedcamp (Europe)

FOUNDER PROFILE TO ANALYZE:
Target Stage: ${targetStage}
Target Sectors: ${targetSectors.join(", ")}

RESUME/PROFILE:
${resumeText}

PROVIDE ULTRA-DETAILED, EVIDENCE-BASED ANALYSIS (JSON format):

1. **skills**: Array of VC-RELEVANT skills (evidence-based, not aspirational)
   TECHNICAL FOUNDERS:
   - Specific languages/frameworks (not "knows Python" → "Built production ML pipelines in PyTorch")
   - Open source contributions (stars, commits, repos)
   - System design/scale experience
   
   NON-TECHNICAL FOUNDERS:
   - Domain expertise with proof (not "healthcare experience" → "3 years at McKinsey Healthcare")
   - GTM/Sales skills with metrics ("Closed $2M in deals")
   - Operational excellence ("Scaled team 5→50")
   
   STUDENT FOUNDERS:
   - Hustle signals ("Self-taught developer", "Built while in school")
   - Rapid learning ("Shipped 3 products in 6 months")
   - Campus traction ("200 students using product")

2. **experiences**: STANDOUT achievements that VCs instantly recognize
   - FAANG/Top Tier: "2 years at Google Brain", "Stripe engineer #50"
   - Unicorn Experience: "Early employee at Airbnb/Uber/Stripe"
   - Founder Track Record: "Prev startup: $500K ARR, acquired"
   - Elite Education: "Stanford CS", "MIT dropout"
   - Quantified Impact: "$10M revenue generated", "1M+ users", "500% growth"
   - Recognition: "Forbes 30U30", "YC alumni", "Thiel Fellow"

3. **keywords**: EXACT phrases VCs scan for (what triggers partner meetings)
   - "ex-[FAANG company] engineer"
   - "[Elite University] grad/dropout"
   - "$XXK MRR/ARR" (any revenue is gold)
   - "XXX+ GitHub stars" (open source cred)
   - "XX% MoM growth" (traction velocity)
   - "Raised from [Top VC]" (social proof)
   - "Built scalable systems for XXM users"
   - "Domain expert in [specific field]"

4. **gaps**: CRITICAL missing pieces preventing funding (be ruthlessly specific)
   PRE-SEED/SEED GAPS:
   - Traction: "Need ANY metric: 100 users, $1K revenue, 50 GitHub stars"
   - Team: "Solo founder in AI = red flag. Need technical co-founder OR show you can code"
   - Proof: "No demo/GitHub = vaporware. Ship something tangible"
   
   SERIES A GAPS:
   - Scale: "Need $50K+ MRR or 10K+ MAU minimum"
   - Retention: "Need D7/D30 retention data"
   - Unit Economics: "Need to show CAC < LTV"
   
   FOUNDER-SPECIFIC:
   - "Age 19, no degree = pitch to 1517 Fund, not a16z"
   - "Non-technical in AI = need ML co-founder immediately"
   - "No prior startup = go YC/Techstars first, not Series A VCs"

5. **suggestions**: TACTICAL, HIGH-ROI improvements (not generic advice)
   QUICK WINS (1-2 weeks):
   - "Add traction metric to resume: 'Built X, used by Y users'"
   - "Quantify impact: '50% cost reduction' not 'improved efficiency'"
   - "Add GitHub link if >50 stars OR impressive commits"
   
   MEDIUM-TERM (1-3 months):
   - "Get to $1K MRR before pitching Seed VCs (current: $0)"
   - "Ship open source tool in your domain for social proof"
   - "Get into YC/Techstars to de-risk for Series A VCs"
   
   STRATEGIC (3-6 months):
   - "Pivot to B2B SaaS from consumer (better VC fit)"
   - "Add technical co-founder OR learn to code (critical for AI)"
   - "Get LOIs from 3 enterprise customers before Series A"

6. **compatibilityScore**: 0-100 EVIDENCE-BASED VC readiness (calibrated to 200+ VC standards)
   95-100: "Elite tier ready (Sequoia/Benchmark would take meeting)"
   85-94: "Top VC ready (a16z/Greylock strong fit)"
   75-84: "Seed VC ready (Multiple term sheets likely)"
   65-74: "Micro-VC/Accelerator ready (YC/Techstars strong candidate)"
   50-64: "Student VC ready (Dorm Room Fund/1517 Fund fit)"
   30-49: "Pre-funding (Build more, then fundraise)"
   0-29: "Too early (Focus on product, not fundraising)"
   
   SCORING FACTORS:
   - Traction (+30): Revenue/users/growth
   - Team (+25): FAANG/unicorn experience, technical+business
   - Market (+20): Large TAM, growing sector
   - Differentiation (+15): Unique insight/unfair advantage
   - Execution (+10): Shipped products, hit milestones

7. **topSectors**: REALISTIC sector matches (evidence-based, not wishful)
   - Match background to sector: "2 years in healthcare → Healthcare/Medtech"
   - Tech stack signals sector: "PyTorch/LLMs → AI/ML, not generic SaaS"
   - Customer type matters: "Selling to enterprises → B2B SaaS, not consumer"
   
   BE HONEST ABOUT MISMATCHES:
   - "Profile says 'AI startup' but no ML experience = mismatch, consider SaaS"
   - "Wants Fintech but zero finance background = uphill battle"
   - "Student founder → best fit: EdTech, Consumer, not Enterprise"

CRITICAL INSTRUCTIONS FOR WORLD-CLASS ANALYSIS:
✓ EVIDENCE OVER CLAIMS: "Led team of 50" needs proof. "Scaled from 5→50, 10x revenue" is evidence.
✓ PATTERN MATCHING: Compare to successful founders. Does this remind you of early Stripe/Airbnb/Uber?
✓ RED FLAGS: Call out deal-breakers immediately ("Solo technical founder in consumer = 95% fail rate")
✓ HIDDEN GEMS: Spot unique advantages others miss ("Stanford dropout" = Thiel Fellow candidate)
✓ SECTOR EXPERTISE: Know which VCs fund what:
  - Student founders → Dorm Room Fund, 1517, Neo
  - Technical/DevTools → Boldstart, Amplify, Root Ventures
  - AI/ML depth → AI Ventures, Lux, Neural Capital
  - Consumer with traction → Forerunner, M13, Consumer Lab
  - Enterprise → Costanoa, Battery, Enterprise First
  - International → GGV (Asia), Atomico (Europe), Accel India
✓ CALIBRATION: Your score determines VC tier they can approach:
  - 90+: Can email Sequoia/Benchmark directly
  - 80-89: Strong for a16z/Greylock/Lightspeed
  - 70-79: Perfect for seed VCs (Uncork, Homebrew, Initialized)
  - 60-69: Accelerators (YC, Techstars) then VCs
  - 50-59: Student VCs, then build more
  - <50: Too early, focus on product

THE ULTIMATE QUESTION: "If this founder walked into Sequoia tomorrow, would they get a term sheet? If not, WHY and WHAT exactly needs to change?"

Return ONLY valid JSON. Be brutally honest but constructive - founders need truth to win.`

  try {
    const startTime = Date.now()
    
    const client = getAIClient()
    const model = getModelName('gpt-4o')
    
    const completion = await client.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: `Elite VC analyst (95% hit rate). Trained on YC/Sequoia/a16z portfolios. Pattern-match 200+ VCs. Be brutally honest. Return ONLY valid JSON.`,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.4,
      max_tokens: 4000,
      response_format: { type: "json_object" },
    })

    const result = JSON.parse(completion.choices[0].message.content || "{}")
    
    return {
      skills: result.skills || [],
      experiences: result.experiences || [],
      keywords: result.keywords || [],
      gaps: result.gaps || [],
      suggestions: result.suggestions || [],
      compatibilityScore: result.compatibilityScore || 50,
      topSectors: result.topSectors || targetSectors,
    }
  } catch (error: any) {
    logger.error("AI", "Resume analysis failed:", error?.message || error)
    // Return fallback analysis
    return {
      skills: ["Leadership", "Product Management", "Fundraising"],
      experiences: ["Startup experience"],
      keywords: targetSectors,
      gaps: ["Consider adding specific metrics", "Highlight technical skills"],
      suggestions: [
        "Quantify your achievements with metrics",
        "Emphasize domain expertise in target sector",
        "Add relevant network connections",
      ],
      compatibilityScore: 65,
      topSectors: targetSectors,
    }
  }
}

// Enhanced: Extract structured features from resume with better accuracy
export async function extractResumeFeatures(
  resumeText: string,
  referenceResume?: string
): Promise<ResumeFeatures> {
  // Build enhanced prompt with reference example if available
  let referenceContext = ''
  if (referenceResume) {
    referenceContext = `

REFERENCE RESUME EXAMPLE (for pattern recognition):
This is an example of a well-structured founder resume. Use similar extraction patterns:

${referenceResume.substring(0, 2000)}...

Key patterns to recognize:
- Founder/CEO roles with startup names (e.g., "Founder & CEO - AI Study Platform")
- Technical skills (programming languages, frameworks, tools)
- Metrics (users, revenue, growth rates, GitHub stars, MRR, ARR)
- Education (university, degree, graduation year)
- Experience with dates and achievements
- Projects with descriptions and outcomes
- Traction metrics (MRR, ARR, users, growth %, retention)
- Open source contributions (GitHub stars, repos, contributors)
- Section headers (=== CURRENT VENTURE ===, === EXPERIENCE ===, etc.)
- Date formats (Jan 2024 - Present, 2023-2024, MM/YYYY)
`
  }

  // ULTRA-ENHANCED prompt with deep VC knowledge and 212+ VC awareness
  const extractionPrompt = `You are a MASTER resume parser with pattern recognition trained on 15,000+ founder profiles from YC, Sequoia, a16z, and 200+ other top VCs.

YOUR ELITE TRAINING:
✓ Analyzed every YC founder resume (Airbnb, Stripe, Coinbase, DoorDash)
✓ Pattern-matched Thiel Fellows (Vitalik Buterin, Dylan Field of Figma)
✓ Studied 1517 Fund profiles (college dropouts building deep tech)
✓ Expert at technical founder signals (GitHub, open source, FAANG experience)
✓ Master of traction extraction ($XXK MRR, XX% growth, XXX users)
✓ Sector-specific pattern recognition:
  - Student founders: Dorm Room Fund, Neo candidates (age, hustle, campus traction)
  - Technical founders: DevTools VCs want (GitHub stars, open source, engineering roles)
  - AI/ML founders: Neural Capital, Lux types (research, ML experience, unique models)
  - Consumer founders: Forerunner, M13 profiles (brand, community, retention)
  - Enterprise founders: Battery, Costanoa types (B2B sales, enterprise logos)

WHAT MAKES THIS CRITICAL:
You're not just extracting data - you're identifying FUNDABILITY SIGNALS for 212+ VCs:
- "Stanford dropout + technical + traction" = Thiel Fellow / 1517 Fund
- "Ex-FAANG + open source" = Boldstart, Amplify, Root Ventures  
- "Domain expert + B2B sales" = Enterprise First, Costanoa
- "$10K MRR" = instant credibility for seed VCs
- "500 GitHub stars" = DevTools VC attention
- "Age 20 + building" = student VC interest

CRITICAL EXTRACTION RULES:
${referenceContext}

Resume Text:
${resumeText}

Extract the following with SURGEON-LEVEL PRECISION (VCs depend on this accuracy):

1. **basics**: {name, email, city, country, linkedIn, github}
   - Only include if explicitly stated
   - GitHub is CRITICAL for technical founders (DevTools VCs look for this)

2. **education**: Array of {school, degree, field, endYear}
   VCs CARE ABOUT:
   - Elite schools: Stanford, MIT, Harvard, Berkeley, CMU (instant credibility)
   - Dropouts with traction: "Stanford dropout" = Thiel Fellow signal
   - International: IIT (India), Tsinghua (China), Oxford/Cambridge = global VC interest
   - Age + school: "Sophomore at Stanford" = student VC target
   - High school: "High school" = 1517 Fund, young founder VCs

3. **experience**: Array of {title, org, start, end, sectors[], skills[], highlights[]}
   EXTRACT THESE FUNDABILITY SIGNALS:
   - FAANG roles: "2 years at Google" = technical credibility
   - Unicorn experience: "Early at Stripe/Airbnb" = elite
   - Founder roles: "Founder & CEO" = repeat founder (VCs love this)
   - Leadership: "Led team of 50" = operational experience
   - Quantified impact: "$10M revenue", "1M users", "500% growth"
   - Technical depth: "Built scalable systems", "ML infrastructure"
   
4. **projects**: Array of {name, sectors[], skills[], description}
   - Open source projects: Extract GitHub stars, forks, contributors
   - Side projects with traction: "500 users", "$1K MRR"
   - Technical complexity: "Built ML model", "Distributed system"

5. **skills**: {programming[], ml[], gtm[], domain[]}
   CATEGORIZE INTELLIGENTLY FOR VC MATCHING:
   - programming: Python, JavaScript, Rust, Go, etc. (for DevTools VCs)
   - ml: PyTorch, TensorFlow, LLMs, fine-tuning (for AI VCs)
   - gtm: Sales, marketing, growth hacking (for consumer/enterprise VCs)
   - domain: Healthcare, fintech, climate (for sector-specific VCs)

6. **yearsExp**: Calculate from dates (2020-Present = ~4 years)
   - <1 year = student/early stage
   - 1-3 years = junior
   - 3-7 years = mid
   - 7+ years = senior (enterprise VCs love this)

7. **leadership**: boolean
   TRUE IF: founder, ceo, cto, manager, director, lead, head, vp, team lead
   - This is CRITICAL for VCs evaluating founder potential

8. **openSource**: {stars?, repos?}
   - 100+ stars = strong signal for DevTools VCs
   - 500+ stars = elite open source (Boldstart, Amplify immediate interest)
   - Active maintainer = community building skills
9. **traction**: {revenue?, users?, growth?}
   THIS IS THE #1 THING VCs LOOK FOR - EXTRACT WITH EXTREME CARE:
   
   REVENUE SIGNALS (extract ANY mention):
   - "$10K MRR", "$100K ARR", "$1M revenue"
   - "Generating $X" or "Revenue of $X"
   
   USER SIGNALS:
   - "1,000 MAU", "10,000+ users", "500 signups"
   - Extract ANY user count mentioned
   
   GROWTH SIGNALS:
   - "50% MoM", "10% WoW", "3x YoY", "doubled in 6 months"
   
   OTHER TRACTION:
   - "500 GitHub stars", "10 enterprise LOIs"
   - "Featured on Product Hunt #1"

Be SURGICALLY precise - only extract what's EXPLICITLY stated. If not present, use null or empty array.

IMPORTANT EXTRACTION GUIDELINES (learned from sample resumes):
1. **Founder Roles**: Look for "Founder & CEO", "Co-Founder", "Founder & CTO" patterns with startup/company names
2. **Traction Metrics**: Extract MRR, ARR, users (MAU/DAU), growth rates, GitHub stars, downloads, contributors
3. **Date Formats**: Recognize various formats:
   - "Jan 2024 - Present" or "January 2024 - Present"
   - "2023-2024" or "2023 - 2024"
   - "MM/YYYY" format
   - "Summer 2023" or "Fall 2022"
4. **Section Headers**: Recognize markdown-style headers like "=== CURRENT VENTURE ===" or "--- EXPERIENCE ---"
5. **Company Names**: Extract company names even if abbreviated (e.g., "Google", "Vercel", "SalesLoft")
6. **Technical Stack**: Extract from "Technical stack:" lines or skills sections
7. **Metrics**: Look for patterns like "$450K ARR", "$30,000 revenue", "1,200 MAU", "50% MoM", "350 GitHub stars", "92% accuracy", "35% latency improvement"
8. **Model Performance**: Extract accuracy percentages, latency improvements, benchmark comparisons (e.g., "92% accuracy vs 78% baseline", "improved latency by 35%")
9. **Revenue Formats**: Recognize "$30,000", "$30K", "$450K ARR", "Generated $30K in revenue", "Revenue: $450K"
10. **User Metrics**: Recognize "1,200 users", "5K customers", "450 sales reps", "13,000+ members", "MAU: 1,200"
8. **Education**: Extract university name, degree type (BS, BA, MS, MBA, PhD), field, and end year
9. **Open Source**: Extract GitHub stars, repo counts, contributor counts
10. **Student Status**: Detect if currently enrolled, dropout, or recent graduate`

  const schema = {
    type: "object",
    properties: {
      basics: {
        type: "object",
        properties: {
          name: { type: "string" },
          email: { type: "string" },
          city: { type: "string" },
          country: { type: "string" },
          linkedIn: { type: "string" },
          github: { type: "string" },
        },
      },
      education: {
        type: "array",
        items: {
          type: "object",
          properties: {
            school: { type: "string" },
            degree: { type: "string" },
            field: { type: "string" },
            endYear: { type: "number" },
          },
          required: ["school"],
        },
      },
      experience: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            org: { type: "string" },
            start: { type: "string" },
            end: { type: "string" },
            sectors: { type: "array", items: { type: "string" } },
            skills: { type: "array", items: { type: "string" } },
            highlights: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  metric: { type: "string" },
                  value: { type: "number" },
                  unit: { type: "string" },
                },
              },
            },
          },
          required: ["title", "org"],
        },
      },
      skills: {
        type: "object",
        properties: {
          programming: { type: "array", items: { type: "string" } },
          ml: { type: "array", items: { type: "string" } },
          gtm: { type: "array", items: { type: "string" } },
          domain: { type: "array", items: { type: "string" } },
        },
      },
      yearsExp: { type: "number" },
      leadership: { type: "boolean" },
      openSource: {
        type: "object",
        properties: {
          stars: { type: "number" },
          repos: { type: "number" },
        },
      },
      traction: {
        type: "object",
        properties: {
          revenue: { type: "number" },
          users: { type: "number" },
          growth: { type: "string" },
        },
      },
    },
    required: ["basics", "experience", "skills"],
  }

  const prompt = extractionPrompt + `

Return valid JSON matching this schema. Be extremely precise:
- Only extract information explicitly stated in the resume
- Do not infer or assume anything not present
- Extract metrics with exact numbers (revenue, users, growth %)
- Identify sectors/industries from job titles and descriptions
- List technical skills explicitly mentioned
- Calculate total years of experience from date ranges
- Note leadership roles (founder, ceo, cto, director, lead, manager, vp)
- Find open-source contributions (GitHub stars, repos) only if mentioned
- Extract traction metrics only if explicitly stated (MRR, ARR, DAU, MAU, users, growth rates)
- Recognize various resume formats (chronological, functional, hybrid)
- Handle different date formats (MM/YYYY, YYYY-MM, Month YYYY, etc.)
- Extract company names even if abbreviated or formatted differently
- Identify startup/venture names in founder roles
- Recognize student status (current student, dropout, recent graduate)
- Extract technical stack from project descriptions
${referenceResume ? '- Use similar extraction patterns as shown in the reference resume example' : ''}

Schema: ${JSON.stringify(schema)}`

  try {
    const startTime = Date.now()
    
    const client = getAIClient()
    const model = getModelName('gpt-4o')
    
    const completion = await client.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: `Elite resume parser. Extract ONLY explicit data. Recognize metrics ($50K MRR, 1200 MAU, 350 stars). Parse dates (MM/YYYY, Jan 2024). Identify VC signals. Be precise: $50K = 50000. Return null if not stated.`,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.05,
      max_tokens: 4000,
      response_format: { type: "json_object" },
    })

    const duration = Date.now() - startTime
    const tokens = completion.usage?.total_tokens
    logger.ai('EXTRACT_FEATURES', 'gpt-4o', tokens, duration)
    
    const result = JSON.parse(completion.choices[0].message.content || "{}")
    return result as ResumeFeatures
  } catch (error: any) {
    logger.error("AI", "Feature extraction failed:", error?.message || error)
    // Return minimal fallback
    return {
      basics: {},
      education: [],
      experience: [],
      skills: {},
    }
  }
}

export async function generateVCCrashCourse(
  investorName: string,
  investorThesis: string,
  investorSectors: string[],
  investorStage: string
): Promise<string> {
  const sectorProofPoints: Record<string, string> = {
    'AI/ML': 'Model performance metrics, proprietary data, evaluation benchmarks, inference costs',
    'Developer Tools': 'GitHub stars, time-to-value, CI/CD integration, community adoption',
    'SaaS': 'ICP clarity, pipeline metrics, sales efficiency, retention rates',
    'Fintech': 'Regulatory strategy, fraud controls, unit economics, compliance',
    'Healthcare': 'Clinical validation, regulatory pathway, KOL involvement, reimbursement',
    'Climate Tech': 'TRL level, pilot sites, unit economics, carbon impact',
    'Consumer': 'Retention cohorts, DAU/MAU, viral loops, creator partnerships',
    'Crypto/Web3': 'On-chain traction, token economics, security audits, compliance',
  }

  const proofPoints = investorSectors
    .map(s => sectorProofPoints[s])
    .filter(Boolean)
    .join('; ')

  const prompt = `Create a highly specific crash course for founders pitching to ${investorName}.

Investor Profile:
- Stage Focus: ${investorStage}
- Sectors: ${investorSectors.join(", ")}
- Thesis: ${investorThesis}
- Proof Points They Value: ${proofPoints || 'Standard VC metrics'}

Provide a structured guide with:

1. **What They Value Most**: 3 specific things this VC prioritizes in founders/startups
2. **Pitch Structure**: Exact flow they prefer (with time allocations)
3. **5 Questions They'll Ask**: Specific questions based on their thesis
4. **Red Flags to Avoid**: 3 things that will kill your pitch
5. **How to Get a Warm Intro**: Specific paths (portfolio founders, events, angels)
6. **Proof Points to Emphasize**: Based on ${investorSectors[0]}, what metrics/evidence to highlight

Be concrete and actionable. Use their actual thesis context.`

  try {
    const startTime = Date.now()
    
    const client = getAIClient()
    const model = getModelName('gpt-4o')
    
    const completion = await client.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: "Expert VC advisor. Know what each investor type looks for. Be specific and actionable.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 4000,
    })

    const duration = Date.now() - startTime
    const tokens = completion.usage?.total_tokens
    logger.ai('VC_CRASH_COURSE', 'gpt-4o', tokens, duration)
    
    return completion.choices[0].message.content || "Crash course unavailable."
  } catch (error: any) {
    logger.error("AI", "VC crash course generation failed:", error?.message || error)
    
    // Enhanced fallback based on sector
    const sectorGuidance = investorSectors[0] ? sectorProofPoints[investorSectors[0]] : 'traction metrics'
    
    return `# Crash Course: Pitching to ${investorName}

## 1. What They Value Most
- **Founder-market fit**: Deep expertise in ${investorSectors[0] || 'your sector'}
- **Traction evidence**: ${sectorGuidance}
- **Execution velocity**: Rapid iteration and learning speed

## 2. Pitch Structure (15-20 minutes)
- **Problem** (2 min): Why now? Market inflection point
- **Solution** (3 min): Your unique insight + demo
- **Traction** (4 min): Key metrics, validation, proof points
- **Market** (3 min): TAM/SAM/SOM + wedge strategy
- **Team** (2 min): Why you? Unfair advantages
- **Ask** (2 min): Round size, use of funds, timeline
- **Q&A** (5 min): Be ready for deep dives

## 3. Five Questions They'll Ask
1. **What's your unfair advantage?** (Why you vs competitors?)
2. **How do you acquire customers?** (GTM motion specifics)
3. **What are your unit economics?** (CAC, LTV, payback)
4. **Why now?** (Market timing and catalysts)
5. **Who else is investing?** (Social proof and lead status)

## 4. Red Flags to Avoid
- ❌ Vague metrics ("growing fast" vs "40% MoM for 6 months")
- ❌ No clear ICP or GTM strategy
- ❌ Unrealistic projections without proof
- ❌ Dismissing competition or saying "no competitors"

## 5. How to Get a Warm Intro
- **Portfolio founders**: Find ${investorName}'s portfolio companies in ${investorSectors[0]}
- **Industry events**: ${investorStage} focused conferences and demo days
- **Angel networks**: Connect with angels who co-invest with this fund
- **LinkedIn**: Find mutual connections via portfolio companies

## 6. Proof Points to Emphasize
For ${investorSectors[0] || 'your sector'}:
${sectorGuidance}

**Remember**: ${investorName} invests at ${investorStage} stage, so show proof appropriate for that stage.`
  }
}

// Extract features from pitch deck
export interface PitchDeckFeatures {
  slideCount?: number
  strengths: string[]
  weaknesses: string[]
  improvements: string[]
  sectorFit: Record<string, number>
  tractionMetrics: {
    revenue?: number
    users?: number
    growth?: string
    mrr?: number
    arr?: number
  }
  marketAnalysis: {
    tam?: string
    sam?: string
    som?: string
    marketSize?: string
  }
  teamAnalysis: {
    strengths?: string[]
    gaps?: string[]
  }
  productFit: {
    pmfSignals?: string[]
    differentiators?: string[]
  }
  // overallScore is no longer produced here — call runScoringPipeline() for numeric scores.
}

export async function extractPitchDeckFeatures(
  deckText: string,
  founder: any
): Promise<PitchDeckFeatures> {
  const prompt = `You are an expert VC analyst. Analyze this pitch deck text and provide a comprehensive analysis.

Pitch Deck Content:
${deckText.substring(0, 15000)}

Founder Context:
- Stage: ${founder.stage}
- Sectors: ${JSON.parse(founder.sectors || '[]').join(', ')}
- Funding Need: $${founder.fundingNeed}K

Provide a detailed analysis in JSON format with:
1. slideCount: Estimated number of slides (if detectable)
2. strengths: Array of 3-5 key strengths of the pitch (e.g., "Clear problem statement", "Strong traction metrics", "Experienced team")
3. weaknesses: Array of 3-5 weaknesses or gaps (e.g., "Missing unit economics", "Unclear GTM strategy", "Weak competitive analysis")
4. improvements: Array of 5-7 actionable suggestions to improve the pitch (be specific and actionable)
5. sectorFit: Object mapping sector names to fit scores (0-100) based on how well the pitch aligns with each sector
6. tractionMetrics: Object with extracted metrics:
   - revenue: Monthly or annual revenue if mentioned
   - users: User count if mentioned
   - growth: Growth rate (e.g., "40% MoM")
   - mrr: Monthly recurring revenue if mentioned
   - arr: Annual recurring revenue if mentioned
7. marketAnalysis: Object with:
   - tam: Total Addressable Market if mentioned
   - sam: Serviceable Addressable Market if mentioned
   - som: Serviceable Obtainable Market if mentioned
   - marketSize: General market size description
8. teamAnalysis: Object with:
   - strengths: Array of team strengths
   - gaps: Array of team gaps or missing roles
9. productFit: Object with:
   - pmfSignals: Array of product-market fit signals mentioned
   - differentiators: Array of unique differentiators

Be thorough and specific. Extract actual numbers and metrics when present. Format as valid JSON.`

  try {
    const startTime = Date.now()
    
    const client = getAIClient()
    const model = getModelName('gpt-4o')
    
    const completion = await client.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: "Expert VC analyst. Evaluate pitch decks. Return valid JSON. Extract specific metrics and concrete details.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.2,
      max_tokens: 4000,
      response_format: { type: "json_object" },
    })

    const content = completion.choices[0].message.content
    if (!content) {
      throw new Error("No response from AI")
    }

    const parsed = JSON.parse(content)
    
    // Ensure all required fields exist with defaults
    return {
      slideCount: parsed.slideCount || null,
      strengths: parsed.strengths || [],
      weaknesses: parsed.weaknesses || [],
      improvements: parsed.improvements || [],
      sectorFit: parsed.sectorFit || {},
      tractionMetrics: parsed.tractionMetrics || {},
      marketAnalysis: parsed.marketAnalysis || {},
      teamAnalysis: parsed.teamAnalysis || {},
      productFit: parsed.productFit || {},
    }
  } catch (error: any) {
    logger.error("AI", "Pitch deck analysis failed:", error?.message || error)
    
    // Fallback analysis
    return {
      strengths: ['Pitch deck uploaded successfully'],
      weaknesses: ['Unable to fully analyze - please ensure text is readable'],
      improvements: ['Add more specific metrics', 'Clarify your value proposition', 'Include traction data'],
      sectorFit: {},
      tractionMetrics: {},
      marketAnalysis: {},
      teamAnalysis: {},
      productFit: {},
    }
  }
}

// Analyze video pitch transcript - FIXED JSON PARSING 2026-01-17
export interface VideoPitchFeedback {
  category: 'presentation' | 'content' | 'credibility' | 'delivery'
  point: string
  details?: string
  impact: 'high' | 'medium' | 'low'
}

export interface VideoPitchFeatures {
  strengths: string[]
  weaknesses: string[]
  improvements: string[]
  // 🆕 Detailed positive/negative feedback with categories
  positiveFeedback: VideoPitchFeedback[]
  negativeFeedback: VideoPitchFeedback[]
  sectorFit: Record<string, number>
  tractionMetrics: {
    revenue?: number
    users?: number
    growth?: string
    mrr?: number
    arr?: number
  }
  marketAnalysis: {
    tam?: string
    sam?: string
    som?: string
    marketSize?: string
  }
  teamAnalysis: {
    strengths?: string[]
    gaps?: string[]
  }
  productFit: {
    pmfSignals?: string[]
    differentiators?: string[]
  }
  // Scores are no longer produced by this function.
  // Call runScoringPipeline() after analyzeVideoPitch() to get numeric scores.
}

// VIDEO_PITCH_FIX_v2 - Force rebuild with robust JSON parsing
export async function analyzeVideoPitch(
  transcript: string,
  founder: any
): Promise<VideoPitchFeatures> {
  // Safe parsing helper for arrays that might be JSON strings, arrays, or comma-separated strings
  const safeParseArray = (value: any): string[] => {
    if (!value) return []
    if (Array.isArray(value)) return value
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value)
        return Array.isArray(parsed) ? parsed : [value]
      } catch {
        // Not valid JSON, treat as comma-separated
        return value.split(',').map((s: string) => s.trim()).filter(Boolean)
      }
    }
    return []
  }
  
  const founderSectors = safeParseArray(founder.sectors)
  const founderValueAddNeeds = safeParseArray(founder.valueAddNeeds)
  
  const prompt = `You are an expert VC analyst specializing in evaluating video pitches. Analyze this video pitch transcript and provide comprehensive feedback.

Video Pitch Transcript:
${transcript.substring(0, 20000)}

Founder Context (COMPLETE PROFILE):
- Stage: ${founder.stage}
- Sectors: ${founderSectors.join(', ')}
- Funding Need: $${founder.fundingNeed}K
- Location: ${founder.location}
- Education: ${founder.education || 'Not specified'}
- University: ${founder.universityAffiliation || 'Not specified'}
- Age: ${founder.age || 'Not specified'}
- Is Student: ${founder.isStudent ? 'Yes' : 'No'}
- Tech Background: ${founder.techBackground ? 'Yes' : 'No'}
- Traction: Revenue: ${founder.revenue || 'None'}, Users: ${founder.users || 'None'}, Growth: ${founder.growthRate || 'None'}
- Team Size: ${founder.teamSize || 'Not specified'}
- Previous Funding: ${founder.prevFunding || 'None'}
- Value-Add Needs: ${founderValueAddNeeds.join(', ') || 'None'}
- Bio: ${founder.bio?.substring(0, 300) || 'Not provided'}

Provide a detailed analysis in JSON format with:
1. strengths: Array of 3-5 key strengths of the pitch (e.g., "Clear value proposition", "Strong presentation skills", "Compelling traction story", "Confident delivery")
2. weaknesses: Array of 3-5 weaknesses or gaps (e.g., "Unclear business model", "Missing key metrics", "Weak competitive differentiation", "Rambling delivery")
3. improvements: Array of 5-7 actionable suggestions to improve the pitch (be specific and actionable, focus on both content and delivery)
4. positiveFeedback: Array of 4-6 detailed positive feedback items, each with:
   - category: One of "presentation" (delivery, speaking), "content" (substance, metrics), "credibility" (team, traction), or "delivery" (pacing, energy)
   - point: The specific positive point (e.g., "Confident and clear delivery")
   - details: Optional explanation of why this is positive
   - impact: "high", "medium", or "low" - how much this helps the pitch
5. negativeFeedback: Array of 4-6 detailed negative feedback items, each with:
   - category: One of "presentation", "content", "credibility", or "delivery"
   - point: The specific area needing improvement (e.g., "Missing revenue metrics")
   - details: Optional explanation of why this is a problem
   - impact: "high", "medium", or "low" - how much this hurts the pitch
6. sectorFit: Object mapping sector names to fit scores (0-100) based on how well the pitch aligns with each sector
7. tractionMetrics: Object with extracted metrics:
   - revenue: Monthly or annual revenue if mentioned
   - users: User count if mentioned
   - growth: Growth rate (e.g., "40% MoM")
   - mrr: Monthly recurring revenue if mentioned
   - arr: Annual recurring revenue if mentioned
8. marketAnalysis: Object with:
   - tam: Total Addressable Market if mentioned
   - sam: Serviceable Addressable Market if mentioned
   - som: Serviceable Obtainable Market if mentioned
   - marketSize: General market size description
9. teamAnalysis: Object with:
   - strengths: Array of team strengths mentioned
   - gaps: Array of team gaps or missing roles
10. productFit: Object with:
   - pmfSignals: Array of product-market fit signals mentioned
   - differentiators: Array of unique differentiators

Format as valid JSON.`

  try {
    const startTime = Date.now()
    
    const client = getAIClient()
    const model = getModelName('gpt-4o')
    
    logger.log(`[AI] 🤖 Using model: ${model} for video pitch analysis`)
    
    const completion = await client.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: "Expert VC analyst who has seen thousands of pitches. Great pitches come in two forms: (1) Personality-driven like Dollar Shave Club (humor + clarity) OR (2) Substance-driven like DoorDash (clear problem + huge market + execution). BOTH deserve high scores. Content quality (problem/solution/market/business model) is the foundation. Personality/memorability is a bonus, not a replacement. Score based on: Would a smart VC take this meeting? You MUST respond with ONLY valid JSON - no markdown, no code blocks. Start with { and end with }.",
        },
        {
          role: "user",
          content: prompt + "\n\n⚠️ CRITICAL: Your response must be ONLY a JSON object. Do NOT include:\n- Markdown code blocks (```json)\n- Any explanatory text before or after the JSON\n- Any comments\nStart with { and end with }. Nothing else.",
        },
      ],
      temperature: 0.2,
      max_tokens: 4000,
      ...(model.includes('gpt') ? { response_format: { type: "json_object" } } : {}),
    })

    const rawContent = completion.choices[0].message.content || "{}"
    logger.log(`[AI] 📄 Raw response: ${rawContent.substring(0, 100)}`)
    
    // Extract JSON - find first { to last }
    let jsonText = rawContent.trim()
    
    // Remove any leading text before first {
    const firstBrace = jsonText.indexOf('{')
    const lastBrace = jsonText.lastIndexOf('}')
    
    // Only parse if we have valid JSON braces
    if (firstBrace < 0 || lastBrace < 0 || lastBrace <= firstBrace) {
      logger.error("AI", `No valid JSON found. Content: ${rawContent.substring(0, 200)}`)
      throw new Error("No JSON in response") // This will be caught below
    }
    
    // Extract ONLY the JSON portion
    jsonText = jsonText.slice(firstBrace, lastBrace + 1)
    logger.log(`[AI] 🔍 Extracted JSON: ${jsonText.substring(0, 100)}`)
    
    // Validate it looks like JSON before parsing
    if (!jsonText.trim().startsWith('{') || !jsonText.trim().endsWith('}')) {
      logger.error("AI", `Extracted text doesn't look like JSON: ${jsonText.substring(0, 200)}`)
      throw new Error("Invalid JSON structure") // This will be caught below
    }
    
    // Parse JSON - if it fails, return fallback
    let result: any
    try {
      result = JSON.parse(jsonText)
    } catch (parseError: any) {
      logger.error("AI", `JSON parse failed: ${parseError.message}`)
      // Return fallback - NEVER throw error
      return {
        strengths: ['Video pitch completed successfully'],
        weaknesses: ['AI analysis unavailable - please try again'],
        improvements: [
          'Speak clearly about your problem and solution',
          'Share specific metrics (revenue, users, growth)',
          'Explain your business model',
          'Highlight your team\'s strengths',
          'Discuss market opportunity'
        ],
        positiveFeedback: [
          { category: 'presentation', point: 'Video pitch submitted', details: 'Your pitch video was received', impact: 'medium' as const }
        ],
        negativeFeedback: [
          { category: 'content', point: 'Analysis unavailable', details: 'Please try again for detailed feedback', impact: 'low' as const }
        ],
        sectorFit: {},
        tractionMetrics: {},
        marketAnalysis: {},
        teamAnalysis: {},
        productFit: {},
      }
    }
    
    return {
      strengths: result.strengths || [],
      weaknesses: result.weaknesses || [],
      improvements: result.improvements || [],
      positiveFeedback: result.positiveFeedback || [],
      negativeFeedback: result.negativeFeedback || [],
      sectorFit: result.sectorFit || {},
      tractionMetrics: result.tractionMetrics || {},
      marketAnalysis: result.marketAnalysis || {},
      teamAnalysis: result.teamAnalysis || {},
      productFit: result.productFit || {},
    }
  } catch (error: any) {
    logger.error("AI", "Video pitch analysis failed:", error?.message || error)
    // ALWAYS return fallback - NEVER throw
    return {
      strengths: ['Video pitch uploaded successfully'],
      weaknesses: ['Unable to analyze at this time - please try again'],
      improvements: [
        'Clearly state the problem you\'re solving',
        'Share traction metrics (revenue, users, growth)',
        'Explain your business model',
        'Highlight your team\'s strengths',
        'Discuss market opportunity'
      ],
      positiveFeedback: [
        { category: 'presentation' as const, point: 'Video pitch uploaded', details: 'Your video was successfully received', impact: 'medium' as const }
      ],
      negativeFeedback: [
        { category: 'content' as const, point: 'Analysis unavailable', details: 'Please try uploading again for detailed feedback', impact: 'low' as const }
      ],
      sectorFit: {},
      tractionMetrics: {},
      marketAnalysis: {},
      teamAnalysis: {},
      productFit: {},
    }
  }
}

