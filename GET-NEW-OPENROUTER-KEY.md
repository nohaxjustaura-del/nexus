# 🔑 Get NEW OpenRouter API Key (2 Minutes)

## The Issue

Your OpenRouter API key is **invalid**:
```
[OPENROUTER] 🤖 Using model: deepseek/deepseek-chat (FREE) ✅
AuthenticationError: 401 User not found. ❌
```

**Good news**: The code is working! Debug logs show DeepSeek (FREE) is being used.
**Bad news**: Your API key doesn't authenticate.

---

## ✅ Quick Fix (2 Minutes)

### **Step 1: Get FREE OpenRouter Key**
1. Open browser: **https://openrouter.ai/keys**
2. Sign up (or login if you have account)
3. Click **"Create Key"**
4. Copy the **ENTIRE** key (starts with `sk-or-v1-`)

### **Step 2: Update `.env.local`**
Open `.env.local` and replace:

```bash
# OLD (invalid):
OPENROUTER_API_KEY=sk-or-v1-bffc9bd15d58df62b639810335365858...

# NEW (from Step 1):
OPENROUTER_API_KEY=sk-or-v1-YOUR_NEW_KEY_HERE
```

### **Step 3: Restart Worker**
```powershell
# Stop worker (Ctrl+C if running, or):
Get-Process -Name "node" | Where-Object {$_.CommandLine -like "*worker*"} | Stop-Process -Force

# Start worker:
npm run worker:start
```

### **Step 4: Watch for Success**
Should see:
```
[OPENROUTER] 🤖 Using model: deepseek/deepseek-chat (FREE)
[OPENROUTER] 📄 Response length: 5678, starts: {
[OPENROUTER] ✅ Parsing JSON...
✅ Analysis complete
```

---

## 🎯 Why This Happened

**Your current key**: `sk-or-v1-bffc9bd15d58df62b639810335365858...`

**OpenRouter says**: "User not found"

This means:
- Key was never valid, OR
- Account was deleted/reset, OR
- Key was revoked

**Solution**: Just get a fresh key!

---

## 💰 Cost: Still $0.00

OpenRouter with DeepSeek is **100% FREE**:
- ✅ No credit card required
- ✅ Unlimited requests
- ✅ No rate limits
- ✅ Free forever

---

## 📋 After You Get New Key

### **For Video Pitch** (if still having issues):
1. Restart dev server (if not already done)
2. Upload video
3. Should work now!

### **For Background Worker**:
1. Add new key to `.env.local`
2. Restart worker: `npm run worker:start`
3. Should see: `[OPENROUTER] ✅ Parsing JSON...`

---

## 🚀 Get Key Now

👉 **https://openrouter.ai/keys**

Takes 2 minutes, then everything works!
