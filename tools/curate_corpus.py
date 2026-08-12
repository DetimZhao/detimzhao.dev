#!/usr/bin/env python3
"""Curate the corpus: drop all arXiv paper-title entries.

Loads the existing corpus, removes every item whose source is "arxiv",
reindexes the kept vectors in kept order (embeddings unchanged), recomputes
top-10 nearest neighbors among the kept set only, and rewrites the corpus
files.

The PCA transform is preserved EXACTLY - it is NOT refit. The kept items'
3D positions and the Phase 2 shared-basis contract (user embeddings project
into the same basis) depend on that transform staying stable.

Only numpy + stdlib (hashlib/gzip/json) are required; runs in seconds.

Usage:  python tools/curate_corpus.py --out data/
"""

import argparse
import gzip
import hashlib
import json
import logging
from pathlib import Path

import numpy as np

log = logging.getLogger(__name__)

EMBEDDING_DIM = 384
NN_K = 10
DROPPED_SOURCE = "arxiv"


def load_corpus(corpus_path):
    with gzip.open(corpus_path, "rt", encoding="utf-8") as f:
        data = json.load(f)
    return data.get("items", []), data.get("pca", {}), data.get("model", {})


def compute_nn(normed, name_lookup, k=NN_K):
    sim = normed @ normed.T
    np.fill_diagonal(sim, -1.0)
    nn_list = []
    for i in range(len(normed)):
        top_indices = np.argsort(-sim[i])[:k]
        nn_list.append([
            {"name": name_lookup[idx], "score": round(float(sim[i][idx]), 4)}
            for idx in top_indices
        ])
    return nn_list


def main():
    parser = argparse.ArgumentParser(description="Curate corpus: drop arXiv entries")
    parser.add_argument("--out", default="data/", help="Output directory")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s", datefmt="%H:%M:%S")

    out_dir = Path(args.out)
    corpus_path = out_dir / "corpus.json.gz"
    vec_path = out_dir / "corpus.vec.f32"

    items, pca_meta, model_meta = load_corpus(corpus_path)
    total = len(items)
    vectors = np.fromfile(vec_path, dtype=np.float32).reshape(total, EMBEDDING_DIM)
    log.info("Loaded %d items, vectors %s", total, vectors.shape)

    assert total == vectors.shape[0], "item count and vector rows disagree"

    # Keep everything except arXiv; preserve kept order so indices stay aligned
    kept_indices = [i for i, item in enumerate(items) if item.get("source") != DROPPED_SOURCE]
    kept_items = [items[i] for i in kept_indices]
    kept_vectors = vectors[kept_indices]
    dropped = total - len(kept_items)
    log.info("Dropping %d %s items; keeping %d", dropped, DROPPED_SOURCE, len(kept_items))

    # Recompute nn among kept set only (old nn lists referenced dropped items)
    norms = np.linalg.norm(kept_vectors, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    normed = kept_vectors / norms
    name_lookup = [it["name"] for it in kept_items]
    log.info("Recomputing nearest neighbors among %d kept items", len(kept_items))
    nn_list = compute_nn(normed, name_lookup)
    for item, nns in zip(kept_items, nn_list):
        item["nn"] = nns

    # Update model metadata
    model_meta["corpus_count"] = len(kept_items)
    model_meta["corpus_size"] = len(kept_items)

    # Recompute integrity hash from the filtered vector bytes
    vec_bytes = kept_vectors.astype(np.float32).tobytes()
    model_meta["vec_sha256"] = hashlib.sha256(vec_bytes).hexdigest()

    output = {
        "items": kept_items,
        "pca": pca_meta,
        "model": model_meta,
    }

    log.info("Writing corpus.json.gz ...")
    with gzip.open(corpus_path, "wt", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, separators=(",", ":"))

    log.info("Writing corpus.vec.f32 (%d × %d) ...", len(kept_items), EMBEDDING_DIM)
    with open(vec_path, "wb") as f:
        f.write(vec_bytes)

    size_mb = corpus_path.stat().st_size / (1024 * 1024)
    log.info("Done. %d items, corpus.json.gz: %.2f MB", len(kept_items), size_mb)
    log.info("vec_sha256: %s", model_meta["vec_sha256"])


if __name__ == "__main__":
    main()
