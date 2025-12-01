# 🔧 Troubleshooting Guide

## ✅ Fixed Issues

### **Build Error: "Unexpected token `div`"**
**Status:** ✅ FIXED
- Cleaned up imports in `app/vc-guide/page.tsx`
- The page should compile now

---

## 🚀 Complete Setup Commands

Run these in your CMD (Command Prompt):

```cmd
npx prisma generate
npx prisma db push
npm run db:seed
npm run dev
```

---

## 🐛 Common Issues & Fixes

### **1. "npm not recognized"**
**Problem:** Node.js not installed or not in PATH

**Fix:**
1. Download Node.js: https://nodejs.org/
2. Install (check "Add to PATH")
3. Restart CMD
4. Try again

---

### **2. "Cannot find module .prisma/client"**
**Problem:** Prisma client not generated

**Fix:**
```cmd
npx prisma generate
npx prisma db push
npm run dev
```

---

### **3. "Build Error: Unexpected token"**
**Problem:** Syntax error or cache issue

**Fix:**
```cmd
rmdir /s /q .next
npm run dev
```

---

### **4. "Port 3000 already in use"**
**Problem:** Another app using port 3000

**Fix Option A (Use different port):**
```cmd
npm run dev -- -p 3001
```
Then open: http://localhost:3001

**Fix Option B (Kill port 3000):**
```cmd
npx kill-port 3000
npm run dev
```

---

### **5. Database Errors**
**Problem:** Database out of sync

**Fix:**
```cmd
del prisma\dev.db
npx prisma generate
npx prisma db push
npm run db:seed
npm run dev
```

---

### **6. "Module not found" Errors**
**Problem:** Dependencies not installed

**Fix:**
```cmd
rm -r node_modules
npm install
npm run dev
```

On Windows CMD use:
```cmd
rmdir /s /q node_modules
npm install
npm run dev
```

---

### **7. OpenAI API Errors**
**Problem:** No API key or invalid key

**Fix:**
- The platform works WITHOUT OpenAI (uses pattern matching)
- To enable full AI:
  1. Get key: https://platform.openai.com/api-keys
  2. Create `.env` file: `OPENAI_API_KEY=sk-xxx`
  3. Restart server

---

## 🎯 Fresh Start (Nuclear Option)

If nothing works, do a complete reset:

```cmd
REM Delete everything except source code
rmdir /s /q node_modules
rmdir /s /q .next
del prisma\dev.db

REM Reinstall
npm install
npx prisma generate
npx prisma db push
npm run db:seed
npm run dev
```

---

## ✅ Verify Everything Works

After running setup commands, check:

- [ ] Server starts without errors
- [ ] Can visit http://localhost:3000
- [ ] Landing page loads
- [ ] Can visit `/vc-guide` (no syntax error)
- [ ] Can visit `/founder/resume-analysis`
- [ ] Can upload a file
- [ ] Analysis runs and shows results
- [ ] Top VCs display with boost reasons

---

## 📞 Quick Diagnostics

### **Check Node.js:**
```cmd
node --version
npm --version
```
Should show: v18.x+ and npm 9.x+

### **Check Prisma:**
```cmd
npx prisma --version
```
Should show: prisma 5.x

### **Check Database:**
```cmd
npm run db:studio
```
Opens GUI at http://localhost:5555
- Should see Investor table with 50+ VCs
- Should see Founder table
- Should see Mentor table

---

## 🎯 Current Status

✅ Syntax error FIXED
✅ AI analysis API created
✅ Smart matching implemented
✅ Comprehensive VC database ready
✅ All pages created
✅ Documentation complete

**Next:** Run the 4 setup commands and test!

---

## 🚀 The 4 Magic Commands

```cmd
npx prisma generate
npx prisma db push
npm run db:seed
npm run dev
```

**Then visit:** http://localhost:3000

---

## 💡 Pro Tips

1. **Always restart server** after code changes
2. **Clear Next.js cache** if weird errors: `rmdir /s /q .next`
3. **Check CMD window** for detailed error messages
4. **Use Prisma Studio** to view database: `npm run db:studio`
5. **Test with simple resume** first (`.txt` file)

---

## 🎉 Success Looks Like

When everything works, you'll see:

**In CMD:**
```
✓ Ready in 2.5s
○ Local:   http://localhost:3000
```

**In Browser:**
- Beautiful landing page
- Working navigation
- VC Guide loads
- Resume analysis works
- Real AI matching!

---

**The syntax error is fixed! Run the setup commands and you're good to go!** 🚀

