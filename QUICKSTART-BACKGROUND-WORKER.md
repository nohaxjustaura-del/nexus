# 🚀 Background Worker - 5 Minute Setup

Get your automated data update system running in **5 minutes or less**.

## ⚡ Quick Start (Choose Your Method)

### Option 1: Windows (Double-Click)

1. **Double-click** `start-worker.bat`
2. That's it! ✅

### Option 2: Linux/Mac (Terminal)

```bash
./start-worker.sh
```

### Option 3: NPM Command (Any OS)

```bash
npm run worker:start
```

## ✅ What You'll See

When the worker starts successfully:

```
🚀 Starting background worker system...
📋 Jobs configured: 5

▶️  Running job: YC Trends Analysis (priority: 9)
📊 Starting YC trends analysis...
🎯 Fetching W26 batch data...
📈 Analyzing 203 companies from W26...
✅ YC trends updated: W26 batch analyzed

▶️  Running job: VC Data Research & Update (priority: 8)
🔍 Starting VC research job...
📋 Updating 20 VCs: Sequoia Capital, a16z, Benchmark...
✅ VC research complete: 20 VCs updated

⏰ Scheduled YC Trends Analysis for 2026-01-16T22:30:00.000Z
⏰ Scheduled VC Data Research & Update for 2026-01-17T10:30:00.000Z

✅ Background worker started successfully
💡 Press Ctrl+C to stop the worker
```

## 🔧 Required Setup (One-Time)

### 1. Environment Variables

Create or edit `.env.local`:

```bash
# Required for AI analysis
OPENROUTER_API_KEY=sk-or-v1-...

# Required for web search
TAVILY_API_KEY=tvly-...

# Database (already configured)
DATABASE_URL=file:./prisma/dev.db
```

**Get API Keys:**

- **OpenRouter**: https://openrouter.ai/keys (FREE tier available)
- **Tavily**: https://tavily.com (FREE tier available)

### 2. Install Dependencies (If Not Already)

```bash
npm install
```

## 📊 Check Status

### Method 1: CLI

```bash
npm run worker:status
```

### Method 2: API

```bash
curl http://localhost:3000/api/worker/status
```

Expected output:
```json
{
  "success": true,
  "status": {
    "running": true,
    "jobs": [...]
  }
}
```

## 🛑 Stop the Worker

### Method 1: Terminal
Press `Ctrl+C` in the terminal where worker is running

### Method 2: Command
```bash
npm run worker:stop
```

## 🎯 What Does It Update?

The worker automatically keeps these fresh:

| Data | Update Frequency | What It Does |
|------|-----------------|--------------|
| **VC Information** | Every 24 hours | Researches investment thesis, check sizes, recent deals |
| **YC Trends** | Every 12 hours | Analyzes latest batch, identifies hot sectors |
| **Market Trends** | Every 6 hours | AI analysis of funding climate, emerging patterns |
| **Embeddings** | Every 24 hours | Rebuilds semantic search for accurate matching |
| **Data Validation** | Every 12 hours | Checks accuracy, finds missing information |

## 🔍 Troubleshooting

### "Worker already running"

**Solution:**
```bash
npm run worker:stop
npm run worker:start
```

### "OPENROUTER_API_KEY not set"

**Solution:**
1. Create `.env.local` file
2. Add: `OPENROUTER_API_KEY=sk-or-v1-...`
3. Restart worker

### "Tavily not available"

**Solution:**
1. Add to `.env.local`: `TAVILY_API_KEY=tvly-...`
2. Restart worker

**Note**: Worker will run without Tavily, but VC research will be limited.

### Jobs showing "error" status

**Check logs:**
```bash
npm run worker:status
```

Look for `errorCount` and check terminal output for details.

## 🎨 Customize Schedule

Want to run jobs more/less frequently?

Edit `lib/background-worker.ts`:

```typescript
jobs: [
  {
    id: 'vc-research-daily',
    name: 'VC Data Research & Update',
    interval: 24 * 60 * 60 * 1000, // ← Change this (milliseconds)
    // ...
  },
]
```

Examples:
- Every hour: `60 * 60 * 1000`
- Every 6 hours: `6 * 60 * 60 * 1000`
- Every day: `24 * 60 * 60 * 1000`
- Every week: `7 * 24 * 60 * 60 * 1000`

## 🚀 Production Deployment

### Run as Background Service (Windows)

Use `npm run worker:background` or create a Windows service with `nssm`:

```bash
# Install NSSM
# Download from: https://nssm.cc

# Create service
nssm install FounderMatchWorker "C:\Program Files\nodejs\node.exe" "C:\path\to\foundermatch\worker.js"
nssm start FounderMatchWorker
```

### Run as Daemon (Linux)

Create systemd service:

```bash
sudo nano /etc/systemd/system/foundermatch-worker.service
```

Add:
```ini
[Unit]
Description=FounderMatch Background Worker
After=network.target

[Service]
Type=simple
WorkingDirectory=/path/to/foundermatch
ExecStart=/usr/bin/node /path/to/foundermatch/worker.js
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Start:
```bash
sudo systemctl enable foundermatch-worker
sudo systemctl start foundermatch-worker
```

### Run with PM2

```bash
# Install PM2
npm install -g pm2

# Start worker
pm2 start worker.js --name foundermatch-worker

# Save config
pm2 save

# Auto-restart on reboot
pm2 startup
```

## 📈 Monitor Performance

### Real-Time Logs

```bash
# If running in terminal
# Logs appear automatically

# If running as service
tail -f worker.log  # Linux/Mac
type worker.log     # Windows
```

### API Status Check

```bash
# Check all jobs
curl http://localhost:3000/api/worker/status

# Trigger job manually
curl -X POST http://localhost:3000/api/worker/trigger \
  -H "Content-Type: application/json" \
  -d '{"jobType": "yc-trends"}'
```

## 🎉 You're All Set!

Your FounderMatch platform now has:

✅ **Automated data updates** - Runs 24/7 in background
✅ **AI-powered research** - Uses OpenRouter + web search  
✅ **Real-time accuracy** - Always current with latest trends  
✅ **Zero maintenance** - Set it and forget it  

The worker will keep your data fresh automatically. You can forget about manual updates!

## 📚 Next Steps

- Read full documentation: `REAL-TIME-DATA-SYSTEM.md`
- Customize job schedules: `lib/background-worker.ts`
- Add custom jobs: See advanced usage guide
- Set up production deployment: Choose systemd/PM2/Docker

---

**Need Help?**

1. Check logs: `npm run worker:status`
2. Review docs: `REAL-TIME-DATA-SYSTEM.md`
3. Verify environment: `.env.local`

**Last Updated**: January 16, 2026
