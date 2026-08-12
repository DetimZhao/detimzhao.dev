#!/usr/bin/env python3
"""Generate a small mock corpus (~10 items) for dev/testing.
Produces data/corpus.json.gz + data/corpus.vec.f32.

Runs in ~1 second. No network. No sentence-transformers.
Usage:  python tools/generate_mock_corpus.py --out data/
"""

import argparse
import gzip
import hashlib
import json
from pathlib import Path

import numpy as np

DIM = 384
SEED = 42

ITEMS = [
    {"name": "king",       "source": "terminology", "source_url": None,      "description": "A male monarch or sovereign ruler of a kingdom."},
    {"name": "man",        "source": "terminology", "source_url": None,      "description": "An adult human male."},
    {"name": "woman",      "source": "terminology", "source_url": None,      "description": "An adult human female."},
    {"name": "queen",      "source": "terminology", "source_url": None,      "description": "A female monarch or sovereign ruler of a kingdom."},
    {"name": "transformer","source": "huggingface", "source_url": "https://huggingface.co/google-bert/bert-base-uncased", "description": "A neural network architecture that processes sequential data using self-attention instead of recurrence or convolution."},
    {"name": "attention",  "source": "terminology", "source_url": None,      "description": "A mechanism that allows neural networks to focus on relevant parts of input data by computing weighted sums."},
    {"name": "diffusion",  "source": "huggingface", "source_url": "https://huggingface.co/stabilityai/stable-diffusion-2-1", "description": "A generative model that creates data by iteratively denoising random noise through learned reverse diffusion steps."},
    {"name": "RAG",        "source": "huggingface", "source_url": "https://huggingface.co/docs/transformers/model_doc/rag", "description": "Retrieval-Augmented Generation — a technique combining retrieval from a knowledge base with text generation."},
    {"name": "retrieval",  "source": "terminology", "source_url": None,      "description": "The process of finding and returning relevant documents or passages from a collection given a query."},
    {"name": "generation", "source": "terminology", "source_url": None,      "description": "The process of producing new text or content from a model, often conditioned on input context."},
    {"name": "neural",     "source": "wikipedia",   "source_url": "https://en.wikipedia.org/wiki/Neural_network", "description": "A computing system inspired by biological neural networks that learns from examples to recognize patterns."},
    {"name": "backprop",   "source": "wikipedia",   "source_url": "https://en.wikipedia.org/wiki/Backpropagation", "description": "The primary algorithm for training neural networks by computing gradients of the loss function via the chain rule."},
]

def make_id(name, source):
    slug = name.lower().replace(" ", "_").replace("-", "_")
    return f"{source}-{slug}"

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default="data")
    args = parser.parse_args()
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    rng = np.random.default_rng(SEED)
    N = len(ITEMS)
    vecs = rng.normal(0, 1, (N, DIM)).astype(np.float32)

    # Hand-craft: queen ≈ king - man + woman
    name_to_idx = {item["name"]: i for i, item in enumerate(ITEMS)}
    ki = name_to_idx["king"]
    mi = name_to_idx["man"]
    wi = name_to_idx["woman"]
    qi = name_to_idx["queen"]
    vecs[qi] = vecs[ki] - vecs[mi] + vecs[wi] + rng.normal(0, 0.1, DIM).astype(np.float32)

    # Normalize all vectors
    norms = np.linalg.norm(vecs, axis=1, keepdims=True)
    norms[norms == 0] = 1
    vecs = vecs / norms

    # PCA-3
    mean = vecs.mean(axis=0)
    centered = vecs - mean
    U, S, Vt = np.linalg.svd(centered, full_matrices=False)
    components = Vt[:3]
    projected = (centered @ components.T)
    variance_explained = (S[:3] ** 2 / (S ** 2).sum()).tolist()

    # Scale to ±10
    max_abs = np.abs(projected).max()
    if max_abs > 0:
        projected = projected / max_abs * 10

    # Cosine similarity matrix and top-5 NN
    sim = vecs @ vecs.T
    nn = []
    for i in range(N):
        scores = [(j, float(sim[i, j])) for j in range(N) if j != i]
        scores.sort(key=lambda x: -x[1])
        top5 = scores[:5]
        nn.append([{"name": ITEMS[j]["name"], "score": round(score, 3)} for j, score in top5])

    # Build items
    items = []
    for i, item in enumerate(ITEMS):
        items.append({
            "id": make_id(item["name"], item["source"]),
            "name": item["name"],
            "source": item["source"],
            "source_url": item["source_url"],
            "description": item["description"],
            "pos": [round(float(projected[i, 0]), 4), round(float(projected[i, 1]), 4), round(float(projected[i, 2]), 4)],
            "nn": nn[i],
        })

    # Build output
    data = {
        "items": items,
        "pca": {
            "mean": [round(float(x), 6) for x in mean],
            "components": [[round(float(x), 6) for x in comp] for comp in components],
        },
        "model": {
            "id": "all-MiniLM-L6-v2",
            "corpus_version": "mock-1.0",
            "corpus_size": N,
            "variance_explained": [round(float(v), 4) for v in variance_explained],
            "vec_sha256": "",
        },
    }

    # Write corpus.json.gz
    json_bytes = json.dumps(data, ensure_ascii=False).encode("utf-8")
    path_json = out / "corpus.json.gz"
    with gzip.open(path_json, "wb", compresslevel=9) as f:
        f.write(json_bytes)

    # Write corpus.vec.f32
    path_vec = out / "corpus.vec.f32"
    vec_bytes = vecs.tobytes()
    with open(path_vec, "wb") as f:
        f.write(vec_bytes)

    # Compute and embed SHA-256 of vec file
    sha = hashlib.sha256(vec_bytes).hexdigest()
    data["model"]["vec_sha256"] = sha
    json_bytes = json.dumps(data, ensure_ascii=False).encode("utf-8")
    with gzip.open(path_json, "wb", compresslevel=9) as f:
        f.write(json_bytes)

    print(f"Wrote {N} items to {out}/")
    print(f"  corpus.json.gz  — {path_json.stat().st_size:,} bytes")
    print(f"  corpus.vec.f32  — {path_vec.stat().st_size:,} bytes")
    print(f"  vec_sha256      — {sha}")
    print(f"  PCA variance    — {[f'{v*100:.1f}%' for v in variance_explained]}")

    # Verify: king - man + woman should have queen as top-1 NN
    result = vecs[ki] - vecs[mi] + vecs[wi]
    result = result / np.linalg.norm(result)
    scores = [(i, float(result @ vecs[i])) for i in range(N)]
    scores.sort(key=lambda x: -x[1])
    top = scores[0]
    print(f"\nVerify 'king - man + woman':")
    print(f"  top-1 NN = {ITEMS[top[0]]['name']} (cos={top[1]:.4f})")
    for name, score in [(ITEMS[i]["name"], s) for i, s in scores[:5]]:
        print(f"    {name.ljust(14)} {score:.4f}")

if __name__ == "__main__":
    main()
