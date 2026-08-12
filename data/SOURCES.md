# Sources

This corpus contains embedded data derived from the following sources.
Each entry records the source, its license, and attribution requirements.

For the full legal analysis, see `wayfinder/research/T01-verify-redistribution-rights.md`.

## HuggingFace Model Cards

- **Source:** https://huggingface.co/models
- **Content:** Model card text (descriptions, tags) from most-downloaded models
- **License:** Varies per model; only models under permissive open-source licenses
  (Apache 2.0, MIT, BSD, CC-BY, etc.) are included.
- **Attribution:** Original model card URL and per-model license preserved per entry.
  No HF-specific attribution required by HF ToS.
- **API:** https://huggingface.co/docs/hub/api
- **Rate limits:** https://huggingface.co/docs/hub/rate-limits

## arXiv Abstracts

- **Source:** https://arxiv.org
- **Content:** Abstracts and metadata from cs.CL and cs.LG categories
- **License:** CC0 1.0 Universal (Public Domain Dedication) for metadata/abstracts.
  Redistribution of derived vectors is freely permitted without restriction.
  — https://info.arxiv.org/help/license/index.html
- **Attribution:** arXiv requests acknowledgment:
  "Thank you to arXiv for use of its open access interoperability."
  — https://info.arxiv.org/help/api/index.html

## Wikipedia Articles

- **Source:** https://en.wikipedia.org
- **Content:** Articles from Machine Learning, Deep Learning, NLP, Computer Vision,
  and Reinforcement Learning categories
- **License:** CC BY-SA 4.0 (and GFDL)
  — https://en.wikipedia.org/wiki/Wikipedia:Copyrights
- **Attribution:** Link to each source article URL is preserved per entry. The
  embedded corpus is itself licensed under CC BY-SA 4.0 as a derivative work.
  You must indicate the original work has been modified.
  — https://creativecommons.org/licenses/by-sa/4.0/

## PyTorch Documentation

- **Source:** https://pytorch.org/docs/stable/
- **Content:** API reference terminology and descriptions
- **License:** BSD 3-Clause
  — https://github.com/pytorch/pytorch/blob/main/LICENSE
- **Attribution:** Copyright (c) 2016- Facebook, Inc (Adam Paszke) et al.
  Must retain the copyright notice, BSD license conditions, and disclaimer.

## scikit-learn Documentation

- **Source:** https://scikit-learn.org/stable/
- **Content:** API reference terminology and descriptions
- **License:** BSD 3-Clause
  — https://github.com/scikit-learn/scikit-learn/blob/main/COPYING
- **Attribution:** Copyright (c) 2007-2026 The scikit-learn developers.
  Must retain the copyright notice, BSD license conditions, and disclaimer.

## Terminology Lists

- **Source:** Curated by the project authors
- **Content:** NLP, Computer Vision, and Reinforcement Learning glossary terms
  with definitions
- **License:** No copyright (facts and terminology definitions). These are
  uncopyrightable facts and short descriptions written by the corpus authors.

## Corpus License

The embedding vectors, PCA-projected 3D positions, and metadata in this corpus
are a derivative work. The overall corpus is licensed under **CC BY-SA 4.0**,
incorporating the attribution and license terms of each source as described above.

- CC BY-SA 4.0: https://creativecommons.org/licenses/by-sa/4.0/

Portions derived from arXiv metadata are CC0 (public domain).
Portions derived from PyTorch and scikit-learn documentation are BSD 3-Clause.
