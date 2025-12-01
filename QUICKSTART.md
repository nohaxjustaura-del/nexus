# 🚀 Quick Start Guide - FounderMatch

## ✨ Your Platform is Ready to Launch!

Everything is built and ready. Just follow these steps to get it running:

---x

## 📋 Setup Checklist

### Step 1: Install Dependencies

Open your terminal in the project directory and run:

```bash
npm install
```

This will install all required packages (Next.js, Prisma, OpenAI, UI components, etc.)

---

### Step 2: Set Up Environment Variables

Create a `.env` file in the project root:

```bash
# Create the file
touch .env

# Or on Windows
type nul > .env
```

Add your OpenAI API key:

```env
OPENAI_API_KEY=sk-your-key-here
```

**Don't have an OpenAI key?**
- Get one at: https://platform.openai.com/api-keys
- The AI features will use mock data if the key is missing (still works!)

---

### Step 3: Initialize Database

Run these commands in order:

```bash
# 1. Create the database schema
npm run db:push

# 2. Seed with 50+ VCs
npm run db:seed

# 3. (Optional) Open Prisma Studio to view data
npm run db:studio
```

**Expected output:**
- ✅ `dev.db` file created in `prisma/` folder
- ✅ 50+ VCs added
- ✅ 1 sample founder
- ✅ 2 mentors

---

### Step 4: Start the Development Server

```bash
npm run dev
```

Open your browser to: **http://localhost:3000**

---

## 🎯 What You'll See

### Landing Page (`/`)
- Beautiful hero section
- Feature cards
- Waitlist form
- Full navigation

### Founder Journey:
1. **`/founder/onboarding`** - 4-step profile creation
2. **`/founder/discover`** - Browse 50+ VCs with filters
3. **`/founder/resume-analysis`** - AI-powered compatibility
4. **`/founder/bookmarks`** - Saved investors

### VC Journey:
1. **`/vc/claim`** - 3-step profile setup
2. **`/vc/dashboard`** - Deal flow management

---

## 🧪 Test the Platform

### As a Founder:

1. Go to `/founder/onboarding`
2. Fill out your profile:
   - **Name**: Test Founder
   - **Email**: test@founder.com
   - **Stage**: Seed
   - **Sectors**: AI/ML, SaaS
   - **Funding Need**: 500 (= $500K)
   - **Location**: San Francisco
3. Complete all 4 steps
4. See 50+ matched VCs!

### As a VC:

1. Go to `/vc/claim`
2. Create your profile:
   - **Name**: Test VC
   - **Email**: test@vc.com
   - **Firm**: Test Ventures
   - **Check Size**: 100-500K
   - **Stages**: Pre-Seed, Seed
   - **Sectors**: AI/ML
3. Complete 3 steps
4. View your dashboard with matched founders

---

## 📁 Key Files You Built

| File | What It Does |
|------|-------------|
| `app/page.tsx` | Landing page with hero, features, CTA |
| `app/founder/discover/page.tsx` | VC search & filtering |
| `app/founder/resume-analysis/page.tsx` | AI resume analysis |
| `app/founder/onboarding/page.tsx` | Founder profile setup |
| `app/vc/claim/page.tsx` | VC profile creation |
| `app/vc/dashboard/page.tsx` | VC deal flow dashboard |
| `lib/matching.ts` | Match scoring algorithm |
| `lib/ai.ts` | OpenAI resume analysis |
| `prisma/seed.ts` | 50+ VC seed data |
| `prisma/schema.prisma` | Database schema |

---

## 🎨 UI Components

All components are in `components/ui/`:
- `button.tsx` - Primary/secondary/outline buttons
- `card.tsx` - Card layouts with headers/content/footers
- `badge.tsx` - Status badges
- `input.tsx` - Form inputs
- `label.tsx` - Form labels

**Powered by:** Shadcn/ui + Tailwind CSS

---

## 🧮 How the Matching Works

The algorithm in `lib/matching.ts` scores each founder-investor pair:

