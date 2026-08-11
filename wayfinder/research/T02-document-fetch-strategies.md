# T02: Document Fetch Strategies — Per-Source Technical Reference

> Generated from primary API documentation sources.
> Every claim cites the specific official docs URL.

---

## 1. HuggingFace Hub API

**Primary docs:**
- OpenAPI spec: <https://huggingface.co/.well-known/openapi.md>
- Rate limits: <https://huggingface.co/docs/hub/en/rate-limits>
- Hub API overview: <https://huggingface.co/docs/hub/en/api>

### 1.1 List most-downloaded models

**Endpoint:** `GET https://huggingface.co/api/models`

**Parameters** (from OpenAPI spec, models listing endpoint):

| Param       | Type    | Description |
|-------------|---------|-------------|
| `search`    | string  | Text search query |
| `author`    | string  | Filter by author/org |
| `filter`    | string  | Filter by tags (e.g. library, task) |
| `sort`      | string  | `downloads`, `likes`, `lastModified`, `trendingScore`, `likes30d`, `_id` |
| `direction` | integer | `-1` for descending, `1` for ascending |
| `limit`     | integer | Max results per page |
| `cursor`    | string  | Pagination cursor from `Link` header |
| `full`      | boolean | Return full model info (siblings, cardData, etc.) |
| `expand`    | string  | Display specific fields |

**Fetch top N by downloads:** `GET /api/models?sort=downloads&direction=-1&limit=N&full=true`

**Pagination:** Cursor-based via `Link` response header. Pass the cursor value as `cursor` query param for next page.

### 1.2 Fetch model card (README)

**Endpoint (resolver):** `GET https://huggingface.co/{namespace}/{repo}/resolve/main/README.md`

This follows redirects (302) to the CDN-hosted file. Referenced in the rate-limits docs as the "Resolvers" bucket, documented in OpenAPI spec under "Resolve a file".

**Alternative (model metadata):** `GET /api/models/{namespace}/{repo}` returns model card structured data (including description, tags, downloads, likes, etc.) but not the full Markdown text.

**`huggingface_hub` SDK equivalent:** `HfApi().model_info(repo_id)` for metadata; `huggingface_hub.hf_hub_download()` for the README file.

### 1.3 Pagination

Cursor-based. The `Link` HTTP response header contains the next page URL. Extract the `cursor` query parameter from it and pass it as the `cursor` parameter in the next request.

### 1.4 Rate Limits

**Source:** <https://huggingface.co/docs/hub/en/rate-limits>

All quotas over 5-minute fixed windows. Three buckets:

| Plan                    | API calls/5min | Resolvers/5min | Pages/5min |
|-------------------------|---------------|----------------|------------|
| Anonymous (per IP)      | 500           | 3,000          | 100        |
| Free user               | 1,000         | 5,000          | 200        |
| PRO user                | 2,500         | 12,000         | 400        |

When rate-limited, a `429 Too Many Requests` response is returned with `RateLimit` and `RateLimit-Policy` headers implementing the IETF draft spec.

**Recommendation for `generate_corpus.py`:** Always pass `HF_TOKEN` environment variable. This moves from anonymous (500/5min) to free user (1,000/5min API calls).

### 1.5 Authentication

Not required for read-only access to public models. However, passing an API token dramatically increases rate limits. Obtain token at: <https://huggingface.co/settings/tokens>

### 1.6 Response Format

JSON. Example model entry fields (with `full=true`): `id`, `modelId`, `author`, `sha`, `lastModified`, `private`, `gated`, `disabled`, `downloads`, `likes`, `pipeline_tag`, `tags`, `siblings` (file list), `cardData` (structured README metadata), `config` (model config).

### 1.7 Estimated Throughput

- Anonymous: 500 API calls per 5 minutes = ~1.7 calls/second
- Free user: 1,000 API calls per 5 minutes = ~3.3 calls/second
- Each `/api/models` call returns one page; page size defined by `limit`
- README resolutions count against the "Resolvers" bucket (higher limits)

---

## 2. arXiv API

**Primary docs:**
- User Manual: <https://info.arxiv.org/help/api/user-manual.html>
- API Basics: <https://info.arxiv.org/help/api/basics.html>
- Terms of Use: <https://info.arxiv.org/help/api/tou.html>

### 2.1 Query parameters for cs.CL and cs.LG

**Base URL:** `http://export.arxiv.org/api/query`

Use the `cat:` search field prefix:

```
search_query=cat:cs.CL
search_query=cat:cs.LG
search_query=cat:cs.CL+OR+cat:cs.LG
```

Source: User Manual §5.1 "Details of Query Construction" — `cat` = Subject Category.

### 2.2 Available sort fields

