# T01 — Verify Redistribution Rights

> Research date: 2026-08-11
> Every claim cites the specific URL/section of the primary source.

---

## 1. HuggingFace Model Cards

### (a) Redistribution of embedded/derived corpus data?

**Conditional yes — depends on each model card's individual license.**

- HF ToS § "Your Content" states: *"When Content contains notice of a reasonable and customary license, (such as an open source license) such Content is intended to remain under the terms of such license when further accessed, distributed, or used. Neither party is permitted to remove reference to any such license."*
  — https://huggingface.co/terms-of-service
- Public repos grant all Users *"a perpetual, irrevocable, worldwide, royalty-free, non-exclusive license to use, display, publish, reproduce, distribute, and make derivative works of your Content through our Services and functionalities."*
  — https://huggingface.co/terms-of-service § "Your Content"
- Model cards / READMEs are "Community Content" as defined in the Content Policy.
  — https://huggingface.co/content-policy § "Content types"
- Most popular models carry permissive open-source licenses (Apache 2.0, MIT, CC-BY, etc.) that permit derivation and redistribution. Embedding text as vectors is a transformative/derivative use. **Each model's license must be checked individually.**
- The HuggingFace Hub API is explicitly intended for programmatic access. http://huggingface.co/docs/hub/api

**Verdict:** YES for models under permissive open-source licenses. Check each model's license tag before inclusion. Do not include models under restrictive or no-license terms.

### (b) Required attribution

Must preserve the original license notice per HF ToS. Model card content carries its own license; attribution should point to the source model card URL. No HF-specific attribution required by HF's ToS, but standard practice is to cite source.

### (c) Rate limits

| Tier | API (per 5 min) | Resolvers (per 5 min) | Pages (per 5 min) |
|------|--------------------|--------------------------|----------------------|
| Anonymous | 500 | 3,000 | 100 |
| Free user | 1,000 | 5,000 | 200 |
| PRO | 2,500 | 12,000 | 400 |

— https://huggingface.co/docs/hub/rate-limits § "Rate limit Tiers"

All quotas over 5-minute fixed windows. 429 response with `RateLimit` header when exceeded.

### (d) Explicit prohibition on scraping/automated access?

**No.** The Hub API is documented and intended for programmatic access. No prohibition on automated fetching through the sanctioned API endpoints. Rate limits are the primary governance mechanism.

---

## 2. arXiv cs.CL + cs.LG Abstracts

### (a) Redistribution of embedded/derived corpus data?

**YES — metadata (including abstracts) is CC0 (public domain).**

- *"A Creative Commons CC0 1.0 Universal Public Domain Dedication will apply to all metadata."*
  — https://info.arxiv.org/help/license/index.html § "Metadata license"
- *"You are free to use descriptive metadata about arXiv e-prints under the terms of the Creative Commons Universal (CC0 1.0) Public Domain Declaration."*
  — https://info.arxiv.org/help/api/tou.html § "Terms of Use for arXiv APIs"
- Descriptive metadata includes: *"title, abstract, authors, identifiers, and classification terms."*
  — https://info.arxiv.org/help/api/tou.html footnote 1

**Important distinction:** Full-text PDFs and source files are NOT CC0 — they are under the license chosen by the submitter (mostly arXiv non-exclusive license, some CC BY). Redistributing full-text content requires checking the individual paper's license.

**Verdict:** YES for abstracts and metadata (CC0). Embedding abstracts and redistributing the derived vectors is freely permitted without restriction.

### (b) Required attribution

arXiv API page states: *"We do request that you acknowledge arXiv data usage with this statement: 'Thank you to arXiv for use of its open access interoperability.'"*
— https://info.arxiv.org/help/api/index.html § "For all API users"

Also from the API index page: *"Acknowledge arXiv data usage with this statement on your product: 'Thank you to arXiv for use of its open access interoperability.'"*

Since metadata is CC0, attribution is not legally required but is requested by arXiv as a courtesy.

### (c) Rate limits

- **Legacy API (including the standard arXiv API):** *"make no more than one request every three seconds, and limit requests to a single connection at a time."*
  — https://info.arxiv.org/help/api/tou.html § "Rate limits"
- Bulk data alternatives available via S3 (full text) and Kaggle (metadata).
  — https://info.arxiv.org/help/bulk_data/index.html

### (d) Explicit prohibition on scraping/automated access?

**No.** The API is explicitly provided for automated access. The API ToU lists "Things that you can (and should!) do" including *"Retrieve, store, transform, and share descriptive metadata."* It also lists "Things that you must not do" including *"Store and serve arXiv e-prints (PDFs, source files, or other content) from your servers, unless you have the permission of the copyright holder"* — but bulk metadata/abstract redistribution is explicitly permitted.
— https://info.arxiv.org/help/api/tou.html § "Things that you can (and should!) do"

---

## 3. Wikipedia Articles

### (a) Redistribution of embedded/derived corpus data?

