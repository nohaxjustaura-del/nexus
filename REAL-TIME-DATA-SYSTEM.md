# 🤖 Real-Time AI-Native Data Update System

## Overview

Your FounderMatch platform now features a **fully automated, AI-native background worker system** that keeps all data fresh, accurate, and aligned with the latest market trends.

## 🎯 What It Does

The system automatically updates:

1. **VC Data** (every 24 hours)
   - Researches and updates investor information
   - Validates investment thesis, check sizes, stages
   - Uses web search + AI to find accurate data
   - Sources: VC websites, Crunchbase, recent news

2. **YC Trends** (every 12 hours)
   - Fetches latest YC batch data
   - Analyzes hot sectors, founder patterns
   - Tracks traction thresholds and emerging signals
   - Updates matching algorithm with current trends

3. **Market Trends** (every 6 hours)
   - AI-powered analysis of startup/VC landscape
   - Identifies hot sectors, funding climate
   - Tracks geographic and stage preferences
   - OpenRouter AI generates insights

4. **Data Validation** (every 12 hours)
   - Checks for missing or outdated information
   - Identifies VCs needing updates
   - Validates data accuracy
   - Reports quality issues

5. **Embeddings** (every 24 hours)
   - Regenerates semantic search indexes
   - Updates FAISS vector database
   - Ensures accurate AI-powered matching

## 🚀 Quick Start

### Start the Background Worker

```bash
# Start worker and run all jobs immediately
npm run worker:start

# Start worker and schedule jobs for later
npm run worker:dev

# Run as a background daemon (production)
npm run worker:background
```

### Check Worker Status

```bash
npm run worker:status
```

Expected output:
```
✅ Worker is running

📋 Jobs (5):

1. 🏃 YC Trends Analysis
   Status: running
   Last run: 2026-01-16T10:30:00.000Z
   Next run: 2026-01-16T22:30:00.000Z
   Errors: 0

2. 💤 VC Data Research & Update
   Status: idle
   Last run: 2026-01-16T08:00:00.000Z
   Next run: 2026-01-17T08:00:00.000Z
   Errors: 0

... (3 more jobs)
```

### Stop the Worker

```bash
npm run worker:stop
```

## 📊 API Endpoints

### Get Worker Status

```bash
GET /api/worker/status
```

Returns current status of all background jobs.

**Response:**
```json
{
  "success": true,
  "status": {
    "running": true,
    "jobs": [
      {
        "id": "yc-trends-update",
        "name": "YC Trends Analysis",
        "status": "idle",
        "lastRun": "2026-01-16T10:30:00.000Z",
        "nextRun": "2026-01-16T22:30:00.000Z",
        "errorCount": 0
      }
    ]
  }
}
```

### Manually Trigger Jobs

```bash
POST /api/worker/trigger
Content-Type: application/json

{
  "jobType": "vc-research",
  "params": {
    "vcs": ["Sequoia Capital", "a16z", "Benchmark"]
  }
}
```

Available job types:
- `vc-research` - Research and update VC data
- `yc-trends` - Fetch and analyze latest YC batch
- `market-trends` - AI market analysis
- `data-validation` - Check data quality

## 🔧 Configuration

### Environment Variables

```bash
# Required for AI-powered features
OPENROUTER_API_KEY=sk-or-v1-...

# Required for web search (VC research)
TAVILY_API_KEY=tvly-...

# Optional: Override OpenRouter model
OPENROUTER_MODEL=meta-llama/llama-3.3-70b-instruct
```

### Customize Job Schedules

Edit `lib/background-worker.ts`:

```typescript
const DEFAULT_CONFIG: WorkerConfig = {
  enabled: true,
  jobs: [
    {
      id: 'vc-research-daily',
      name: 'VC Data Research & Update',
      interval: 24 * 60 * 60 * 1000, // 24 hours - CHANGE THIS
      priority: 8, // 1-10 scale
      // ...
    },
    // ... other jobs
  ],
}
```

## 📈 How It Works

### 1. VC Data Research

```
Every 24 hours:
1. Query database for VCs needing updates
   - Not updated in 30+ days
   - Missing thesis/check sizes
   - Recently added VCs

2. Web search for each VC
   - Investment thesis
   - Recent deals
   - Check sizes and stages
   - Portfolio companies

3. AI extraction
   - Parse search results
   - Extract structured data
   - Validate accuracy

4. Update database
   - Save verified information
   - Mark as updated
   - Log changes
```

### 2. YC Trends Analysis

```
Every 12 hours:
1. Determine current batch (W26, S26, etc.)

2. Fetch YC company data
   - YC API (primary)
   - Web scraping (fallback)
   - 200+ companies per batch

3. AI analysis
   - Hot sectors (AI, fintech, etc.)
   - Founder patterns (age, background)
   - Traction thresholds ($15K MRR avg)
   - Emerging signals

4. Update matching algorithm
   - Boost scores for trending sectors
   - Adjust founder profile weights
   - Update traction benchmarks
```

### 3. Market Trends Analysis

```
Every 6 hours:
1. OpenRouter AI analysis
   - Query latest market trends
   - Funding climate assessment
   - Sector analysis
   - Geographic trends

2. Extract insights
   - Hot sectors with growth rates
   - Emerging patterns
   - Key signals VCs want
   - Stage preferences

3. Store for matching
   - Cache insights
   - Use in VC recommendations
   - Inform founder suggestions
```

### 4. Data Validation

```
Every 12 hours:
1. Check for missing data
   - VCs without thesis
   - Invalid check sizes
   - Outdated information

2. Identify issues
   - Count problems
   - List affected VCs
   - Prioritize fixes

3. Report and log
   - Alert administrators
   - Schedule repairs
   - Track data quality
```