**Parameters** (`sortBy`, `sortOrder`):

| `sortBy` value      | Description |
|---------------------|-------------|
| `relevance`         | Apache Lucene default relevance ordering |
| `lastUpdatedDate`   | Date of last version update |
| `submittedDate`     | Date of original submission |

`sortOrder`: `ascending` or `descending`

**No citation count sorting is available.** The arXiv API does not expose citation counts or rankings.

Example: `?search_query=cat:cs.CL&sortBy=submittedDate&sortOrder=descending`

Source: User Manual §3.1.1.3.

### 2.3 Pagination

| Parameter     | Type    | Default | Description |
|---------------|---------|---------|-------------|
| `start`       | int     | 0       | 0-based index of first result |
| `max_results` | int     | 10      | Results per page (max 2,000 per slice) |

- Max total results: 30,000 (requests exceeding this return HTTP 400)
- Max per single call: 2,000
- Use `opensearch:totalResults` in response to know total count

Source: User Manual §3.1.1.2.

### 2.4 Rate Limits

**Source:** ToU <https://info.arxiv.org/help/api/tou.html>:

> When using the legacy APIs [...] make no more than one request every three seconds, and limit requests to a single connection at a time.

This means **~20 requests per minute** maximum. The User Manual also recommends adding a 3-second delay between API calls.

**Caching note:** arXiv results only update at midnight. There is no need to call the API more than once per day for the same query. Cache aggressively.

### 2.5 Response Format

**Atom 1.0 XML.** Key XML elements per entry:

| Element | Content |
|---------|---------|
| `<entry>/<title>` | Paper title |
| `<entry>/<summary>` | Abstract text |
| `<entry>/<author>/<name>` | Author name(s) |
| `<entry>/<category>` | Subject categories (attribute `term`) |
| `<arxiv:primary_category>` | Primary category (attribute `term`) |
| `<entry>/<id>` | Abstract page URL (extract arXiv ID by removing `http://arxiv.org/abs/`) |
| `<entry>/<published>` | Original submission date |
| `<entry>/<updated>` | Last update date |
| `<link title="pdf">` | PDF download URL |
| `<link title="doi">` | Resolved DOI (optional) |
| `<arxiv:doi>` | DOI string (optional) |
| `<arxiv:journal_ref>` | Journal reference (optional) |
| `<arxiv:comment>` | Author comments |

### 2.6 Authentication

Not required. The API is fully open.

### 2.7 Estimated Throughput

- 1 request per 3 seconds = 20 requests/min
- Max 2,000 results per request
- Max theoretical: 40,000 papers/min (but 30,000 total cap per query)
- API requires cache-and-increment approach for large bodies of papers

### 2.8 Metadata License

arXiv metadata (title, abstract, authors, identifiers, classification terms) is available under CC0 1.0 Public Domain. Source: ToU <https://info.arxiv.org/help/api/tou.html>.

---

## 3. Wikipedia API

**Primary docs:**
- Categorymembers API: <https://www.mediawiki.org/wiki/API:Categorymembers>
- API Etiquette: <https://www.mediawiki.org/wiki/API:Etiquette>
- Rate Limits: <https://www.mediawiki.org/wiki/Wikimedia_APIs/Rate_limits>
- Bulk Dumps: <https://dumps.wikimedia.org>

### 3.1 Approach A: Categorymembers API

**Endpoint:** `GET https://en.wikipedia.org/w/api.php`

**Params:**

| Param       | Value | Description |
|-------------|-------|-------------|
| `action`    | `query` | |
| `list`      | `categorymembers` | |
| `cmtitle`   | `Category:Machine_learning` | Category to enumerate (must include `Category:` prefix) |
| `cmtype`    | `page` | Filter: `page`, `subcat`, `file` |
| `cmlimit`   | `max` | Max 500 per request |
| `cmcontinue`| (cursor) | Pagination cursor from previous response |
| `format`    | `json` | |

**Getting page content:** Chain with `prop=extracts`:

```
?action=query&prop=extracts&exintro&explaintext&titles=Page_Title&format=json
```

Or use `action=parse&page=Page_Title&prop=text&format=json` for parsed HTML.

**Relevant Wikipedia categories for ML/DL/NLP/CV/RL:**
- `Category:Machine_learning`
- `Category:Deep_learning`
- `Category:Natural_language_processing`
- `Category:Computer_vision`
- `Category:Reinforcement_learning`
- `Category:Artificial_intelligence`

To get subcategories recursively, chain `cmtype=subcat` then enumerate each subcategory.

Source: <https://www.mediawiki.org/wiki/API:Categorymembers>

### 3.2 Approach B: Bulk XML Dumps