**YES — with conditions (copyleft).**

- Wikipedia text is licensed under **CC BY-SA 4.0** and **GFDL**.
  — https://en.wikipedia.org/wiki/Wikipedia:Copyrights § "Reusers' rights and obligations"
- The ToU § 7.8 states: *"When modifying or making additions to text that you have obtained from a Project Website, you agree to license the modified or added content under CC BY-SA 4.0 or later."*
  — https://foundation.wikimedia.org/wiki/Policy:Terms_of_Use § 7.8
- *"For each copy or modified version that you distribute, you agree to include a licensing notice stating which license the work is released under, along with either a hyperlink or URL to the text of the license or a copy of the license itself."*
  — https://foundation.wikimedia.org/wiki/Policy:Terms_of_Use § 7.8
- Embeddings are a transformative/derivative work of CC BY-SA text. Under copyleft, derivative works must be licensed under the same terms (CC BY-SA 4.0). The embedded corpus should carry CC BY-SA 4.0.

**Verdict:** YES, provided the embedded corpus is licensed under CC BY-SA 4.0 with proper attribution. The copyleft requirement likely attaches to the embedding vectors as a derivative work.

### (b) Required attribution

From the ToU § 7.7, attribution may be provided via:
1. *"Through hyperlink (where possible) or URL to the page or pages that you are reusing"*
2. *"Through hyperlink (where possible) or URL to an alternative, stable online copy that is freely accessible, which conforms with the license, and which provides credit to the authors"*
3. *"Through a list of all authors (but please note that any list of authors may be filtered to exclude very small or irrelevant contributions)"*

Also required: *"clearly indicate that the original work has been modified"* and include a licensing notice with link to CC BY-SA 4.0 license text.

In practice: link to each source article URL + state the corpus is CC BY-SA 4.0.
— https://foundation.wikimedia.org/wiki/Policy:Terms_of_Use § 7.7, 7.8

### (c) Rate limits

Per https://www.mediawiki.org/wiki/Wikimedia_APIs/Rate_limits § "Limits" (enforced per-minute, new in 2026):

| Client type | Limit (req/min) |
|-------------|-------------------|
| Unidentified (IP only) | 10 |
| User-Agent only (unauthenticated bots) | 200 |
| Authenticated (new users) | 200 |
| Authenticated (established editors) | 2,000 |
| Bots with bot flag | Exempt |

Also: best practice per https://www.mediawiki.org/wiki/API:Etiquette — make requests in series (not parallel), use `maxlag` parameter, set meaningful User-Agent header. Bulk data also available via https://dumps.wikimedia.org/.

### (d) Explicit prohibition on scraping/automated access?

**Not prohibited, but regulated.** The ToU § 4 prohibits *"Engaging in automated uses of the Project Websites that are abusive or disruptive of the services, violate acceptable usage policies where available, or have not been approved by the Wikimedia community"* and *"Disrupting the services by placing an undue burden on an API."*
— https://foundation.wikimedia.org/wiki/Policy:Terms_of_Use § 4

API access is explicitly supported and documented. Rate limits are the primary governance mechanism. Using the official API with proper User-Agent and respecting rate limits is permitted. Bulk dumps are preferred for large-scale access.

---

## 4. PyTorch Documentation (pytorch.org/docs)

### (a) Redistribution of embedded/derived data?

**YES.** PyTorch is licensed under the BSD 3-Clause license.
— https://github.com/pytorch/pytorch/blob/main/LICENSE

BSD 3-Clause permits redistribution and use in source and binary forms with or without modification, provided the copyright notice, conditions, and disclaimer are retained.

### (b) Required attribution

Must retain the copyright notice: *"Copyright (c) 2016- Facebook, Inc (Adam Paszke)"* and the full BSD license text from the LICENSE file. No endorsement clause.

### (c) Rate limits

No specific rate limits documented for pytorch.org. Standard web scraping etiquette applies. Documentation is also available via the GitHub repository for bulk cloning.

### (d) Explicit prohibition on scraping?

No. Documentation is open source and freely accessible.

---

## 5. scikit-learn Documentation (scikit-learn.org)

### (a) Redistribution of embedded/derived data?

**YES.** scikit-learn is licensed under BSD 3-Clause.
— https://github.com/scikit-learn/scikit-learn/blob/main/COPYING
— https://scikit-learn.org/stable/about.html (footer: "BSD License")

### (b) Required attribution

Must retain the copyright notice: *"Copyright (c) 2007-2026 The scikit-learn developers."* and the full BSD license text. No endorsement clause.

### (c) Rate limits

No specific rate limits documented. Standard web scraping etiquette applies. Documentation source is available in the GitHub repo.

### (d) Explicit prohibition on scraping?

No. Documentation is open source and freely accessible.

---

## data/SOURCES.md Template