```typescript
score = 
  40% × check size fit
+ 25% × sector overlap
+ 10% × geography match
+ 10% × value-add alignment
+ 10% × ethics alignment
+  5% × personality fit
```

**Hard filters eliminate non-fits:**
- Stage mismatch = 0 score
- Geography restriction = 0 score
- Conflict sector = 0 score

**Results:** Top 20 VCs ranked by compatibility!

---

## 🤖 AI Features

### Current (Mock):
- Resume upload UI
- Mock analysis with scores
- Top 5 VC recommendations
- Skill gaps & suggestions

### To Enable Live AI:
1. Add `OPENAI_API_KEY` to `.env`
2. The code is already wired in `lib/ai.ts`
3. It will automatically switch from mock to real

---

## 🎯 Next Steps

### Immediate:
- [ ] Test all pages
- [ ] Customize landing page copy
- [ ] Add your own VCs to seed data
- [ ] Deploy to Vercel

### Phase 2 Features to Add:
- [ ] User authentication (Clerk/Auth0)
- [ ] Real-time notifications
- [ ] Email alerts for matches
- [ ] Application tracking
- [ ] Deck open analytics

### Monetization (When Ready):
- [ ] Founder Pro tier ($19/mo)
- [ ] VC Pro tier ($79/mo)
- [ ] Crash course marketplace
- [ ] White-label licensing

---

## 🐛 Troubleshooting

### "npm not found"
Install Node.js from https://nodejs.org/

### "Prisma errors"
```bash
# Reset database
rm prisma/dev.db
npm run db:push
npm run db:seed
```

### "OpenAI errors"
- Check your API key in `.env`
- Ensure you have credits at https://platform.openai.com/
- If no key, the app uses mock data (still works!)

### "Port 3000 in use"
```bash
# Kill the process
npx kill-port 3000

# Or use a different port
npm run dev -- -p 3001
```

---

## 🚀 Deploy to Vercel

1. **Push to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-repo-url>
   git push -u origin main
   ```

2. **Connect to Vercel:**
   - Go to https://vercel.com
   - Import your GitHub repo
   - Add environment variable: `OPENAI_API_KEY`
   - Click Deploy!

3. **Done!** Your platform is live 🎉

---

## 📊 Database Schema

```
Founder
├── Profile (name, email, age, education)
├── Startup (name, stage, sectors, location)
├── Funding (need amount, business model)
└── Preferences (ethics, personality, value-add needs)

Investor
├── Profile (name, firm, verified)
├── Thesis (stages, check size, sectors, geo)
├── Value Props (value-add tags, personality)
└── Reputation (responsiveness score, decision speed)

Mentor
├── Profile (name, expertise, sectors)
└── Availability (time per month, location)

ResumeAnalysis
├── Skills, experiences, keywords
├── Gaps & suggestions
├── Compatibility score
└── Top VCs

Bookmark
├── Founder ↔ Investor
└── Notes

Application
├── Founder → Investor
└── Status tracking
```

---

## 💡 Pro Tips

1. **Explore Prisma Studio:**
   ```bash
   npm run db:studio
   ```
   Visual database editor at http://localhost:5555

2. **Customize VCs:**
   Edit `prisma/seed.ts` to add your own investors

3. **Theme Colors:**
   Edit `tailwind.config.ts` to change the color scheme

4. **Add Auth:**
   Uncomment auth providers in `app/layout.tsx`

---

## 🎉 You're All Set!

Your **FounderMatch** platform is complete with:
- ✅ Beautiful landing page
- ✅ Full founder onboarding flow
- ✅ 50+ seeded VCs across all sectors
- ✅ AI resume analysis (mock + real-ready)
- ✅ Smart matching algorithm
- ✅ VC claim & dashboard
- ✅ Bookmarks & tracking
- ✅ Responsive design
- ✅ Production-ready architecture

**Now go build the future of fundraising!** 🚀

---

Questions? Check the main `README.md` for architecture details.

Happy building! 💜

