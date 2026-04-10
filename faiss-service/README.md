# FAISS VC Ranking Service

Fast similarity search service for matching pitches with VCs using FAISS.

## Setup

1. Install dependencies (from repo root you can run `npm run faiss:install`, or from this folder):
```bash
python -m pip install -r requirements.txt
```
This installs **`faiss-cpu`**, which provides the `import faiss` module on Windows and macOS/Linux without a GPU build.

2. Ensure FAISS data files exist:
   - `../faiss-data/vc_index.faiss`
   - `../faiss-data/vcs_embedding_inputs_trimmed.json`

## Running

Start the service:
```bash
python faiss_api.py
```

Or with uvicorn:
```bash
uvicorn faiss_api:app --host 0.0.0.0 --port 8001 --reload
```

The service defaults to `http://localhost:8001`. If you see **“10048 … address … normally permitted”** (Windows) or “address already in use”, another process is bound to that port—stop the other `faiss_api` / uvicorn, or run with a custom port:

```bash
# PowerShell
$env:FAISS_SERVICE_PORT=8002; python faiss_api.py
```

Then set `FAISS_SERVICE_URL=http://localhost:8002` in `.env.local` (Next.js).

## Railway / Docker

`faiss-data/*` is **gitignored** (large binaries). The image from `Dockerfile.faiss` only includes whatever is in the repo, so **`vc_index.faiss` is missing** unless you supply it at runtime.

1. Build artifacts locally: `npm run build-faiss-index` (requires DB + Voyage; see repo root scripts).
2. Create an archive (paths inside the tar can be nested; bootstrap finds the files by name):

```bash
# from repo root, after build
tar -czf faiss-bundle.tar.gz -C faiss-data vc_index.faiss vcs_embedding_inputs_trimmed.json
```

3. Upload `faiss-bundle.tar.gz` to a host that Railway can reach (S3/R2/Supabase Storage with a stable HTTPS URL, or a signed URL).
4. In the Railway **nexus** (FAISS) service, set:

| Variable | Purpose |
|----------|---------|
| `FAISS_DATA_ARCHIVE_URL` | HTTPS URL to the `.tar.gz` |
| `FAISS_DATA_DOWNLOAD_TOKEN` | Optional `Authorization: Bearer …` if the URL is private |

**Or** set both `FAISS_VC_INDEX_URL` and `FAISS_VC_JSON_URL` to direct file URLs.

On start, `bootstrap_faiss_data.py` runs before uvicorn and downloads into `/app/faiss-data`.

## API Endpoints

### POST /rank
Rank VCs based on a pitch embedding.

Request:
```json
{
  "pitch_embedding": [0.1, 0.2, ...],
  "top_k": 20
}
```

Response:
```json
[
  {
    "id": "vc_id",
    "firm_name": "Firm Name",
    "similarity": 0.95,
    "metadata": {
      "stages": ["Seed", "Series A"],
      "sectors": ["AI", "SaaS"],
      "geography": ["US"],
      "check_size": {...},
      "investor_type": "VC"
    }
  }
]
```

### GET /health
Health check endpoint.

### GET /vc-count
Get total number of VCs in the index.
