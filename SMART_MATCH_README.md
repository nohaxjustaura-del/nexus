# 🎯 Smart Match AI - Integrated Semantic VC Matching (Gemini-Powered)

## Overview

Smart Match is an AI-powered semantic matching system that **automatically runs with every pitch analysis**. It ranks all 1,002 investors by fit score using **Google Gemini's text-embedding-004** model and cosine similarity to find the best investor matches beyond simple keyword matching.

**Key Features**: 
- **Built into the AI analyzer** - no separate button or extra credits needed!
- **Uses Gemini** - works with your existing GEMINI_API_KEY
- **768-dimension embeddings** - optimized for semantic understanding

## 🚀 Features

- **Automatic Integration**: Runs with every pitch analysis (no extra action needed)
- **Semantic Matching**: Goes beyond keywords to understand meaning and context
- **Comprehensive Analysis**: Considers stage, sector, geography, thesis, portfolio, and more
- **Fast Performance**: Pre-computed VC embeddings for instant matching
- **Fit Scores**: Shows percentage match for each investor
- **Included in Analysis**: No extra credits - part of standard analysis cost
- **Top 20 Results**: Returns the best-fit investors ranked by similarity

## 📁 Architecture

### Core Files

#### `lib/embeddings.ts`
- **Pitch Embedding**: Converts pitch features into high-signal embedding text
- **VC Embedding**: Converts VC profiles into searchable embeddings
- **Similarity Calculation**: Cosine similarity between vectors
- **Ranking Algorithm**: Sorts VCs by fit score

#### `components/smart-match-results.tsx`
- **UI Component**: Automatic display of match results
- **Results Grid**: Top 10 matches with badges and fit scores
- **Fit Percentage**: Visual display of match quality
- **Navigation**: Links to full Discover page and individual VCs

#### `scripts/generate-vc-embeddings.ts`
- **Pre-Generation Script**: Creates embeddings for all VCs
- **Batch Processing**: Handles rate limiting
- **Progress Tracking**: Shows generation status
- **Error Handling**: Graceful failure recovery

### Database Schema

```prisma
model Investor {
  // ... existing fields ...
  embedding String? // JSON array of embedding vector (1536 dimensions)
}

model VideoPitch {
  // ... existing fields ...
  smartMatchResults String? // JSON array of ranked VCs
}
```

## 🎨 How It Works

### 1. Pitch Analysis
Founder analyzes their pitch using one of three methods:
- Pitch Idea (text input) - 15 credits
- Pitch Deck (PDF upload) - 30 credits
- Video Pitch (video upload) - 50 credits

### 2. Automatic Smart Match
Smart Match runs automatically during analysis (no extra step needed)

### 3. Embedding Generation
System generates a 1536-dimension embedding vector from pitch features:
- Company overview (name, stage, sector)
- Problem statement
- Solution description
- Target customer
- Market & geography
- Business model
- Traction metrics
- Technology & competitive moat
- Keywords

### 4. Similarity Calculation
Compares pitch embedding against all VC embeddings using cosine similarity:
```typescript
similarity = dotProduct(pitchVector, vcVector) / (norm(pitchVector) * norm(vcVector))
```

### 5. Ranking & Results
- Sorts all 1,002 investors by similarity score
- Returns top 20 matches
- Displays fit percentage (0-100%)
- Shows investor metadata (stage, sector, check size, etc.)

## 📊 Embedding Structure

### Pitch Embedding Text
```
PITCH OVERVIEW
Company: [name]
Stage: [stage]
Sector: [primary], [secondary]

PROBLEM
[problem statement]

SOLUTION
[solution description]

CUSTOMER
Type: [B2B/B2C]
Role: [buyer role]
Size: [company size]

MARKET & GEOGRAPHY
HQ: [location]
Markets: [target markets]

BUSINESS MODEL
[revenue model]

TRACTION
Revenue: [amount]
Users: [count]
Growth: [signal]

TECHNOLOGY & MOAT
Technologies: [key tech]
Moat: [competitive advantages]

KEYWORDS
[relevant keywords]
```

### VC Embedding Text
```
FIRM OVERVIEW
Name: [firm name]
Type: [VC/Micro-VC/CVC/Accelerator]
Stages: [investment stages]
Sectors: [focus sectors]
Geography: [regions]

INVESTMENT CRITERIA
Check size: $[min]K - $[max]K
Lead/Follow: [preference]
Thesis: [investment thesis]

VALUE ADD
Specializations: [value-add tags]

PORTFOLIO COMPANIES
[notable investments]
```

## 🔧 Setup & Usage

### 1. Install Dependencies
Already included in your `package.json`:
- `@google/generative-ai` - For Gemini embeddings API
- `@prisma/client` - Database access