```markdown
# Sources

This corpus contains embedded data derived from the following sources.
Each entry records the source, its license, and attribution requirements.

## HuggingFace Model Cards

- **Source:** https://huggingface.co/models
- **Content:** Model card text (READMEs/descriptions) from most-downloaded models
- **License:** Varies per model (indicated in each model's repository). Only models
  under permissive open-source licenses (Apache 2.0, MIT, BSD, CC-BY, etc.)
  are included.
- **Attribution:** Original model card URL and license preserved per entry.
  No HF-specific attribution required by HF ToS.
- **ToS:** https://huggingface.co/terms-of-service
- **API:** https://huggingface.co/docs/hub/api
- **Rate limits:** https://huggingface.co/docs/hub/rate-limits

## arXiv Abstracts

- **Source:** https://arxiv.org
- **Content:** Abstracts and metadata from cs.CL and cs.LG categories
- **License:** CC0 1.0 Universal (Public Domain Dedication) for metadata/abstracts
  - https://info.arxiv.org/help/license/index.html (Metadata license section)
- **Attribution:** "Thank you to arXiv for use of its open access interoperability."
  - https://info.arxiv.org/help/api/index.html
- **API ToS:** https://info.arxiv.org/help/api/tou.html
- **Rate limits:** 1 request per 3 seconds, single connection

## Wikipedia Articles

- **Source:** https://en.wikipedia.org
- **Content:** Articles from Machine Learning, Deep Learning, NLP, Computer Vision,
  Reinforcement Learning categories
- **License:** CC BY-SA 4.0 (and GFDL)
  - https://en.wikipedia.org/wiki/Wikipedia:Copyrights
  - https://foundation.wikimedia.org/wiki/Policy:Terms_of_Use § 7
- **Attribution:** Link to each source article URL. This embedded corpus is itself
  licensed under CC BY-SA 4.0 as a derivative work.
  - CC BY-SA 4.0: https://creativecommons.org/licenses/by-sa/4.0/
- **API:** https://www.mediawiki.org/wiki/API:Main_page
- **API Etiquette:** https://www.mediawiki.org/wiki/API:Etiquette
- **Rate limits:** https://www.mediawiki.org/wiki/Wikimedia_APIs/Rate_limits

## PyTorch Documentation

- **Source:** https://pytorch.org/docs/stable/
- **Content:** Documentation text
- **License:** BSD 3-Clause
  - https://github.com/pytorch/pytorch/blob/main/LICENSE
- **Attribution:** Copyright (c) 2016- Facebook, Inc (Adam Paszke) et al.
  Full license text at https://github.com/pytorch/pytorch/blob/main/LICENSE

## scikit-learn Documentation

- **Source:** https://scikit-learn.org/stable/
- **Content:** Documentation text
- **License:** BSD 3-Clause
  - https://github.com/scikit-learn/scikit-learn/blob/main/COPYING
- **Attribution:** Copyright (c) 2007-2026 The scikit-learn developers.
  Full license text at https://github.com/scikit-learn/scikit-learn/blob/main/COPYING

---

## Corpus License

The embedding vectors, PCA-projected 3D positions, and metadata in this corpus
are a derivative work. The overall corpus is licensed under CC BY-SA 4.0,
incorporating the attribution and license terms of each source as described above.

- CC BY-SA 4.0: https://creativecommons.org/licenses/by-sa/4.0/

Portions derived from arXiv metadata are CC0 (public domain).
Portions derived from PyTorch and scikit-learn documentation are BSD 3-Clause.
```

---

## Summary Matrix

| Source | Redistribute? | Key License | Rate Limit | Scraping OK? |
|--------|--------------|-------------|------------|--------------|
| HF Model Cards | YES (permissive-license models only) | Per-model (Apache 2.0, MIT, etc.) | 1,000 API/5 min (free) | Yes (API) |
| arXiv Abstracts | YES (CC0) | CC0 (metadata) | 1 req / 3 sec | Yes (API) |
| Wikipedia Articles | YES (corpus must be CC BY-SA 4.0) | CC BY-SA 4.0 | 200 req/min (auth) | Yes (API, rate-limited) |
| PyTorch Docs | YES | BSD 3-Clause | None specified | Yes |
| scikit-learn Docs | YES | BSD 3-Clause | None specified | Yes |

## Open Questions / Risk Items

1. **Wikipedia embeddings as derivative works:** Whether vector embeddings of CC BY-SA text constitute a "derivative work" triggering copyleft is legally untested. The conservative approach (adopted here) is to license the embedded corpus as CC BY-SA 4.0. A more aggressive interpretation could argue embeddings are purely factual/non-creative transformations — but this has not been tested in court.
2. **HF model card license heterogeneity:** Each model card has its own license. Need to filter only to permissive-license models at corpus generation time. Some popular models use RAIL or other custom licenses — these need individual review.
3. **arXiv abstract vs. full-text distinction:** Only metadata (including abstracts) is CC0. If we ever extend to full-text, we must use S3 bulk access and respect per-paper licenses.
