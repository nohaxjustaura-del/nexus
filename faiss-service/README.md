# FAISS VC Ranking Service

Fast similarity search service for matching pitches with VCs using FAISS.

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

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

The service will run on `http://localhost:8001`

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
