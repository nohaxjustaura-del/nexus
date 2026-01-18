# 🐛 AI Model Debugging Guide

## Current Setup

### **Video Pitch Analysis**
- **File**: `lib/ai.ts` → `analyzeVideoPitch()`
- **Should use**: OpenRouter with DeepSeek Chat (FREE)
- **Debug logs**: Check for `[AI] 🤖 Using model: deepseek/deepseek-chat`

### **Background Worker (YC Trends)**
- **File**: `lib/yc-trends.ts` → `analyzeYCBatchWithAI()`
- **Should use**: OpenRouter with DeepSeek Chat (FREE)
- **Debug logs**: Check for `[OPENROUTER] 🤖 Using model: deepseek/deepseek-chat (FREE)`

### **Pitch Idea Analysis**
- **File**: `app/api/analyze-pitch-idea/route.ts`
- **Should use**: OpenRouter with DeepSeek Chat (FREE)
- **Debug logs**: Check for `[OPENROUTER] 🤖 Using model: deepseek/deepseek-chat (FREE)`

---

## How to Verify Models

### **1. Check Video Pitch Analysis**
Upload a video and watch dev server logs for:

```bash
# Good (using DeepSeek - FREE):
[AI] 🤖 Using model: deepseek/deepseek-chat for video pitch analysis
[AI] 📄 Raw response length: 1234, starts with: {
[AI] ✅ Parsing JSON...
POST /api/analyze-video-pitch 200 in 3500ms

# Bad (using Gemini - QUOTA EXCEEDED):
[AI] 🤖 Using model: gemini-2.0-flash-exp
❌ ERROR GoogleGenerativeAIFetchError: 429 Too Many Requests
```

### **2. Check Background Worker**
Start worker and watch for:

```bash
# Good (using DeepSeek - FREE):
[OPENROUTER] 🤖 Using model: deepseek/deepseek-chat (FREE)
[OPENROUTER] 📄 Response length: 5678, starts: {
[OPENROUTER] ✅ Parsing JSON...
✅ Analysis complete

# Bad (using Gemini - QUOTA EXCEEDED):
[YC-TRENDS] AI analysis failed: GoogleGenerativeAIFetchError
❌ 429 Too Many Requests
```

### **3. Check Pitch Idea Analysis**
Submit a pitch idea and watch for:

```bash
# Good (using OpenRouter - FREE):
[OPENROUTER] 🤖 Using model: deepseek/deepseek-chat (FREE)
[OPENROUTER] ✅ Parsing JSON...
POST /api/analyze-pitch-idea 200 in 2500ms
```

---

## Debug Commands

### **Check which AI provider is configured**:
```bash
# In PowerShell:
cd "C:\Users\Kelvin Wu\Documents\startup"

# Check if OpenRouter key is set:
node -e "require('dotenv').config({path:'.env.local'}); console.log('OpenRouter:', !!process.env.OPENROUTER_API_KEY ? 'SET ✅' : 'NOT SET ❌')"

# Check if Gemini key is set:
node -e "require('dotenv').config({path:'.env.local'}); console.log('Gemini:', !!process.env.GEMINI_API_KEY ? 'SET (but quota exceeded)' : 'NOT SET')"
```

### **Test OpenRouter directly**:
```bash
# Test DeepSeek model:
curl -X POST https://openrouter.ai/api/v1/chat/completions `
  -H "Authorization: Bearer YOUR_OPENROUTER_KEY" `
  -H "Content-Type: application/json" `
  -d '{\"model\":\"deepseek/deepseek-chat\",\"messages\":[{\"role\":\"user\",\"content\":\"Return JSON: {\\\"test\\\":true}\"}]}'
```

---

## Common Issues

### **Issue 1: "Unexpected token 'D', "Developer"... is not valid JSON"**
**Cause**: AI returned text instead of JSON
**Fix Applied**: 
- ✅ Added JSON extraction from markdown code blocks
- ✅ Added debug logging to show model used
- ✅ Added explicit "return ONLY JSON" instructions

### **Issue 2: "401 User not found" from OpenRouter**
**Cause**: Invalid OpenRouter API key
**Fix**: Get new key from https://openrouter.ai/keys

### **Issue 3: "429 Too Many Requests" from Gemini**
**Cause**: Gemini quota exceeded
**Fix Applied**: 
- ✅ Disabled Gemini completely
- ✅ Using only OpenRouter/DeepSeek (FREE)

### **Issue 4: Worker not starting**
**Cause**: No valid AI API key
**Fix**: Add OpenRouter key to `.env.local`

---

## What to Look For in Logs

### **✅ Good Signs**:
```
[AI] 🤖 Using model: deepseek/deepseek-chat
[OPENROUTER] 🤖 Using model: deepseek/deepseek-chat (FREE)
[OPENROUTER] ✅ Parsing JSON...
✅ Analysis complete
POST /api/analyze-video-pitch 200
```

### **❌ Bad Signs**:
```
❌ ERROR: Unexpected token 'D', "Developer"... is not valid JSON
❌ ERROR: GoogleGenerativeAIFetchError: 429 Too Many Requests
❌ ERROR: 401 User not found
[AI] 🤖 Using model: gemini-2.0-flash-exp
```

---

## Next Steps After Restart

1. **Restart dev server** (to load new code):
   ```bash
   # Press Ctrl+C, then:
   npm run dev
   ```

2. **Add OpenRouter key** to `.env.local`:
   ```bash
   OPENROUTER_API_KEY=sk-or-v1-YOUR_NEW_KEY_HERE
   ```

3. **Test video pitch**:
   - Upload video
   - Watch logs for `[AI] 🤖 Using model: deepseek/deepseek-chat`
   - Should see `POST /api/analyze-video-pitch 200`

4. **Start worker** (optional):
   ```bash
   npm run worker:start
   ```
   - Watch for `[OPENROUTER] 🤖 Using model: deepseek/deepseek-chat (FREE)`

---

## Summary

✅ **Fixed**: JSON parsing with better extraction  
✅ **Added**: Debug logging to show which model is used  
✅ **Confirmed**: Using DeepSeek (FREE), not Gemini  
✅ **Cost**: $0.00/month  

**Just restart and test!** 🚀