**Source:** <https://dumps.wikimedia.org/enwiki/>

Monthly full-content XML dumps of all English Wikipedia articles in wikitext format. The dump includes all revision history but a "pages-articles" multistream dump contains only the latest revision of main-namespace articles.

**Download URL pattern:** `https://dumps.wikimedia.org/enwiki/latest/enwiki-latest-pages-articles.xml.bz2`

**Rate limits for dumps:** 3 concurrent connections per IP. Must use compliant User-Agent header per <https://foundation.wikimedia.org/wiki/Policy:Wikimedia_Foundation_User-Agent_Policy>.

**Parsing:** The XML file contains `<page>` elements with `<title>`, `<revision>/<text>` (wikitext), and `<categories>` elements. Category membership can be used to filter ML-relevant pages post-hoc.

### 3.3 Rate Limits

**Source:** <https://www.mediawiki.org/wiki/Wikimedia_APIs/Rate_limits>

| Client type | Limit (req/min) |
|-------------|-----------------|
| Unidentified (IP only, no User-Agent) | 10 |
| Unauthenticated bot with compliant User-Agent | 200 |
| Authenticated user (established editor) | 2,000 |

### 3.4 Authentication

Not required for read-only access. Authenticated users get higher rate limits.

### 3.5 Response Format

JSON (recommended). Supports `format=json`, `format=xml`, `format=php`.

### 3.6 Wikipedia Glossary Pages

Wikipedia hosts glossary pages under CC BY-SA 3.0 license that serve as terminology lists:

- **Glossary of artificial intelligence:** <https://en.wikipedia.org/wiki/Glossary_of_artificial_intelligence>
- **Glossary of computer science:** <https://en.wikipedia.org/wiki/Glossary_of_computer_science>
- **Glossary of machine learning:** Does not exist as a standalone page (404), but ML/DL terms are covered within the AI and CS glossaries.

These can be fetched via `action=parse&page=Glossary_of_artificial_intelligence&prop=text&format=json` to get parsed HTML definition lists.

---

## 4. PyTorch Docs

**Docs URL:** <https://pytorch.org/docs/stable/>
**GitHub source:** <https://github.com/pytorch/pytorch>

### 4.1 Recommended approach: Git clone + extract docstrings

**Why not scrape:** Rendered HTML is auto-redirected to versioned URLs (`/docs/2.13/index.html`) and is generated from source. Extracting from Python source gives you the canonical text directly.

**Key source paths (main branch):**

| Path | Content |
|------|---------|
| `torch/nn/modules/` | All `nn.Module` subclasses (Conv, Linear, BatchNorm, Transformer, RNN, Pooling, Loss, etc.) |
| `torch/nn/functional.py` | Functional API docstrings (F.relu, F.conv2d, etc.) |
| `torch/optim/` | Optimizer docstrings |
| `torch/tensor.py` | Tensor methods |

**Repository:** <https://github.com/pytorch/pytorch> (BSD license)

### 4.2 robots.txt

Source: <https://pytorch.org/robots.txt>

```
User-agent: *
Content-Signal: ai-train=yes, search=yes, ai-input=yes
Disallow: /wp-admin/
Allow: /wp-admin/admin-ajax.php
```

No restrictions on scraping the docs subdomain.

### 4.3 Scraping approach (alternative)

If scraping rendered pages, the docs are at `https://pytorch.org/docs/stable/`. Each API reference page (e.g., `torch.html`, `torch.nn.html`, `torch.nn.functional.html`) is a single-page listing. Individual function/module pages are at `generated/torch.nn.Conv2d.html` etc. No robots.txt restrictions apply to `docs.pytorch.org`.

### 4.4 Rate limits

No documented rate limits for pytorch.org scraping. Standard politeness (1-2 requests/second, `User-Agent` header) should be used.

---

## 5. scikit-learn Docs

**Docs URL:** <https://scikit-learn.org/stable/>
**GitHub source:** <https://github.com/scikit-learn/scikit-learn>

### 5.1 Recommended approach: Git clone + extract docstrings

**Key source paths (main branch):**

| Path | Content |
|------|---------|
| `sklearn/linear_model/` | Linear models (LogisticRegression, Ridge, Lasso, SGD, etc.) |
| `sklearn/ensemble/` | Ensemble methods (RandomForest, GradientBoosting, etc.) |
| `sklearn/svm/` | SVM implementations |
| `sklearn/tree/` | Decision trees |
| `sklearn/neighbors/` | Nearest neighbors |
| `sklearn/cluster/` | Clustering algorithms |
| `sklearn/decomposition/` | PCA, NMF, etc. |
| `sklearn/preprocessing/` | Preprocessing transformers |
| `sklearn/metrics/` | Evaluation metrics |
| `sklearn/model_selection/` | Cross-validation, grid search |
| `sklearn/neural_network/` | MLP |

