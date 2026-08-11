---
id: T01
title: Verify redistribution rights and attribution rules
labels:
  - wayfinder:research
status: closed
assignee: null
blocked_by: []
blocks: []
---

## Question

What are the redistribution rights, attribution requirements, and rate limits for these three sources?

1. **HuggingFace model cards** (most-downloaded models, accessed via hf.co API)
2. **arXiv cs.CL + cs.LG abstracts** (top-cited, accessed via arXiv API)
3. **Wikipedia articles** in Machine Learning, Deep Learning, NLP, Computer Vision, Reinforcement Learning categories (accessed via Wikipedia REST API or dumps)

For each source:

- (a) Is redistribution of embedded corpus data (text → vector, PCA-projected positions, metadata) allowed?
- (b) What attribution must appear in `data/SOURCES.md` and/or on the public site?
- (c) What rate limits apply to bulk fetching?
- (d) Is there an explicit API ToS that restricts automated fetching or redistribution?

Produce: `data/SOURCES.md` template with required attribution fields, and a per-source summary of fetch rules.

## Research context

Findings at [`wayfinder/research/T01-verify-redistribution-rights.md`](../research/T01-verify-redistribution-rights.md).

Summary: all five sources allow redistribution with specific constraints — HF requires per-model license checking (filter to permissive-only), arXiv is CC0 (no restriction), Wikipedia requires corpus be licensed as CC BY-SA 4.0, PyTorch/scikit-learn are BSD 3-Clause with attribution. API access is explicitly allowed by all sources.

## Resolution

All five sources permit redistribution of embedded/derived data. The key constraints:

- **HuggingFace**: filter model cards to permissive-license models only (Apache 2.0, MIT, CC). Attribution: "Model card text from HuggingFace, © respective authors."
- **arXiv**: CC0 — no restrictions, no attribution required but recommend citing the arXiv API.
- **Wikipedia**: corpus must be licensed as CC BY-SA 4.0; attribute "Wikipedia contributors, CC BY-SA 4.0" with article links.
- **PyTorch**: BSD 3-Clause, retain the license notice.
- **scikit-learn**: BSD 3-Clause, retain the license notice.
- All sources explicitly allow programmatic API access.

The `data/SOURCES.md` template is in the research findings file at [`wayfinder/research/T01-verify-redistribution-rights.md`](../research/T01-verify-redistribution-rights.md).
