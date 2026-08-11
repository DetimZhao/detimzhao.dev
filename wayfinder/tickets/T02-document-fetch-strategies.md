---
id: T02
title: Document per-source fetch strategies
labels:
  - wayfinder:research
status: closed
assignee: null
blocked_by: []
blocks: []
---

## Question

Document the exact fetch strategy for each source — API endpoints, pagination, rate-limit handling, and approximate expected response sizes.

1. **HuggingFace Hub**: what endpoint returns most-downloaded models? How are model card descriptions fetched (text extraction from model card markdown/HTML)? Pagination pattern? Rate limits?
2. **Wikipedia**: best approach for ML/DL category content — the pageviews API, category API, or bulk XML dumps? What's the reasonable subset size for ~1k items?
3. **arXiv**: what query parameters target cs.CL + cs.LG, sorted by citation count? Pagination? Rate limits? What's returned (abstract only, or full metadata)?
4. **PyTorch/sklearn docs**: best approach — the GitHub source for docstrings, or web-scraping the rendered docs?
5. **NLP/CV/RL terminology lists**: are there existing curated term lists we can use (e.g., from domain glossaries) vs needing to generate from the above sources?

Output: a per-source technical doc suitable as the implementation guide for `tools/generate_corpus.py`.

## Research context

Findings at [`wayfinder/research/T02-document-fetch-strategies.md`](../research/T02-document-fetch-strategies.md).

Summary: specific API endpoints, pagination, and rate limits documented for all five sources. Key facts: HF Hub uses `/api/models?sort=downloads&direction=-1` with cursor pagination (500-1000 calls/5min); arXiv uses `cat:cs.CL` filter with `start`/`max_results` (2000/req, 1 req/3 sec); Wikipedia uses `categorymembers` API (500/req, cursor pagination, 200 req/min unauth'd); PyTorch/scikit-learn best via `git clone` + docstring extraction; terminology lists exist in Wikipedia glossaries + scikit-learn glossary.

## Resolution

Full fetch strategy documented per source at [`wayfinder/research/T02-document-fetch-strategies.md`](../research/T02-document-fetch-strategies.md). Key implementation facts:

- **HF Hub**: `/api/models?sort=downloads&direction=-1&limit=100`, cursor via `Link` header, README via `https://huggingface.co/{model_id}/resolve/main/README.md`. Auth token recommended (rate limit bump).
- **arXiv**: `http://export.arxiv.org/api/query?search_query=cat:cs.CL&start=0&max_results=2000`, 1 req/3 sec minimum, 30000 total items max. No citation-count sort.
- **Wikipedia**: `categorymembers` API with `cmtitle=Category:Machine_learning&cmtype=page`, 500/req, continue via `cmcontinue`, 200 req/min unauth'd.
- **PyTorch/scikit-learn**: `git clone https://github.com/pytorch/pytorch.git` + `git clone https://github.com/scikit-learn/scikit-learn.git`, then parse Python docstrings from source. Both are permissive (BSD).
- **Terminology**: Wikipedia AI/ML glossary pages exist (CC BY-SA); scikit-learn glossary (BSD); arXiv cs.CL/cs.LG metadata (CC0).
