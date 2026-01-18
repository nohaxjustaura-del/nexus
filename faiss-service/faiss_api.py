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


class RankRequest(BaseModel):
    pitch_embedding: List[float]
    top_k: int = 20


class RankedVC(BaseModel):
    id: str
    firm_name: str
    similarity: float
    metadata: Dict[str, Any]


def load_data():
    """Load FAISS index and VC data"""
    global vc_index, vc_rows
    
    if vc_index is not None and vc_rows is not None:
        return  # Already loaded
    
    if not VC_INDEX_PATH.exists():
        raise FileNotFoundError(f"VC index not found: {VC_INDEX_PATH}")
    if not VC_DATA_PATH.exists():
        raise FileNotFoundError(f"VC data not found: {VC_DATA_PATH}")
    
    # Load FAISS index
    print(f"Loading FAISS index from {VC_INDEX_PATH}")
    vc_index = faiss.read_index(str(VC_INDEX_PATH))
    
    # Load VC data
    print(f"Loading VC data from {VC_DATA_PATH}")
    vc_rows = []
    with open(VC_DATA_PATH, "r", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                vc_rows.append(json.loads(line))
    
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
    return {
        "status": "healthy",
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
    if vc_index is None or vc_rows is None:
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
        top_k = min(request.top_k, vc_index.ntotal)
        scores, indices = vc_index.search(pitch_vec, top_k)
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] FAISS search error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"FAISS search failed: {str(e)}"
        )
    
    # Build results
    results = []
    for rank, (idx, score) in enumerate(zip(indices[0], scores[0]), start=1):
        if idx < len(vc_rows):
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
    
    return results


@app.get("/vc-count")
async def get_vc_count():
    """Get total number of VCs in the index"""
    if vc_index is None:
        load_data()
    return {"count": len(vc_rows) if vc_rows else 0}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
