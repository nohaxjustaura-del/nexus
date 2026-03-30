"""
FAISS-based VC Ranking API
Fast similarity search for matching pitches with VCs
"""
import json
import os
from pathlib import Path
from typing import List, Dict, Any
import faiss
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# File paths
BASE_DIR = Path(__file__).parent.parent
VC_INDEX_PATH = BASE_DIR / "faiss-data" / "vc_index.faiss"
VC_DATA_PATH = BASE_DIR / "faiss-data" / "vcs_embedding_inputs_trimmed.json"

app = FastAPI(title="FAISS VC Ranking Service")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your Next.js domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global cache for loaded data
vc_index = None
vc_rows = None
# (index mtime, json mtime) — when either file changes on disk, reload
_loaded_signature: tuple[float, float] | None = None


def _auto_reload_enabled() -> bool:
    return os.environ.get("FAISS_DISABLE_AUTO_RELOAD", "").strip().lower() not in (
        "1",
        "true",
        "yes",
    )


def _data_files_signature() -> tuple[float, float]:
    if not VC_INDEX_PATH.exists():
        raise FileNotFoundError(f"VC index not found: {VC_INDEX_PATH}")
    if not VC_DATA_PATH.exists():
        raise FileNotFoundError(f"VC data not found: {VC_DATA_PATH}")
    return (
        VC_INDEX_PATH.stat().st_mtime,
        VC_DATA_PATH.stat().st_mtime,
    )


class RankRequest(BaseModel):
    pitch_embedding: List[float]
    top_k: int = 20


class RankedVC(BaseModel):
    id: str
    firm_name: str
    similarity: float
    metadata: Dict[str, Any]


