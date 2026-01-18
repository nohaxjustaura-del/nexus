"""
Build FAISS index from VC embeddings
This script reads embeddings and builds a FAISS index file
"""

import json
import faiss
import numpy as np
from pathlib import Path

# File paths
BASE_DIR = Path(__file__).parent.parent
EMBEDDINGS_PATH = BASE_DIR / "faiss-data" / "embeddings.json"
VC_DATA_PATH = BASE_DIR / "faiss-data" / "vcs_embedding_inputs_trimmed.json"
INDEX_PATH = BASE_DIR / "faiss-data" / "vc_index.faiss"

def main():
    print("Building FAISS index...")
    
    # Load embeddings
    if not EMBEDDINGS_PATH.exists():
        print(f"Error: Embeddings file not found: {EMBEDDINGS_PATH}")
        print("Please run: npm run build-faiss-index")
        return
    
    print(f"Loading embeddings from {EMBEDDINGS_PATH}")
    with open(EMBEDDINGS_PATH, "r") as f:
        embeddings = json.load(f)
    
    if not embeddings or len(embeddings) == 0:
        print("Error: No embeddings found")
        return
    
    # Get dimension from first embedding
    dimension = len(embeddings[0])
    num_vectors = len(embeddings)
    
    print(f"Found {num_vectors} embeddings with dimension {dimension}")
    
    # Convert to numpy array
    embeddings_array = np.array(embeddings, dtype="float32")
    
    # Normalize embeddings for cosine similarity
    faiss.normalize_L2(embeddings_array)
    
    # Create FAISS index (Inner Product for cosine similarity after normalization)
    index = faiss.IndexFlatIP(dimension)
    
    # Add vectors to index
    print("Adding vectors to index...")
    index.add(embeddings_array)
    
    # Save index
    print(f"Saving index to {INDEX_PATH}")
    faiss.write_index(index, str(INDEX_PATH))
    
    print(f"✅ FAISS index built successfully!")
    print(f"   - Dimension: {dimension}")
    print(f"   - Vectors: {index.ntotal}")
    print(f"   - Index file: {INDEX_PATH}")

if __name__ == "__main__":
    main()