**Repository:** <https://github.com/scikit-learn/scikit-learn> (BSD 3-Clause license)

### 5.2 robots.txt

`https://scikit-learn.org/robots.txt` returns 404 — no restrictions.

### 5.3 Built-in glossary

scikit-learn has a standalone glossary page: <https://scikit-learn.org/stable/glossary.html>
This provides definitions of ML terms in the scikit-learn context (BSD licensed).

### 5.4 Scraping approach (alternative)

Rendered docs at `https://scikit-learn.org/stable/modules/classes.html` list all API. Individual pages at `https://scikit-learn.org/stable/modules/generated/sklearn.ensemble.RandomForestClassifier.html`. No rate-limit concerns for non-abusive scraping.

---

## 6. NLP/CV/RL Terminology Lists

### 6.1 Wikipedia Glossaries (CC BY-SA 3.0)

| Page | URL | Fetch method |
|------|-----|-------------|
| Glossary of artificial intelligence | `https://en.wikipedia.org/wiki/Glossary_of_artificial_intelligence` | `action=parse&page=Glossary_of_artificial_intelligence&prop=text&format=json` |
| Glossary of computer science | `https://en.wikipedia.org/wiki/Glossary_of_computer_science` | `action=parse&page=Glossary_of_computer_science&prop=text&format=json` |

These are structured as definition lists (`<dl>`/`<dt>`/`<dd>`) with alphabetical sections. The AI glossary covers ML, DL, NLP, CV, and RL concepts.

### 6.2 Wikipedia category-based term extraction

The Categorymembers API (§3.1) can enumerate pages in relevant categories. Article titles and their lead paragraphs (via `prop=extracts&exintro`) form a domain-term corpus.

### 6.3 scikit-learn Glossary (BSD)

<https://scikit-learn.org/stable/glossary.html> — HTML definition list of ML terminology as used in scikit-learn. Scrapable.

### 6.4 License summary for terminology sources

| Source | License |
|--------|---------|
| Wikipedia articles | CC BY-SA 3.0 |
| Wikipedia API help pages | CC0 (Help namespace only) |
| scikit-learn docs/glossary | BSD 3-Clause |
| PyTorch docs (GitHub) | BSD |
| arXiv metadata | CC0 1.0 |

Note: Wikipedia article text is CC BY-SA, requiring attribution and share-alike. arXiv metadata is CC0 requiring no attribution (though acknowledgment is requested). scikit-learn and PyTorch documentation are BSD licensed.

---

## Appendix: Consolidated Summary

| Source | Endpoint/Tool | Auth Required | Pagination | Rate Limit | Response | Items/req |
|--------|--------------|---------------|------------|------------|----------|-----------|
| **HF Models list** | `GET /api/models?sort=downloads&direction=-1` | Token recommended | Cursor via Link header | 500-1000/5min API calls | JSON | Configurable (limit) |
| **HF Model card** | `GET /{ns}/{repo}/resolve/main/README.md` | Token recommended | N/A | 3000-5000/5min Resolvers | Raw text (302 redirect) | 1 per req |
| **arXiv search** | `GET export.arxiv.org/api/query?search_query=cat:cs.CL&start=0&max_results=200` | None | start + max_results (max 2000/slice, 30000 total) | 1 req/3 sec | Atom XML | Up to 2,000 |
| **Wikipedia category** | `GET en.wikipedia.org/w/api.php?action=query&list=categorymembers&cmtitle=Category:ML&cmlimit=max` | None (optional) | cmcontinue cursor | 200/min (unauthenticated) | JSON | Up to 500 |
| **Wikipedia page** | `GET .../w/api.php?action=parse&page=Title&prop=text` | None (optional) | N/A | 200/min | JSON (HTML) | 1 per req |
| **Wikipedia dump** | `wget dumps.wikimedia.org/enwiki/latest/enwiki-latest-pages-articles.xml.bz2` | None | N/A | 3 concurrent connections | XML | Full wiki (~22GB compressed) |
| **PyTorch source** | `git clone github.com/pytorch/pytorch` | None | N/A | GitHub rate limits | Python files | Full repo |
| **scikit-learn source** | `git clone github.com/scikit-learn/scikit-learn` | None | N/A | GitHub rate limits | Python files | Full repo |
| **scikit-learn glossary** | `GET scikit-learn.org/stable/glossary.html` | None | N/A | Polite crawling | HTML | 1 page |
| **Wikipedia glossary** | `action=parse&page=Glossary_of_AI` | None | N/A | 200/min | JSON (HTML) | 1 page |
