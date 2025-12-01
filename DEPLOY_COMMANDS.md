# Commands to Deploy All Changes

## 🔄 **Step 1: Restart Dev Server (See Changes on Localhost)**

Copy and paste these commands one by one in your terminal:

```powershell
# Stop all Node processes (stops dev server)
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force

# Clear Next.js cache
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue

# Start dev server fresh
npm run dev
```

**OR if you prefer manual steps:**
1. Press `Ctrl+C` in the terminal where dev server is running
2. Run: `Remove-Item -Recurse -Force .next`
3. Run: `npm run dev`

---

## 📦 **Step 2: Git Commands (If Git is Installed)**

**Option A: Using Git Bash or Command Prompt with Git in PATH**

```bash
# Check what files changed
git status

# Add all changes
git add .

# Commit changes
git commit -m "feat: simplify homepage, add dashboard access, improve VC cards with smart descriptions, optimize performance"

# Push to remote
git push origin main
```

**OR if your branch is different (check with `git branch`):**
```bash
git push origin master
# or
git push origin develop
```

**Option B: If Git is not in PATH, use full path or Git Bash**

If you have Git installed but not in PATH:
- Open **Git Bash** (search in Start menu)
- Navigate to your project: `cd "C:\Users\Kelvin Wu\Documents\startup"`
- Then run the git commands above

---

## ✅ **Step 3: Verify Changes Are Live**

After restarting the dev server, check:

1. **Homepage** (http://localhost:3000):
   - Should be simple with just headline and one button
   - If logged in: shows "Go to Dashboard"
   - If not logged in: shows "Get Started Free"

2. **Navigation**:
   - If logged in: should see "Dashboard" button in nav

3. **VC Discover Page** (http://localhost:3000/founder/discover):
   - Cards should have hover effects (lift up on hover)
   - Descriptions should be unique and detailed (not generic)
   - Cards should be more interactive

4. **Console** (F12):
   - Should be clean with no errors

---

## 🚨 **If Changes Still Don't Show:**

```powershell
# Nuclear option - full clean restart
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force node_modules\.cache -ErrorAction SilentlyContinue
npm run dev
```

---

## 📝 **Quick Copy-Paste (All at Once)**

**For PowerShell:**
```powershell
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force; Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue; npm run dev
```

**For Git (in Git Bash or CMD with Git):**
```bash
git add . && git commit -m "feat: all UI improvements and optimizations" && git push
```

---

## 🔍 **Verify Files Are Saved**

All these files should have the latest changes:
- ✅ `app/page.tsx` - Simplified homepage
- ✅ `app/founder/discover/page.tsx` - Interactive cards + smart descriptions
- ✅ `components/nav-auth.tsx` - Dashboard button
- ✅ `app/layout.tsx` - Clean layout
- ✅ `components/session-keeper.tsx` - Optimized
- ✅ `middleware.ts` - Optimized
- ✅ `next.config.mjs` - Performance config
- ✅ `app/globals.css` - Cleaned CSS



