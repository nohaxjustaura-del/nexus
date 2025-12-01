# Features Implementation Checklist

## ✅ ALREADY WORKING
1. **Browse All VCs** - FREE
   - Status: ✅ Fully functional
   - Location: `/founder/discover`
   - Database: 1,038 verified investors

2. **Video Pitch Analysis** - 50 CREDITS
   - Status: ✅ Fully functional
   - Location: `/founder/video-pitch`
   - API: `/api/analyze-video-pitch`
   - Features: Upload video, AI analysis, VC matching

3. **Pitch Deck Analysis** - 50 CREDITS
   - Status: ✅ Fully functional
   - Location: `/founder/pitch-deck`
   - API: `/api/analyze-pitch-deck`
   - Features: Upload PDF/PPT, AI analysis, VC matching

4. **Credits System**
   - Status: ✅ Fully functional
   - Database: UserCredits model
   - API: `/api/user/credits`
   - Features: Purchase tracking, credit deduction

5. **YC Insider Premium Content**
   - Status: ✅ Fully functional
   - Location: `/founder/yc-insider`
   - Features: Purchase with credits, download materials
   - Items: Pitch deck (50cr), Video (30cr), Interview Q&A (75cr)

---

## ❌ NOT IMPLEMENTED - NEEDS WORK

### 1. **Tailored Recommendations** - FREE
**Status:** ❌ NOT IMPLEMENTED
**What it should do:**
- Show personalized VC recommendations based on user profile
- Use founder's industry, stage, location to match VCs
- Display on homepage or dedicated section

**What needs to be done:**
- Create founder profile onboarding (industry, stage, location)
- Build recommendation algorithm
- Create UI component to display recommendations
- Add to `/founder/discover` page as a filter/section

**Files to create/modify:**
- `app/founder/recommendations/page.tsx` (new)
- `app/api/recommendations/route.ts` (new)
- Database: Store user preferences in Founder/User model

---

### 2. **Unlock Top 5 Matches** - 10 CREDITS
**Status:** ❌ NOT IMPLEMENTED
**What it should do:**
- After running an analysis (video/pitch deck), show top 5 matches as "locked"
- Users pay 10 credits to unlock detailed match info
- Show match scores, reasons, and application links

**What needs to be done:**
- Modify analysis results to show top 5 as "locked" by default
- Create unlock API endpoint
- Deduct 10 credits when unlocking
- Store unlock status in database
- Update `/founder/my-analyses` to show unlock button

**Files to create/modify:**
- `app/api/unlock-matches/route.ts` (new)
- `app/founder/my-analyses/page.tsx` (modify - add unlock buttons)
- Database: Track which analyses have unlocked matches

---

### 3. **VC-Accepted Founder Review** - 200 CREDITS
**Status:** ❌ NOT IMPLEMENTED
**What it should do:**
- Founders can submit their pitch for review by YC-accepted founders
- William Namgyal & Inigo Lenderking review and provide feedback
- Founders receive detailed written feedback within 48-72 hours

**What needs to be done:**
- Create submission form (pitch deck, video link, description)
- Create admin review dashboard for William & Inigo
- Email notifications for new submissions
- Credit deduction system (200 credits)
- Feedback delivery system
- Status tracking (pending, in-review, completed)

**Files to create/modify:**
- `app/founder/founder-review/page.tsx` (new - submission form)
- `app/admin/reviews/page.tsx` (new - review dashboard)
- `app/api/founder-review/submit/route.ts` (new)
- `app/api/founder-review/admin/route.ts` (new)
- Database: FounderReview model (userId, status, pitch materials, feedback)
- Email service integration (Resend/SendGrid)

**Additional requirements:**
- Automated email to William & Inigo when new submission comes in
- Automated email to founder when review is complete
- Admin panel to upload written feedback or record video feedback

---

### 4. **Schedule 1-on-1 Meeting** - 400 CREDITS
**Status:** ❌ NOT IMPLEMENTED
**What it should do:**
- Founders can book 30-60 min meetings with mentors/experts
- Integration with calendar system (Calendly or custom)
- Credit deduction (400 credits)
- Confirmation emails
- Meeting reminders

**What needs to be done:**
- Create meeting booking page
- Integrate with Calendly API or build custom calendar
- List available mentors/experts (William, Inigo, others)
- Credit deduction on booking
- Email confirmations & reminders
- Meeting history tracking

**Files to create/modify:**
- `app/founder/book-meeting/page.tsx` (new - booking interface)
- `app/api/book-meeting/route.ts` (new)
- `app/admin/meetings/page.tsx` (new - view all bookings)
- Database: Meeting model (userId, mentorId, scheduledTime, status, meetingLink)
- Calendly integration or custom calendar component

**Additional requirements:**
- Calendly Pro account or equivalent
- Zoom/Google Meet integration for meeting links
- Email service for confirmations
- Payment/credit verification before booking

---

## 📋 IMPLEMENTATION PRIORITY

