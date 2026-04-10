#!/usr/bin/env python3
"""
Ensure FAISS artifacts exist under /app/faiss-data before uvicorn starts.

faiss-data/* is gitignored (large binaries), so Docker/Railway images do not
contain vc_index.faiss by default. Set one of:

  FAISS_DATA_ARCHIVE_URL — HTTPS URL to a .tar.gz containing:
      vc_index.faiss
      vcs_embedding_inputs_trimmed.json
    (any directory layout inside the archive is OK)

  FAISS_VC_INDEX_URL + FAISS_VC_JSON_URL — direct URLs to each file.

Optional FAISS_DATA_DOWNLOAD_TOKEN: sent as Authorization: Bearer <token>.
"""
from __future__ import annotations

import os
import shutil
import sys
import tarfile
import tempfile
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

DATA_DIR = Path("/app/faiss-data")
VC_INDEX = DATA_DIR / "vc_index.faiss"
VC_JSON = DATA_DIR / "vcs_embedding_inputs_trimmed.json"


def _headers() -> dict[str, str]:
    token = os.environ.get("FAISS_DATA_DOWNLOAD_TOKEN", "").strip()
    if not token:
        return {}
    return {"Authorization": f"Bearer {token}"}


def _download_bytes(url: str) -> bytes:
    req = Request(url, headers=_headers())
    with urlopen(req, timeout=600) as resp:
        return resp.read()


def _download_file(url: str, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(_download_bytes(url))


def _find_file(root: Path, name: str) -> Path | None:
    for p in root.rglob(name):
        if p.is_file():
            return p
    return None


def _extract_tar_gz(data: bytes) -> None:
    with tempfile.TemporaryDirectory() as tmp:
        tpath = Path(tmp) / "bundle.tar.gz"
        tpath.write_bytes(data)
        extract_root = Path(tmp) / "out"
        extract_root.mkdir()
        with tarfile.open(tpath, "r:gz") as tf:
            if hasattr(tarfile, "data_filter"):
                tf.extractall(extract_root, filter=tarfile.data_filter)
            else:
                tf.extractall(extract_root)

        idx = _find_file(extract_root, "vc_index.faiss")
        jsn = _find_file(extract_root, "vcs_embedding_inputs_trimmed.json")
        if not idx or not jsn:
            raise FileNotFoundError(
                "Archive must contain vc_index.faiss and vcs_embedding_inputs_trimmed.json"
            )

        DATA_DIR.mkdir(parents=True, exist_ok=True)
        shutil.copy2(idx, VC_INDEX)
        shutil.copy2(jsn, VC_JSON)


def main() -> int:
    if VC_INDEX.is_file() and VC_JSON.is_file():
        return 0

    archive_url = os.environ.get("FAISS_DATA_ARCHIVE_URL", "").strip()
    index_url = os.environ.get("FAISS_VC_INDEX_URL", "").strip()
    json_url = os.environ.get("FAISS_VC_JSON_URL", "").strip()

    try:
        if archive_url:
            print("[bootstrap] Downloading FAISS_DATA_ARCHIVE_URL ...", flush=True)
            _extract_tar_gz(_download_bytes(archive_url))
        elif index_url and json_url:
            print("[bootstrap] Downloading FAISS_VC_INDEX_URL / FAISS_VC_JSON_URL ...", flush=True)
            _download_file(index_url, VC_INDEX)
            _download_file(json_url, VC_JSON)
        else:
            print(
                "[bootstrap] Missing FAISS files under /app/faiss-data.\n"
                "They are not in git (see .gitignore). On Railway set either:\n"
                "  FAISS_DATA_ARCHIVE_URL - tar.gz containing both artifact files (any paths)\n"
                "  or FAISS_VC_INDEX_URL + FAISS_VC_JSON_URL\n"
                "Build locally: npm run build-faiss-index",
                file=sys.stderr,
            )
            return 1
    except (HTTPError, URLError, OSError, tarfile.TarError) as e:
        print(f"[bootstrap] Download/extract failed: {e}", file=sys.stderr)
        return 1

    if not VC_INDEX.is_file() or not VC_JSON.is_file():
        print(
            f"[bootstrap] Expected {VC_INDEX} and {VC_JSON} after bootstrap - not found.",
            file=sys.stderr,
        )
        return 1

    print("[bootstrap] FAISS data ready.", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
