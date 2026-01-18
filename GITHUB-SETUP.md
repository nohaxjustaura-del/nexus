# 🚀 GitHub Setup Guide

## ✅ Before Pushing

Your `.gitignore` is properly configured to exclude:
- ✅ `.env.local` and all `.env` files (API keys are safe)
- ✅ `.next/` build folder
- ✅ `node_modules/`
- ✅ Database files (`*.db`)
- ✅ Upload folders
- ✅ Cache files

## 📤 Push to GitHub

### Step 1: Initialize Git (if not done)
```bash
git init
```

### Step 2: Check what will be committed
```bash
git status
```

**IMPORTANT**: Verify that `.env.local` does NOT appear in the list. If it does, check your `.gitignore`.

### Step 3: Stage files
```bash
git add .
```

### Step 4: Create initial commit
```bash
git commit -m "Initial commit: Startup platform with VC matching, pitch analysis, and background worker"
```

### Step 5: Create GitHub repo and push
1. Go to https://github.com/new
2. Create a new repository (don't initialize with README)
3. Copy the repo URL
4. Run:
```bash
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO-NAME.git
git branch -M main
git push -u origin main
```

## 🔒 Security Checklist

Before pushing, verify these are **NOT** in your repo:
- ❌ `.env.local` file
- ❌ `.env` file
- ❌ API keys in any file
- ❌ Database files (`*.db`)

**Check with:**
```bash
git status
git diff
```

## 📝 Recommended: Create `.env.example`

Create a template for other developers:

```bash
# Copy this file to .env.local and fill in your keys
OPENROUTER_API_KEY=your_key_here
TAVILY_API_KEY=your_key_here
DEEPGRAM_API_KEY=your_key_here
DATABASE_URL=your_database_url
NEXTAUTH_SECRET=your_secret_here
NEXTAUTH_URL=http://localhost:3000
```

This helps others know what environment variables are needed without exposing your keys.