### HIGH PRIORITY (Core Revenue Features)
1. **Unlock Top 5 Matches** - 10 credits
   - Easy to implement
   - Drives credit purchases
   - Enhances existing analysis features

2. **Tailored Recommendations** - Free
   - Improves user experience
   - Increases engagement
   - Low implementation effort

### MEDIUM PRIORITY (Premium Services)
3. **VC-Accepted Founder Review** - 200 credits
   - High-value service
   - Requires manual work from William & Inigo
   - Need admin dashboard

### LOW PRIORITY (High-Touch Service)
4. **Schedule 1-on-1 Meeting** - 400 credits
   - Most complex implementation
   - Requires calendar integration
   - Time-intensive for mentors
   - Consider using Calendly embed initially

---

## 🔧 TECHNICAL REQUIREMENTS

### Services/Integrations Needed:
1. **Email Service** (for notifications)
   - Resend (recommended - already in package.json?)
   - SendGrid
   - AWS SES

2. **Calendar Integration** (for 1-on-1 meetings)
   - Calendly (easiest - embed iframe)
   - Cal.com (open source alternative)
   - Custom calendar (more work)

3. **File Storage** (for founder review submissions)
   - Already have: `/public/uploads` folder
   - Consider: AWS S3, Cloudinary, or Vercel Blob

4. **Video Storage** (for video feedback)
   - Loom (easiest - record and share link)
   - Vimeo
   - YouTube (unlisted)

### Database Schema Updates Needed:

```prisma
// For Tailored Recommendations
model FounderProfile {
  id          String   @id @default(cuid())
  userId      String   @unique
  user        User     @relation(fields: [userId], references: [id])
  industry    String?
  stage       String?  // Idea, MVP, Launch, Growth
  location    String?
  sectors     String?  // JSON array
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

// For Unlock Matches
model UnlockedAnalysis {
  id          String   @id @default(cuid())
  userId      String
  analysisId  String   // Reference to video/pitch analysis
  creditsUsed Int      @default(10)
  createdAt   DateTime @default(now())
  
  @@unique([userId, analysisId])
}

// For Founder Review
model FounderReview {
  id              String   @id @default(cuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id])
  pitchDeckUrl    String?
  videoUrl        String?
  description     String
  status          String   @default("pending") // pending, in-review, completed
  feedback        String?
  reviewedBy      String?  // admin userId
  reviewedAt      DateTime?
  creditsUsed     Int      @default(200)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

// For 1-on-1 Meetings
model Meeting {
  id              String   @id @default(cuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id])
  mentorId        String?  // If you have mentor accounts
  mentorName      String
  scheduledTime   DateTime
  duration        Int      @default(30) // minutes
  meetingLink     String?
  status          String   @default("scheduled") // scheduled, completed, cancelled
  creditsUsed     Int      @default(400)
  notes           String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

---

## 📝 WHAT YOU NEED TO UPLOAD/PROVIDE

### For VC-Accepted Founder Review:
1. **William & Inigo's availability/commitment**
   - How many reviews can they handle per week?
   - Turnaround time for feedback (48h? 72h?)
   - Preferred format for feedback (written? video? both?)

2. **Review guidelines document**
   - What should reviewers focus on?
   - Standard feedback template
   - Quality standards

### For 1-on-1 Meetings:
1. **Calendly account credentials** (if using Calendly)
   - Or decision on custom vs integrated calendar

2. **List of available mentors**
   - Names, bios, expertise areas
   - Availability schedules
   - Meeting rates (all 400 credits or variable?)

3. **Meeting platform**
   - Zoom account for meetings?
   - Google Meet?
   - Microsoft Teams?

### For Email Notifications:
1. **Email service credentials**
   - Resend API key (recommended)
   - Or SendGrid API key

2. **Email templates**
   - Review submission confirmation
   - Review completed notification
   - Meeting booking confirmation
   - Meeting reminder (24h before)
   - Admin notification for new submissions

---

## 🚀 RECOMMENDED IMPLEMENTATION ORDER

### Week 1:
- ✅ Implement "Unlock Top 5 Matches" feature
- ✅ Implement "Tailored Recommendations" feature

### Week 2:
- ✅ Set up email service (Resend)
- ✅ Implement "VC-Accepted Founder Review" submission
- ✅ Build admin review dashboard

### Week 3:
- ✅ Implement "Schedule 1-on-1 Meeting" feature
- ✅ Integrate Calendly or build custom calendar

### Week 4:
- ✅ Testing and refinement
- ✅ Email automation setup
- ✅ Admin training for William & Inigo

---

## 💡 NOTES

- All credit costs should be enforced in API routes, not just frontend
- Always check user credit balance before allowing actions
- Premium users (isPremium: true) should bypass credit checks
- Admin email (nohaxjustaura@gmail.com) should have unlimited access
- Add comprehensive error handling for payment failures
- Log all credit transactions for auditing
- Consider refund policy implementation for failed services


