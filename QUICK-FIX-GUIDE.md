# 🔧 Quick Fix Guide

## Issue 1: OpenAI API Key for Video Transcription ❌

**Error**: `Incorrect API key provided: sk-1234u...5678`

### Problem
The video pitch analysis feature uses OpenAI's Whisper API for transcription, but you have a placeholder API key.

### Solution

Add your **real OpenAI API key** to `.env.local`:

```bash
# Open .env.local and add:
OPENAI_API_KEY=sk-proj-YOUR_ACTUAL_KEY_HERE
```

**Get your OpenAI key**: https://platform.openai.com/api-keys

**Note**: OpenRouter cannot be used for Whisper transcription - you need a real OpenAI key.

---

## Issue 2: FAISS Service Not Running on Port 8001 ❌

**Problem**: The semantic search service (FAISS) isn't running.

### Solution

Start the FAISS service:

**Windows:**
```bash
cd faiss-service
python faiss_api.py
```

Or double-click: `faiss-service\start.bat`

**Mac/Linux:**
```bash
cd faiss-service
./start.sh
```

The service should start on `http://localhost:8001`

---

## Quick Verification

### 1. Check OpenAI Key
```bash
# In .env.local, you should see:
OPENAI_API_KEY=sk-proj-...  # Real key, not sk-1234...
```

### 2. Check FAISS Service
```bash
# Visit in browser:
http://localhost:8001/health

# Should return:
{"status": "ok"}
```

---

## Complete Environment Setup

Your `.env.local` should have:

```bash
# Database
DATABASE_URL=file:./prisma/dev.db

# AI Providers
OPENROUTER_API_KEY=sk-or-v1-...  # For background worker
GEMINI_API_KEY=AIza...            # Primary AI
OPENAI_API_KEY=sk-proj-...        # For Whisper transcription

# Web Search
TAVILY_API_KEY=tvly-...           # For VC research
```

---

## Services to Run

1. **Next.js Dev Server** (port 3000)
   ```bash
   npm run dev
   ```

2. **FAISS Service** (port 8001)
   ```bash
   cd faiss-service
   python faiss_api.py
   ```

3. **Background Worker** (optional)
   ```bash
   npm run worker:start
   ```

---

## Test Video Analysis

1. Ensure OpenAI key is set
2. Start FAISS service
3. Visit: http://localhost:3000/founder/video-pitch-upload
4. Upload a video
5. Should work! ✅

---

**Need API Keys?**

- **OpenAI**: https://platform.openai.com/api-keys ($5 free credit)
- **OpenRouter**: https://openrouter.ai/keys (FREE tier)
- **Tavily**: https://tavily.com (FREE tier)
- **Gemini**: https://aistudio.google.com/app/apikey (FREE)
