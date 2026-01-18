# 🔑 API Keys Needed

## Current Issues

### 1. Video Pitch Works! ✅ (After Next Fix)
Deepgram is working, but validation is too strict. Fixing now...

### 2. Background Worker Failing ❌

**Error**: `401 User not found` from OpenRouter

**Fix**: Add valid OpenRouter API key to `.env.local`:

```bash
OPENROUTER_API_KEY=sk-or-v1-YOUR_REAL_KEY_HERE
```

**Get FREE key**: https://openrouter.ai/keys

---

## Complete `.env.local` Setup

```bash
# Database (already set)
DATABASE_URL=file:./prisma/dev.db

# AI for main features (already working?)
GEMINI_API_KEY=AIza...YOUR_KEY

# Video transcription (YOU HAVE THIS ✅)
DEEPGRAM_API_KEY=your_working_key

# Background worker (MISSING - NEEDS FIXING ❌)
OPENROUTER_API_KEY=sk-or-v1-GET_THIS_KEY

# Web search for worker (optional but recommended)
TAVILY_API_KEY=tvly-GET_THIS_KEY
```

---

## What Each Key Does

| Key | Used For | Status | Get It |
|-----|----------|--------|--------|
| **GEMINI_API_KEY** | Main AI analysis | ✅ Working | https://aistudio.google.com/app/apikey |
| **DEEPGRAM_API_KEY** | Video transcription | ✅ Working | Already have it |
| **OPENROUTER_API_KEY** | Background worker AI | ❌ Missing/Invalid | https://openrouter.ai/keys |
| **TAVILY_API_KEY** | VC web research | ⚠️  Optional | https://tavily.com |

---

## Quick Fix for Worker

1. Go to: https://openrouter.ai/keys
2. Sign up (FREE)
3. Create API key
4. Copy it
5. Add to `.env.local`:
   ```bash
   OPENROUTER_API_KEY=sk-or-v1-paste_your_key_here
   ```
6. Restart worker

---

## Video Pitch Fix (Restart Dev Server After I Update)

The validation is rejecting your valid pitch. I'm fixing it to:
- Accept founder introductions
- Recognize Stanford/Facebook/engineering as pitch-related
- Be much more lenient
- Accept any video 200+ characters

**After I finish**: Restart dev server and try again!
