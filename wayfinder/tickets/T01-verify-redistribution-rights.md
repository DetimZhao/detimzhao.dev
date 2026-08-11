---
id: T01
title: Verify redistribution rights and attribution rules
labels:
  - wayfinder:research
status: open
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
