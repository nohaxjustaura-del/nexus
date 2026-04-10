/**
 * ===============================================================================
 * UNIVERSITY PROGRAMS — STATIC DATASET
 * ===============================================================================
 *
 * Curated list of university-affiliated and open accelerator programs.
 * These programs are surfaced in a SEPARATE UI track from the main VC ranking
 * pool. Programs where isOpenAccelerator !== true are filtered out of the
 * mainstream investor candidate pool by filterOutUniversityPrograms().
 *
 * Eligibility rules:
 *   students_only        — current enrolled students only
 *   alumni_included      — current students AND recent/all alumni
 *   university_affiliated — students, alumni, staff, faculty (broadest)
 *
 * university: ""  + aliases: [] signals "all universities" for pan-university
 * programs (Dorm Room Fund, Contrary, etc.).
 *
 * Last reviewed: 2026-03
 */

import type { UniversityProgram } from './types'

export const UNIVERSITY_PROGRAMS: UniversityProgram[] = [
  // ── UC Berkeley ────────────────────────────────────────────────────────────

  {
    id: 'skydeck-berkeley',
    name: 'Berkeley SkyDeck',
    university: 'UC Berkeley',
    aliases: ['UC Berkeley', 'Berkeley', 'Cal', 'University of California Berkeley'],
    eligibility: 'alumni_included',
    type: 'accelerator',
    checkSize: { min: 200, max: 500 },   // $200K–$500K equity investment
    applicationUrl: 'https://skydeck.berkeley.edu/apply',
    deadline: 'rolling',
    description: 'UC Berkeley\'s flagship accelerator providing funding, mentorship, and access to the Cal alumni network for student and alumni founders.',
    stageFocus: ['pre-seed', 'seed'],
    sectorFocus: [],
    isOpenAccelerator: false,
  },

  {
    id: 'free-ventures-berkeley',
    name: 'Free Ventures',
    university: 'UC Berkeley',
    aliases: ['UC Berkeley', 'Berkeley', 'Cal', 'University of California Berkeley'],
    eligibility: 'students_only',
    type: 'accelerator',
    checkSize: { min: null, max: null },
    applicationUrl: 'https://freeventures.org/apply',
    deadline: 'rolling',
    description: 'UC Berkeley\'s student-run pre-seed accelerator offering non-dilutive grants and mentorship to current Cal student founders.',
    stageFocus: ['pre-seed'],
    sectorFocus: [],
    isOpenAccelerator: false,
  },

  {
    id: 'house-fund-berkeley',
    name: 'The House Fund',
    university: 'UC Berkeley',
    aliases: ['UC Berkeley', 'Berkeley', 'Cal', 'University of California Berkeley'],
    eligibility: 'alumni_included',
    type: 'fund',
    checkSize: { min: 250, max: 1000 },
    applicationUrl: 'https://www.housefund.com',
    deadline: 'rolling',
    description: 'Pre-seed and seed fund exclusively backing UC Berkeley founders building ambitious technology companies.',
    stageFocus: ['pre-seed', 'seed'],
    sectorFocus: [],
    isOpenAccelerator: false,
  },

  // ── MIT ────────────────────────────────────────────────────────────────────

  {
    id: 'mit-sandbox',
    name: 'MIT Sandbox',
    university: 'MIT',
    aliases: ['MIT', 'Massachusetts Institute of Technology'],
    eligibility: 'students_only',
    type: 'grant',
    checkSize: { min: null, max: 25 },   // up to $25K non-dilutive
    applicationUrl: 'https://sandbox.mit.edu',
    deadline: 'rolling',
    description: 'MIT\'s non-dilutive innovation fund offering up to $25K in grants plus mentorship to current MIT students exploring entrepreneurial ideas.',
    stageFocus: ['pre-seed'],
    sectorFocus: [],
    isOpenAccelerator: false,
  },

  {
    id: 'mit-delta-v',
    name: 'MIT delta v',
    university: 'MIT',
    aliases: ['MIT', 'Massachusetts Institute of Technology'],
    eligibility: 'students_only',
    type: 'accelerator',
    checkSize: { min: null, max: null },
    applicationUrl: 'https://entrepreneurship.mit.edu/accelerator',
    deadline: 'rolling',
    description: 'MIT\'s summer venture accelerator program for MIT student and recent alumni founders building scalable companies.',
    stageFocus: ['pre-seed', 'seed'],
    sectorFocus: [],
    isOpenAccelerator: false,
  },

  // ── Stanford ───────────────────────────────────────────────────────────────

  {
    id: 'stanford-startx',
    name: 'Stanford StartX',
    university: 'Stanford',
    aliases: ['Stanford', 'Stanford University'],
    eligibility: 'university_affiliated',
    type: 'accelerator',
    checkSize: { min: null, max: null },
    applicationUrl: 'https://startx.com/apply',
    deadline: 'rolling',
    description: 'Non-profit accelerator for Stanford-affiliated founders (students, alumni, faculty, staff) offering mentorship and a network of 3,000+ startups.',
    stageFocus: ['pre-seed', 'seed'],
    sectorFocus: [],
    isOpenAccelerator: false,
  },

  // ── Harvard ────────────────────────────────────────────────────────────────

  {
    id: 'harvard-innovation-labs',
    name: 'Harvard Innovation Labs',
    university: 'Harvard',
    aliases: ['Harvard', 'Harvard University'],
    eligibility: 'alumni_included',
    type: 'accelerator',
    checkSize: { min: null, max: null },
    applicationUrl: 'https://innovationlabs.harvard.edu',
    deadline: 'rolling',
    description: 'Harvard\'s hub for entrepreneurship, providing workspace, programming, and mentorship to Harvard student and alumni founders across all schools.',
    stageFocus: ['pre-seed', 'seed'],
    sectorFocus: [],
    isOpenAccelerator: false,
  },

  // ── Brown University ───────────────────────────────────────────────────────

  {
    id: 'brown-nelson-center',
    name: 'Brown Nelson Center for Entrepreneurship',
    university: 'Brown University',
    aliases: ['Brown', 'Brown University', 'Brown U', 'Nelson Center', 'Brown Nelson'],
    eligibility: 'alumni_included',
    type: 'accelerator',
    checkSize: { min: null, max: null },
    applicationUrl: 'https://entrepreneurship.brown.edu',
    deadline: 'rolling',
    description:
      'Brown\'s entrepreneurship hub (Nelson Center): programs, mentorship, and venture support for Brown students and alumni founders across stages — strong fit for on-campus builders and recent grads.',
    stageFocus: ['pre-seed', 'seed'],
    sectorFocus: [],
    isOpenAccelerator: false,
  },

  {
    id: 'brown-breakthrough-lab',
    name: 'Brown Breakthrough Lab (B-Lab)',
    university: 'Brown University',
    aliases: ['Brown', 'Brown University', 'Brown U', 'B-Lab', 'Breakthrough Lab'],
    eligibility: 'students_only',
    type: 'accelerator',
    checkSize: { min: null, max: null },
    applicationUrl: 'https://entrepreneurship.brown.edu',
    deadline: 'rolling',
    description:
      'Intensive summer venture program for enrolled Brown founders — coaching, community, and runway to validate ideas (including software/media) before raising institutional capital.',
    stageFocus: ['pre-seed'],
    sectorFocus: [],
    isOpenAccelerator: false,
  },

  {
    id: 'brown-social-innovation',
    name: 'Brown Swearer Center Social Innovation Initiative',
    university: 'Brown University',
    aliases: ['Brown', 'Brown University', 'Brown U', 'Swearer Center'],
    eligibility: 'students_only',
    type: 'accelerator',
    checkSize: { min: null, max: null },
    applicationUrl: 'https://swearer.brown.edu',
    deadline: 'rolling',
    description:
      'Social innovation and venture programming for Brown students; relevant when the startup has impact, education, or community angles alongside the core product.',
    stageFocus: ['pre-seed'],
    sectorFocus: [],
    isOpenAccelerator: false,
  },

  // ── CMU ────────────────────────────────────────────────────────────────────

  {
    id: 'cmu-swartz-center',
    name: 'CMU Swartz Center for Entrepreneurship',
    university: 'Carnegie Mellon University',
    aliases: [
      'CMU', 'Carnegie Mellon', 'Carnegie Mellon University',
      'Carnegie-Mellon', 'Carnegie Mellon University (CMU)',
    ],
    eligibility: 'alumni_included',
    type: 'accelerator',
    checkSize: { min: null, max: null },
    applicationUrl: 'https://www.cmu.edu/swartz-center-for-entrepreneurship',
    deadline: 'rolling',
    description: 'CMU\'s entrepreneurship center supporting student and alumni founders with mentorship, prototype funding, and connections to Pittsburgh\'s startup ecosystem.',
    stageFocus: ['pre-seed', 'seed'],
    sectorFocus: [],
    isOpenAccelerator: false,
  },

  // ── Pan-University (student-only programs, all schools accepted) ───────────

  {
    id: 'dorm-room-fund',
    name: 'Dorm Room Fund',
    university: '',
    aliases: [],
    eligibility: 'students_only',
    type: 'fund',
    checkSize: { min: 40, max: 250 },   // $40K–$250K range
    applicationUrl: 'https://dormroomfund.com/apply',
    deadline: 'rolling',
    description: 'First Round Capital\'s student-run venture fund investing $40K–$250K in companies where at least one founder is a current undergraduate or graduate student.',
    stageFocus: ['pre-seed', 'seed'],
    sectorFocus: [],
    isOpenAccelerator: false,
  },

  {
    id: 'contrary-capital',
    name: 'Contrary Capital',
    university: '',
    aliases: [],
    eligibility: 'students_only',
    type: 'fund',
    checkSize: { min: 100, max: 1000 },
    applicationUrl: 'https://contrarycap.com',
    deadline: 'rolling',
    description: 'Venture fund focused exclusively on student and recent-graduate founders at top universities, with a distributed scout network across 200+ campuses.',
    stageFocus: ['pre-seed', 'seed'],
    sectorFocus: [],
    isOpenAccelerator: false,
  },

  {
    id: 'rough-draft-ventures',
    name: 'Rough Draft Ventures',
    university: '',
    aliases: [],
    eligibility: 'students_only',
    type: 'fund',
    checkSize: { min: 25, max: 100 },
    applicationUrl: 'https://roughdraft.vc',
    deadline: 'rolling',
    description: 'General Catalyst\'s student venture fund providing $25K–$100K checks to current undergraduate and graduate student founders across the US.',
    stageFocus: ['pre-seed'],
    sectorFocus: [],
    isOpenAccelerator: false,
  },

  {
    id: 'neo-scholar',
    name: 'Neo Scholar Program',
    university: '',
    aliases: [],
    eligibility: 'students_only',
    type: 'fellowship',
    checkSize: { min: null, max: null },
    applicationUrl: 'https://neo.com/scholars',
    deadline: 'rolling',
    description: 'Fellowship for exceptional student founders and researchers, providing mentorship from top operators and investors with a path to Neo seed funding.',
    stageFocus: ['pre-seed'],
    sectorFocus: [],
    isOpenAccelerator: false,
  },

  {
    id: 'kp-fellows',
    name: 'Kleiner Perkins Fellows',
    university: '',
    aliases: [],
    eligibility: 'students_only',
    type: 'fellowship',
    checkSize: { min: null, max: null },
    applicationUrl: 'https://fellows.kleinerperkins.com',
    deadline: 'rolling',
    description: 'Kleiner Perkins\' fellowship for top engineering and design students, placing them at KP portfolio companies with a path to future funding.',
    stageFocus: ['pre-seed'],
    sectorFocus: ['Software', 'AI/ML', 'Design', 'Engineering'],
    isOpenAccelerator: false,
  },

  {
    id: 'interact-fellowship',
    name: 'Interact Fellowship',
    university: '',
    aliases: [],
    eligibility: 'students_only',
    type: 'fellowship',
    checkSize: { min: null, max: null },
    applicationUrl: 'https://joininteract.com',
    deadline: 'rolling',
    description: 'Selective fellowship for student technologists and builders providing access to a vetted network of founders, operators, and investors.',
    stageFocus: ['pre-seed'],
    sectorFocus: [],
    isOpenAccelerator: false,
  },

  // ── Open Accelerators (no university requirement — appear in both tracks) ──

  {
    id: 'y-combinator',
    name: 'Y Combinator',
    university: '',
    aliases: [],
    eligibility: 'university_affiliated',
    type: 'accelerator',
    checkSize: { min: 500, max: 500 },   // $500K standard deal (2024)
    applicationUrl: 'https://www.ycombinator.com/apply',
    deadline: 'rolling',
    description: 'The world\'s leading startup accelerator, investing $500K in early-stage companies across every sector and stage at twice-yearly batches.',
    stageFocus: ['pre-seed', 'seed'],
    sectorFocus: [],
    isOpenAccelerator: true,
  },

  {
    id: 'techstars',
    name: 'Techstars',
    university: '',
    aliases: [],
    eligibility: 'university_affiliated',
    type: 'accelerator',
    checkSize: { min: 120, max: 120 },   // ~$120K standard deal
    applicationUrl: 'https://www.techstars.com/apply',
    deadline: 'rolling',
    description: 'Global accelerator network with city and vertical-specific programs, investing $120K in early-stage startups with 3-month intensive support.',
    stageFocus: ['pre-seed', 'seed'],
    sectorFocus: [],
    isOpenAccelerator: true,
  },

  // ── Stanford-adjacent (preferred but not exclusive) ────────────────────────

  {
    id: 'pear-vc',
    name: 'Pear VC',
    university: 'Stanford',
    aliases: ['Stanford', 'Stanford University'],
    eligibility: 'alumni_included',
    type: 'fund',
    checkSize: { min: 500, max: 3000 },
    applicationUrl: 'https://pear.vc',
    deadline: 'rolling',
    description:
      'Pre-seed and seed fund with deep Stanford roots for technical founders. Stanford ties help but are not required.',
    stageFocus: ['pre-seed', 'seed'],
    sectorFocus: [],
    isOpenAccelerator: false,
  },
]

/**
 * Flat set of all program names for O(1) lookup in filterOutUniversityPrograms.
 * Includes only non-open-accelerator programs (open accelerators stay in the
 * mainstream pool).
 */
export const EXCLUSIVE_PROGRAM_NAMES: Set<string> = new Set(
  UNIVERSITY_PROGRAMS
    .filter((p) => !p.isOpenAccelerator)
    .map((p) => p.name.toLowerCase()),
)