## 🎨 Features

### ✅ Intelligent Scheduling

- **Priority-based execution**: High-priority jobs run first
- **Error recovery**: Auto-retry with exponential backoff
- **Resource management**: Rate limiting to avoid API overload
- **Batch processing**: Updates multiple items efficiently

### ✅ AI-Powered

- **OpenRouter integration**: Use best LLMs for analysis
- **Web search**: Real-time data from Tavily
- **Smart extraction**: Pattern recognition for data parsing
- **Trend detection**: AI identifies emerging patterns

### ✅ Production-Ready

- **Graceful shutdown**: Handles SIGTERM/SIGINT properly
- **Error handling**: Comprehensive try-catch with logging
- **Performance monitoring**: Track job execution times
- **Database safety**: Prisma connection management

### ✅ Real-Time Accuracy

- **Always current**: Data updated automatically
- **Market-aware**: Follows latest trends and metas
- **Verified sources**: Uses official sources + web search
- **AI validation**: Cross-checks data accuracy

## 📊 Monitoring

### View Worker Logs

```bash
# If running in terminal
npm run worker:start
# Logs appear in real-time

# If running as background process
tail -f worker.log
```

### Check Data Quality

```bash
# Trigger validation manually
curl -X POST http://localhost:3000/api/worker/trigger \
  -H "Content-Type: application/json" \
  -d '{"jobType": "data-validation"}'
```

### Performance Metrics

The worker tracks:
- Job execution times
- Success/failure rates
- API call counts
- Data update statistics

## 🚨 Troubleshooting

### Worker Not Starting

**Issue**: `Worker already running` error

**Solution**:
```bash
npm run worker:stop
npm run worker:start
```

### Jobs Failing

**Issue**: Jobs show `error` status

**Check**:
1. Environment variables set? (`OPENROUTER_API_KEY`, `TAVILY_API_KEY`)
2. Database accessible?
3. Internet connection working?
4. API quotas exceeded?

**Fix**:
```bash
# Check status for error details
npm run worker:status

# Check logs
cat worker.log | grep ERROR
```

### Missing Updates

**Issue**: Data not updating

**Verify**:
```bash
# Check last run times
npm run worker:status

# Trigger job manually
curl -X POST http://localhost:3000/api/worker/trigger \
  -H "Content-Type: application/json" \
  -d '{"jobType": "vc-research"}'
```

## 🎯 Production Deployment

### Option 1: Run as a Service (Linux)

Create `/etc/systemd/system/foundermatch-worker.service`:

```ini
[Unit]
Description=FounderMatch Background Worker
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/foundermatch
ExecStart=/usr/bin/node /var/www/foundermatch/worker.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=DATABASE_URL=file:./prisma/dev.db
Environment=OPENROUTER_API_KEY=sk-or-v1-...
Environment=TAVILY_API_KEY=tvly-...

[Install]
WantedBy=multi-user.target
```

Start the service:
```bash
sudo systemctl enable foundermatch-worker
sudo systemctl start foundermatch-worker
sudo systemctl status foundermatch-worker
```

### Option 2: Docker Container

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

CMD ["node", "worker.js"]
```

Run:
```bash
docker build -t foundermatch-worker .
docker run -d --name worker \
  --env-file .env \
  foundermatch-worker
```

### Option 3: PM2 Process Manager

```bash
npm install -g pm2

# Start worker
pm2 start worker.js --name foundermatch-worker

# Monitor
pm2 status
pm2 logs foundermatch-worker

# Auto-restart on reboot
pm2 startup
pm2 save
```

## 🔐 Security

### API Access

Worker trigger endpoints require admin authentication:

```typescript
// Only admin can trigger jobs
const user = await getCurrentUser(false)
if (!user || user.email !== 'nohaxjustaura@gmail.com') {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

### Rate Limiting

Built-in delays prevent API abuse:

```typescript
await researchVCsBatch(vcs, {
  delayBetweenSearches: 3000, // 3 seconds
  maxConcurrent: 2, // Max 2 parallel requests
})
```

## 📚 Advanced Usage

### Custom Jobs

Add your own background jobs in `lib/background-worker.ts`:

```typescript
async function executeCustomJob(): Promise<void> {
  logger.info('WORKER', '🎯 Running custom job...')
  
  // Your logic here
  
  logger.info('WORKER', '✅ Custom job complete')
}

// Add to job configuration
{
  id: 'custom-job',
  name: 'My Custom Job',
  type: 'custom' as any,
  priority: 5,
  interval: 60 * 60 * 1000, // 1 hour
  status: 'idle',
  errorCount: 0,
  maxErrors: 3,
}
```

### Webhook Notifications

Get notified when jobs complete:

```typescript
// After job execution
await fetch('https://your-webhook-url.com/notify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    job: job.name,
    status: 'completed',
    timestamp: new Date(),
  }),
})
```

## 🎉 Summary

Your FounderMatch platform now has:

✅ **Fully automated data updates** - No manual work needed
✅ **AI-native intelligence** - Uses OpenRouter for analysis
✅ **Real-time accuracy** - Always current with latest trends
✅ **Production-ready** - Graceful shutdown, error recovery
✅ **Easy monitoring** - Status API + CLI tools
✅ **Scalable architecture** - Add custom jobs easily

The system runs **24/7** in the background, keeping your data fresh, accurate, and aligned with the latest market dynamics!

## 📞 Support

If you encounter issues:

1. Check logs: `npm run worker:status`
2. Review configuration: `lib/background-worker.ts`
3. Verify environment variables: `.env.local`
4. Test manually: `npm run worker:trigger`

---

**Last Updated**: January 16, 2026
**Version**: 1.0.0
**Status**: Production Ready ✅