def load_data(force: bool = False):
    """Load FAISS index and VC data. Reloads when index/json files change (unless FAISS_DISABLE_AUTO_RELOAD=1)."""
    global vc_index, vc_rows, _loaded_signature

    sig = _data_files_signature()
    if (
        not force
        and _auto_reload_enabled()
        and vc_index is not None
        and vc_rows is not None
        and _loaded_signature == sig
    ):
        return
    if not force and not _auto_reload_enabled() and vc_index is not None and vc_rows is not None:
        return

    # Load FAISS index
    tag = " (reload)" if vc_index is not None else ""
    print(f"Loading FAISS index from {VC_INDEX_PATH}{tag}")
    vc_index = faiss.read_index(str(VC_INDEX_PATH))
    
    # Load VC data
    print(f"Loading VC data from {VC_DATA_PATH}")
    vc_rows = []
    with open(VC_DATA_PATH, "r", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                vc_rows.append(json.loads(line))
    
    _loaded_signature = sig
    print(f"Loaded {len(vc_rows)} VC profiles and index with {vc_index.ntotal} vectors")


@app.on_event("startup")
async def startup_event():
    """Load data on startup"""
    try:
        load_data()
        print("[OK] FAISS service ready")
    except Exception as e:
        print(f"[ERROR] Error loading FAISS data: {e}")
        raise


@app.get("/health")
async def health():
    """Health check endpoint"""
    load_data()
    sig = _loaded_signature
    return {
        "status": "healthy",
        "vc_count": len(vc_rows) if vc_rows else 0,
        "index_size": vc_index.ntotal if vc_index else 0,
        "auto_reload": _auto_reload_enabled(),
        "index_path": str(VC_INDEX_PATH),
        "data_path": str(VC_DATA_PATH),
        "files_mtime": {
            "vc_index.faiss": sig[0] if sig else None,
            "vcs_embedding_inputs_trimmed.json": sig[1] if sig else None,
        },
    }


@app.post("/reload")
async def reload_index():
    """Force reload index + VC rows from disk (same as detecting file mtime change)."""
    load_data(force=True)
    return {
        "ok": True,
        "vc_count": len(vc_rows) if vc_rows else 0,
        "index_size": vc_index.ntotal if vc_index else 0,
    }


@app.post("/rank", response_model=List[RankedVC])
async def rank_vcs(request: RankRequest):
    """
    Rank VCs based on pitch embedding similarity using FAISS
    
    Args:
        request: Contains pitch embedding vector and top_k
        
    Returns:
        List of ranked VCs with similarity scores
    """
    load_data()

    if not request.pitch_embedding:
        raise HTTPException(status_code=400, detail="pitch_embedding is required")
    
    try:
        # Convert embedding to numpy array
        pitch_vec = np.array(request.pitch_embedding, dtype="float32").reshape(1, -1)
        
        # Check dimension mismatch
        embedding_dim = pitch_vec.shape[1]
        index_dim = vc_index.d
        
        if embedding_dim != index_dim:
            error_msg = f"Embedding dimension mismatch: received {embedding_dim}, expected {index_dim}. The FAISS index was built with {index_dim}-dimensional embeddings (likely OpenAI text-embedding-3-large), but current code uses {embedding_dim}-dimensional embeddings (Gemini text-embedding-004). To fix: regenerate FAISS index with 'npm run generate-vc-embeddings' or use matching embedding model."
            print(f"[ERROR] {error_msg}")
            raise HTTPException(
                status_code=400, 
                detail=error_msg
            )
        
        # Normalize for cosine similarity
        faiss.normalize_L2(pitch_vec)
        
        # Search in FAISS index
        ntotal = int(vc_index.ntotal)
        requested_k = int(request.top_k)
        top_k = min(requested_k, ntotal)
        scores, indices = vc_index.search(pitch_vec, top_k)
        raw_idx = indices[0].tolist()
        invalid_idx = sum(1 for i in raw_idx if i < 0)
        print(
            f"[FAISS] /rank search: index_vectors={ntotal} json_rows={len(vc_rows)} "
            f"requested_top_k={requested_k} effective_k={top_k} invalid_index_slots={invalid_idx}"
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] FAISS search error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"FAISS search failed: {str(e)}"
        )
    
    # Build results (skip out-of-range indices; should not happen if index/json stay in sync)
    results = []
    skipped_oob = 0
    for rank, (idx, score) in enumerate(zip(indices[0], scores[0]), start=1):
        if idx < 0:
            continue
        if idx >= len(vc_rows):
            skipped_oob += 1
            continue
        vc = vc_rows[idx]
        meta = vc.get("metadata", {})

        # Extract ID (use firm name as fallback)
        vc_id = vc.get("id") or vc.get("firm_name", f"vc_{idx}").lower().replace(" ", "_")

        results.append(RankedVC(
            id=vc_id,
            firm_name=vc.get("firm_name", "Unknown"),
            similarity=float(score),
            metadata={
                "stages": meta.get("stages", []),
                "sectors": meta.get("sectors", []),
                "geography": meta.get("geography", []),
                "check_size": meta.get("check_size", {}),
                "investor_type": meta.get("investor_type", "N/A"),
                "thesis": vc.get("thesis", ""),
            }
        ))

    print(
        f"[FAISS] /rank response: neighbors_built={len(results)} skipped_oob_index={skipped_oob}"
    )

    return results


@app.get("/vc-count")
async def get_vc_count():
    """Get total number of VCs in the index"""
    load_data()
    return {"count": len(vc_rows) if vc_rows else 0}


def _ensure_tcp_port_available(host: str, port: int) -> None:
    """Fail fast with a clear message if the port is already in use (e.g. Windows Errno 10048)."""
    import socket

    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        s.bind((host, port))
    except OSError as e:
        print(
            f"[ERROR] Port {port} is already in use ({e}). "
            "Stop the other process (often another FAISS / uvicorn on 8001), or run on a different port, e.g.:\n"
            f"  PowerShell:  $env:FAISS_SERVICE_PORT=8002; python faiss_api.py\n"
            f"  Then set in .env.local: FAISS_SERVICE_URL=http://localhost:8002"
        )
        raise SystemExit(1) from e
    finally:
        s.close()


if __name__ == "__main__":
    import uvicorn

    _host = os.environ.get("FAISS_SERVICE_HOST", "0.0.0.0").strip() or "0.0.0.0"
    _port = int(os.environ.get("FAISS_SERVICE_PORT", "8001"))

    _ensure_tcp_port_available(_host, _port)

    print(f"[FAISS] Listening on http://{_host}:{_port} (set FAISS_SERVICE_PORT to change)")
    uvicorn.run(app, host=_host, port=_port)
