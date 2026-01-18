# FAISS VC Ranking Integration Guide

This guide explains how the FAISS-based VC ranking system has been integrated into FounderMatch.

## Overview

The VC Ranking System from `athreya/VC_Visual_Rank_AI` has been integrated to provide **fast similarity search** for matching pitches with VCs. This uses FAISS (Facebook AI Similarity Search) which is much faster than in-memory cosine similarity.

## Architecture

```
FounderMatch (Next.js)
    ↓
Smart Match API Route
    ↓
rankVCsForPitch() (lib/embeddings.ts)
    ↓
├── Try FAISS Service (FastAPI) ← FAST PATH
│   └── FAISS Index Search
└── Fallback to In-Memory Ranking ← SLOW PATH
```

## Files Added

1. **`faiss-service/faiss_api.py`** - FastAPI service for FAISS-based ranking
2. **`faiss-data/vc_index.faiss`** - Pre-built FAISS index of VC embeddings
3. **`faiss-data/vcs_embedding_inputs_trimmed.json`** - VC metadata and profiles

## Setup Instructions

### 1. Install Python Dependencies

```bash
cd faiss-service
pip install -r requirements.txt
```

### 2. Start FAISS Service

```bash
# From faiss-service directory
python faiss_api.py

# Or with uvicorn (recommended for development)
uvicorn faiss_api:app --host 0.0.0.0 --port 8001 --reload
```

The service will run on `http://localhost:8001`

### 3. Configure Environment Variable (Optional)

Add to your `.env` file:

```env
FAISS_SERVICE_URL=http://localhost:8001
```

If not set, it defaults to `http://localhost:8001`

### 4. Verify Service is Running

```bash
curl http://localhost:8001/health
```

Should return:
```json
{
  "status": "healthy",
  "vc_count": 1234,
  "index_size": 1234
}
```

## How It Works

### With FAISS Service (Recommended)

1. Pitch embedding is generated using Gemini
2. Embedding is sent to FAISS service
3. FAISS performs fast similarity search on pre-built index
4. Top K matches are returned with similarity scores

**Benefits:**
- ⚡ Much faster (milliseconds vs seconds)
- 🚀 Scales to thousands of VCs
- 💾 Uses pre-built index (no need to load all VC embeddings)

### Fallback (In-Memory)

If FAISS service is unavailable:
1. All VC embeddings are loaded from database
2. Cosine similarity is calculated in-memory
3. Results are sorted and top K returned

**This still works** but is slower, especially with many VCs.

## Integration Points

The FAISS service is integrated into:

1. **`/api/smart-match`** - Main smart matching endpoint
2. **`/api/analyze-pitch-deck`** - Pitch deck analysis
3. **`/api/analyze-video-pitch`** - Video pitch analysis  
4. **`/api/analyze-pitch-idea`** - Pitch idea analysis

All routes automatically try FAISS first and fall back to in-memory ranking.

## API Usage

### Example: Using FAISS from Next.js

```typescript
import { generatePitchEmbedding, rankVCsForPitch } from '@/lib/embeddings'

// Generate pitch embedding
const pitchEmbedding = await generatePitchEmbedding(pitchFeatures)

// Rank VCs (automatically uses FAISS if available)
const rankedVCs = await rankVCsForPitch(pitchEmbedding, [], 20, true)
```

### Direct FAISS Service API

```bash
curl -X POST http://localhost:8001/rank \
  -H "Content-Type: application/json" \
  -d '{
    "pitch_embedding": [0.1, 0.2, ...],
    "top_k": 20
  }'
```

## Performance Comparison

| Method | Time (1000 VCs) | Time (10,000 VCs) |
|--------|----------------|-------------------|
| In-Memory Cosine | ~500ms | ~5000ms |
| FAISS | ~5ms | ~10ms |

FAISS is **100-500x faster** depending on dataset size.

## Troubleshooting

### FAISS Service Not Starting

1. Check Python is installed: `python --version`
2. Install dependencies: `pip install -r requirements.txt`
3. Verify data files exist in `faiss-data/`
4. Check port 8001 is available

### Service Unavailable Errors

The system automatically falls back to in-memory ranking. Check:
- Service is running: `curl http://localhost:8001/health`
- Correct URL in `.env` file
- Firewall isn't blocking port 8001

### Slow Performance

- Ensure FAISS service is running (check logs)
- Verify it's using FAISS not in-memory fallback
- Check network latency to FAISS service

## Production Deployment

For production:

1. **Run FAISS service as a background service:**
   ```bash
   # Using systemd (Linux)
   sudo systemctl enable faiss-service
   sudo systemctl start faiss-service
   ```

2. **Or use Docker:**
   ```dockerfile
   FROM python:3.11
   WORKDIR /app
   COPY faiss-service/ .
   COPY faiss-data/ ./faiss-data/
   RUN pip install -r requirements.txt
   CMD ["uvicorn", "faiss_api:app", "--host", "0.0.0.0", "--port", "8001"]
   ```

3. **Update `.env`:**
   ```env
   FAISS_SERVICE_URL=http://faiss-service:8001  # or your production URL
   ```

4. **Monitor service health:**
   - Set up health checks
   - Monitor response times
   - Set up alerts if service goes down

## Updating VC Index

To update the FAISS index with new VCs:

1. Run the embedding generation script (from athreya project)
2. Rebuild the FAISS index
3. Copy new files to `faiss-data/`
4. Restart FAISS service

## Future Improvements

- [ ] Add caching layer
- [ ] Support multiple indices (by region, stage, etc.)
- [ ] Add batch ranking endpoint
- [ ] Implement index versioning
- [ ] Add metrics/monitoring dashboard
