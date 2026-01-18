/**
 * ACCURATE PATTERN MATCHING - Removing Inaccurate Generalizations
 * 
 * Based on actual web research (Jan 2026), these are the REAL patterns:
 */

// 🚫 REMOVE: Generic patterns that are too broad
// ✅ KEEP: Specific, verified patterns based on actual VC data

export const VERIFIED_VC_PATTERNS = {
  // ACCELERATORS (verified)
  accelerators: {
    'Y Combinator': {
      checkSize: { min: 500, max: 500 }, // $500K total ($125K + $375K SAFE)
      stages: ['Pre-Seed', 'Seed'],
      focus: 'All sectors, global',
      signal: 'Full-time founders, technical/domain background, product-market fit',
    },
    '500 Global': {
      checkSize: { min: 125, max: 150 },
      stages: ['Pre-Seed', 'Seed'],
      focus: 'Global, all sectors',
    },
    'Techstars': {
      stages: ['Pre-Seed', 'Seed'],
      focus: 'All sectors, mentorship-driven',
    },
  },
  
  // STUDENT-FOCUSED VCS (verified)
  studentVCs: {
    'Dorm Room Fund': {
      checkSize: { min: 40, max: 250 }, // $40K-$250K
      stages: ['Pre-Seed', 'Seed'],
      requirement: 'MUST be a current student',
      focus: 'Student founders only, campus traction',
    },
    '1517 Fund': {
      checkSize: { min: 100, max: 1000 }, // $100K-$1M
      stages: ['Pre-Seed', 'Seed'],
      focus: 'Dropouts, self-taught, unconventional paths, deep tech',
      notable: 'Vitalik Buterin, Dylan Field, Ritesh Agarwal',
    },
    'Neo': {
      stages: ['Pre-Seed', 'Seed'],
      focus: 'Student and young founders',
    },
  },
  
  // ELITE TIER VCs (verified)
  eliteTier: {
    'Sequoia Capital': {
      checkSize: { min: 500, max: 15000 }, // $500K-$1M seed, $5M-$15M Series A
      stages: ['Pre-Seed', 'Seed', 'Series A', 'Series B', 'Growth'],
      focus: 'AI/ML, security, developer tools, infrastructure',
      program: 'Arc program for pre-seed',
    },
    'Andreessen Horowitz': {
      checkSize: { min: 3000, max: 20000 }, // $3M-$5M seed, $10M-$20M Series A
      stages: ['Seed', 'Series A', 'Series B', 'Growth'],
      focus: 'AI, crypto, infrastructure, defense/security, bio/health',
      funds: '$15B+ across multiple verticals',
    },
    'Benchmark': {
      stages: ['Seed', 'Series A', 'Series B'],
      focus: 'Elite tier, highly selective',
    },
    'Accel': {
      checkSize: { min: 1000, max: 50000 },
      stages: ['Seed', 'Series A', 'Series B'],
      focus: 'Enterprise, consumer, fintech, marketplaces',
    },
  },
}

// 🚫 REMOVE THESE INACCURATE PATTERNS:
export const INACCURATE_PATTERNS_TO_REMOVE = [
  // ❌ "DoorDash example" - too specific, not a pattern
  // ❌ "YC and Berkeley thing" - vague, not verified
  // ❌ "Stanford student standard VC" - too broad, not all Stanford students get VC
  // ❌ Generic "student founder = automatic match" - ONLY for student-focused VCs
  // ❌ "ex-FAANG = automatic elite VC" - needs more context (role, impact, etc.)
  // ❌ "AI startup = AI VC" - too broad, need specific AI type
]

// ✅ ACCURATE MATCHING RULES:
export const ACCURATE_MATCHING_RULES = {
  studentFounders: {
    // ONLY match with student-focused VCs if:
    requirement: 'Must be CURRENT STUDENT (not graduated, not just went to school)',
    matches: ['Dorm Room Fund', 'Neo', 'some accelerators'],
    boost: 15, // points
  },
  
  dropoutFounders: {
    // ONLY match with dropout-focused VCs
    requirement: 'Willing to drop out OR already dropped out',
    matches: ['1517 Fund', 'Thiel Fellowship'],
    boost: 20, // points
  },
  
  eliteUniversity: {
    // Elite university is a SIGNAL, not a guarantee
    universities: ['Stanford', 'MIT', 'Berkeley', 'Harvard', 'Yale', 'Princeton'],
    boost: 5, // small boost, not automatic match
    reason: 'Elite education is a credibility signal, not sole factor',
  },
  
  ycAlumni: {
    // YC alumni get follow-on from top VCs
    requirement: 'Verified YC alumni (batch mention, portfolio page, etc.)',
    matches: ['Sequoia', 'a16z', 'Lightspeed', 'Index', 'many top-tier VCs'],
    boost: 12,
  },
  
  techFounders: {
    // Technical founders match with tech-focused VCs
    signals: ['GitHub >100 stars', 'FAANG experience', 'Technical role at unicorn'],
    matches: ['DevTools VCs', 'AI VCs', 'Infrastructure VCs'],
    boost: 8,
  },
}