### 2. Set Up API Key
Add to your `.env.local`:
```
GEMINI_API_KEY=your-gemini-api-key-here
```
Or use `GOOGLE_API_KEY` if you prefer.

### 3. Generate VC Embeddings (First Time)
```bash
npm run generate-vc-embeddings
```

This will:
- Fetch all verified, public VCs
- Generate Gemini embeddings for each (takes ~10-15 minutes)
- Store in database for fast future lookups
- Show progress and summary
- Rate-limited to 200ms between requests

### 3. Use Smart Match

#### Automatic Integration
1. Analyze any pitch (idea/deck/video)
2. Smart Match runs automatically during analysis
3. Results appear below your analysis scores
4. View top 10 matches with fit percentages
5. Click any match to view full VC profile
6. Click "View all 20 matches" to see complete list

## 💰 Credit System

- **Cost**: Included in analysis cost (no extra charge)
  - Pitch Idea: 15 credits (includes Smart Match)
  - Pitch Deck: 30 credits (includes Smart Match)
  - Video Pitch: 50 credits (includes Smart Match)
- **No Separate Charge**: Smart Match is now part of the analysis
- **Automatic**: Runs without user action

## 🎯 Match Results Format

```typescript
interface RankedVC {
  id: string
  firmName: string
  similarity: number // 0.0 to 1.0
  metadata: {
    stages?: string[]
    sectors?: string[]
    geography?: string[]
    checkSize?: string
    fundType?: string
  }
}
```

## 🚀 Performance Optimization

### Pre-Computed Embeddings
- VCs: Generated once, stored in database
- Pitches: Generated on-demand (unique per founder)

### Batch Processing
- OpenAI allows 2048 inputs per batch
- Rate limiting: 100ms between requests
- Parallel processing where possible

### Caching Strategy
- VC embeddings: Persistent in database
- Match results: Stored with analysis for re-display
- No re-computation unless pitch changes

## 📈 Future Enhancements

### Phase 2
- [ ] Vector database (Pinecone/Weaviate) for faster search
- [ ] Hybrid scoring (semantic + rule-based filters)
- [ ] Explanation of why each VC matched
- [ ] Save match results for later viewing
- [ ] Email top matches to founder

### Phase 3
- [ ] Real-time matching as pitch is typed
- [ ] Match confidence intervals
- [ ] A/B test different embedding strategies
- [ ] ML model to predict intro success rate
- [ ] Personalized ranking based on founder background

## 🐛 Troubleshooting

### "Insufficient credits" error
- User needs 50 credits minimum
- Check `founder.credits` in database
- Offer credit purchase flow

### Slow matching (>10 seconds)
- Check if VC embeddings are pre-generated
- Run `npm run generate-vc-embeddings`
- Verify OpenAI API key is valid

### Low match scores (<50%)
- Pitch may be too generic or incomplete
- Encourage more detailed pitch analysis
- Check if VC database has sufficient data

### Missing embeddings
- Some VCs may not have embeddings yet
- Script generates on-the-fly (slower)
- Re-run embedding generation script

## 📊 Analytics & Monitoring

### Key Metrics to Track
- Average match score
- Credit usage per founder
- Match-to-application conversion rate
- Most matched VCs
- Time to generate matches

### Database Queries
```sql
-- Total Smart Matches run
SELECT COUNT(*) FROM CreditTransaction WHERE type = 'smart_match';

-- Average credits per user
SELECT AVG(credits) FROM Founder;

-- Most matched VCs (requires match result parsing)
-- Stored in VideoPitch.smartMatchResults
```

## 🔐 Security & Privacy

- Embeddings don't expose raw pitch data
- Match results only visible to pitch owner
- VC embeddings are public (based on public profiles)
- API requires authentication
- Credit validation prevents abuse

## 📚 Resources

- [OpenAI Embeddings Guide](https://platform.openai.com/docs/guides/embeddings)
- [Cosine Similarity Explained](https://en.wikipedia.org/wiki/Cosine_similarity)
- [Vector Search Best Practices](https://www.pinecone.io/learn/vector-search/)

## 🎉 Success Criteria

✅ **Complete** when:
- [x] Embeddings generated for all VCs
- [x] API endpoint working
- [x] UI integrated in 3 places
- [x] Credit system functional
- [x] Match results display correctly
- [x] Performance <5 seconds per match

## 🤝 Contributing

To improve Smart Match:
1. Test with real pitches
2. Gather founder feedback on match quality
3. A/B test different embedding prompts
4. Optimize for speed and accuracy
5. Add more VC data for better matching

---

**Built with**: TypeScript, Next.js, OpenAI, Prisma, SQLite
**Inspired by**: VC_Visual_Rank_AI repository
**Status**: ✅ Production Ready
