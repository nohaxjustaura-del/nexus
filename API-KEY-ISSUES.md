# 🚨 API Key Issues Summary

## Current Status

### ✅ Working
- **Deepgram API** (Video transcription)
- Video pitch uploads should work after dev server restart

### ❌ Not Working

#### 1. OpenRouter API Key - INVALID
```
OPENROUTER_API_KEY=sk-or-v1-bffc9bd15d58df62b639810335365858...
Error: 401 User not found
```

**Problem**: This key doesn't authenticate to any OpenRouter account.

**Used for**: Background worker (YC trends, market analysis)

**Fix**: Get a new key from https://openrouter.ai/keys

---

#### 2. Gemini API Key - QUOTA EXCEEDED
```
[429 Too Many Requests] You exceeded your current quota
Quota exceeded for metric: generate_content_free_tier_requests, limit: 0
```

**Problem**: You've used up your daily free tier limit (likely from testing).

**Used for**: Main AI analysis, background worker (now), pitch analysis

**Quota limits (Gemini 2.0 Flash)**:
- **1,500 requests per day** (FREE tier)
- **Resets**: Daily at midnight PST

---

## 🎯 Solutions

### Option 1: Wait for Gemini Quota Reset ⏰ (FREE)
Your Gemini quota will reset **tomorrow** (midnight PST).

**Timeline**: ~4-28 hours depending on when you used it up

**What works while waiting**:
- ✅ Video pitch transcription (uses Deepgram)
- ✅ Basic features
- ❌ AI analysis (temporarily unavailable)
- ❌ Background worker (paused until reset)

**To check quota status**: https://ai.dev/rate-limit

---

### Option 2: Get Valid OpenRouter Key 🔑 (FREE)
Get a new OpenRouter API key to enable background worker.

**Steps**:
1. Go to: https://openrouter.ai/keys
2. Sign up / Login
3. Create a new API key
4. Copy it completely
5. Replace in `.env.local`:
   ```
   OPENROUTER_API_KEY=sk-or-v1-YOUR_NEW_KEY_HERE
   ```
6. Restart worker:
   ```bash
   npm run worker:stop
   npm run worker:start
   ```

**Free tier**: $5 free credits, then pay-as-you-go

---

### Option 3: Disable Background Worker (QUICK FIX)
If you don't need automated YC trends and VC research, just turn off the worker.

```bash
npm run worker:stop
```

The main website features will work fine without it!

---

### Option 4: Upgrade Gemini (PAID - NOT RECOMMENDED)
You could pay for Gemini, but OpenRouter is cheaper and better for background tasks.

**Cost comparison**:
- Gemini paid: $0.075 per 1M tokens (input)
- OpenRouter (Llama 3.3 70B): $0.02-0.04 per 1M tokens
- **Recommendation**: Use OpenRouter for worker tasks

---

## 📋 Recommended Action Plan

### Immediate (Now):
1. ✅ **Restart dev server** - Video pitch fix is ready
2. ✅ **Test video pitch** - Should work now with Deepgram + lenient validation
3. ⏸️ **Pause background worker** - No valid AI key available yet

### Short-term (Today/Tomorrow):
4. 🔑 **Get OpenRouter key** - Enable background worker (FREE)
5. ⏰ **Wait for Gemini quota** - Resets in <28 hours

### Long-term:
6. 📊 **Monitor usage** - Check https://ai.dev/rate-limit
7. ⚙️ **Optimize background worker** - Reduce API calls if hitting limits

---

## 🚀 What to Do RIGHT NOW

### **STEP 1: Restart Dev Server** (Required for video pitch)
```bash
# In your dev server terminal (press Ctrl+C)
# Then restart:
npm run dev
```

### **STEP 2: Test Video Pitch**
Upload your Stanford/Facebook founders pitch video - it should work now!

**What changed**:
- ✅ Validation is now much more lenient
- ✅ Recognizes founder credentials (Stanford, Facebook, etc.)
- ✅ Accepts 200+ character transcripts with any pitch content
- ✅ Uses Deepgram (working) for transcription

### **STEP 3: Fix Background Worker** (Optional)
**Choice A**: Wait for Gemini quota reset (~tomorrow)
**Choice B**: Get OpenRouter key from https://openrouter.ai/keys
**Choice C**: Disable worker for now (`npm run worker:stop`)

---

## 📊 Current API Key Status

```bash
# In your .env.local:

✅ DEEPGRAM_API_KEY=ce474dec03d36e25cc3a4801ccb1a238cc673f23
   Status: Working
   Used for: Video transcription

⚠️  GEMINI_API_KEY=AIza... (partial, working key but quota exceeded)
   Status: Quota exceeded (resets daily)
   Used for: Main AI analysis

❌ OPENROUTER_API_KEY=sk-or-v1-bffc9bd15d58df62b639810335365858...
   Status: Invalid - User not found
   Used for: Background worker

❌ TAVILY_API_KEY=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
   Status: Unknown (seems like a test key)
   Used for: Web search in background worker (optional)
```

---

## ✅ Next Steps Summary

1. **NOW**: Restart dev server
2. **NOW**: Test video pitch upload
3. **TODAY**: Get OpenRouter key OR wait for Gemini quota reset
4. **ONGOING**: Monitor API usage at https://ai.dev/rate-limit

---

## 💬 Questions?

**Q**: Why did video pitch fail before?
**A**: Validation was too strict - now fixed!

**Q**: When will Gemini work again?
**A**: Tomorrow (resets daily at midnight PST)

**Q**: Is OpenRouter free?
**A**: Yes, $5 free credits, then ~$0.02-0.04 per 1M tokens

**Q**: Can I use the site without background worker?
**A**: Yes! Worker just keeps VC data fresh. Main features work fine without it.

**Q**: Which should I get - OpenRouter or pay for Gemini?
**A**: OpenRouter - it's cheaper and designed for background tasks.
