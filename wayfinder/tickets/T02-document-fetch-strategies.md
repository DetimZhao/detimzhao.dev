---
id: T02
title: Document per-source fetch strategies
labels:
  - wayfinder:research
status: open
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
