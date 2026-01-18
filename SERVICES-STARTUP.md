# 🚀 Services Startup Guide

Your FounderMatch platform requires **3 services** to run:

---

## Service 1: Next.js Dev Server (Required)

**What**: Main website  
**Port**: 3000  
**Status**: ⚠️ Must be running

### Start:
```bash
npm run dev
```

### Test:
Visit: http://localhost:3000

---

## Service 2: FAISS Semantic Search (Required for Smart Matching)

**What**: AI-powered VC ranking  
**Port**: 8001  
**Status**: ⚠️ Required for pitch analysis

### Start:

**Windows:**
```bash
# Double-click:
start-faiss.bat

# Or run:
npm run faiss:start
```

**Mac/Linux:**
```bash
./start-faiss.sh

# Or:
npm run faiss:start
```

### Test:
```bash
# Visit:
http://localhost:8001/health

# Should return:
{"status": "ok"}
```

### Troubleshooting:

**"Python not found"**
- Install Python 3.8+: https://python.org

**"Module faiss not found"**
```bash
cd faiss-service
pip install -r requirements.txt
```

**"Port 8001 already in use"**
```bash
# Windows:
netstat -ano | findstr :8001
taskkill /PID [PID] /F

# Mac/Linux:
lsof -ti:8001 | xargs kill -9
```

---

## Service 3: Background Worker (Optional)

**What**: Auto-updates data  
**Status**: 🟢 Optional but recommended

### Start:
```bash
npm run worker:start
```

### Test:
```bash
npm run worker:status
```

---

## Quick Start All Services

### Terminal 1: Next.js
```bash
npm run dev
```

### Terminal 2: FAISS
```bash
npm run faiss:start
```

### Terminal 3: Worker (optional)
```bash
npm run worker:start
```

---

## Service Status Dashboard

| Service | Port | Status | Check |
|---------|------|--------|-------|
| Next.js | 3000 | 🔴 | http://localhost:3000 |
| FAISS | 8001 | 🔴 | http://localhost:8001/health |
| Worker | - | 🔴 | `npm run worker:status` |

---

## Environment Variables Needed

### Minimum (for basic functionality):
```bash
DATABASE_URL=file:./prisma/dev.db
GEMINI_API_KEY=AIza...
```

### For Video Analysis:
```bash
OPENAI_API_KEY=sk-proj-...  # Whisper transcription
```

### For Background Worker:
```bash
OPENROUTER_API_KEY=sk-or-v1-...  # AI analysis
TAVILY_API_KEY=tvly-...          # Web search
```

---

## Common Issues

### 1. Video Pitch Analysis Fails

**Error**: "Incorrect API key provided"

**Fix**: Add real OpenAI key to `.env.local`:
```bash
OPENAI_API_KEY=sk-proj-YOUR_REAL_KEY
```

### 2. Smart Matching Not Working

**Error**: "FAISS service unavailable"

**Fix**: Start FAISS service:
```bash
npm run faiss:start
```

### 3. Port Already in Use

**Next.js (3000)**:
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID [PID] /F

# Mac/Linux
lsof -ti:3000 | xargs kill -9
```

**FAISS (8001)**:
```bash
# Windows
netstat -ano | findstr :8001
taskkill /PID [PID] /F

# Mac/Linux
lsof -ti:8001 | xargs kill -9
```

---

## Production Deployment

### Option 1: PM2 (Recommended)

```bash
# Install PM2
npm install -g pm2

# Start all services
pm2 start npm --name "foundermatch-web" -- run start
pm2 start faiss-service/faiss_api.py --name "foundermatch-faiss" --interpreter python3
pm2 start worker.js --name "foundermatch-worker"

# Save and auto-restart on reboot
pm2 save
pm2 startup
```

### Option 2: Systemd (Linux)

Create 3 service files in `/etc/systemd/system/`:

**foundermatch-web.service:**
```ini
[Unit]
Description=FounderMatch Web
After=network.target

[Service]
WorkingDirectory=/var/www/foundermatch
ExecStart=/usr/bin/npm start
Restart=always

[Install]
WantedBy=multi-user.target
```

**foundermatch-faiss.service:**
```ini
[Unit]
Description=FounderMatch FAISS
After=network.target

[Service]
WorkingDirectory=/var/www/foundermatch/faiss-service
ExecStart=/usr/bin/python3 faiss_api.py
Restart=always

[Install]
WantedBy=multi-user.target
```

**foundermatch-worker.service:**
```ini
[Unit]
Description=FounderMatch Worker
After=network.target

[Service]
WorkingDirectory=/var/www/foundermatch
ExecStart=/usr/bin/node worker.js
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable foundermatch-web foundermatch-faiss foundermatch-worker
sudo systemctl start foundermatch-web foundermatch-faiss foundermatch-worker
```

---

## Health Checks

```bash
# Next.js
curl http://localhost:3000

# FAISS
curl http://localhost:8001/health

# Worker
npm run worker:status
```

---

**All services running?** ✅ You're ready to go!
