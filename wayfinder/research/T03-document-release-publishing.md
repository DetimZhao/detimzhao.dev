# T03 — GitHub Releases Asset Publishing for Corpus Artifacts

## 1. Asset URL Pattern

The stable, permalink URL for any GitHub Release asset is:

```
https://github.com/{owner}/{repo}/releases/download/{tag}/{filename}
```

This is the `browser_download_url` field returned by the [Releases REST API](https://docs.github.com/en/rest/releases/assets#get-a-release-asset). The API response for any release asset includes this key; it is the canonical public download URL.

This URL issues an HTTP **302 redirect** to a CDN edge URL. As of August 2026, the redirect target is `release-assets.githubusercontent.com` (Azure blob storage backed), with a time-limited SAS token in the query string. The SAS token expires roughly 1 hour after issuance. The stable `github.com` URL reissues a fresh SAS on each request, so the permalink never goes stale.

**Verified by:** direct HTTP HEAD request to `https://github.com/nektos/act/releases/download/v0.2.89/act_Linux_x86_64.tar.gz` → 302 → `https://release-assets.githubusercontent.com/github-production-release-asset/...`.

---

## 2. Cache Headers

### On the `github.com/releases/download` redirect (302):

```
cache-control: no-cache
```

This is the HTML page's cache directive and is not what the browser applies when following the redirect to the asset itself. Browsers that follow the 302 will see only the final response headers.

### On the final storage URL (`release-assets.githubusercontent.com`):

| Header | Value | Notes |
|--------|-------|-------|
| `ETag` | `"0x8DEBF8CFD408972"` | Strong ETag — Azure blob entity tag |
| `Last-Modified` | `Mon, 01 Jun 2026 03:22:19 GMT` | |
| `Accept-Ranges` | `bytes` | Supports range requests |
| `Cache-Control` | *(absent)* | **No `Cache-Control` header served** |
| `X-Cache` | `HIT, HIT` | CDN edge-cache hit (Varnish) |
| `X-Cache-Hits` | `57856, 1` | Layer 1 hits, layer 2 hits |
| `Age` | `2239` | Seconds stale since origin fetch |

**Key finding:** The final asset response does **not** include a `Cache-Control` header. There is no `immutable` directive, no `max-age`, no `s-maxage`. The CDN edges do cache (proven by `X-Cache: HIT` and high `X-Cache-Hits`), but this is server-side CDN behavior — not something the requesting browser can rely on.

The `ETag` and `Last-Modified` headers enable conditional requests (`If-None-Match` / `If-Modified-Since`), which is the best available client-side caching strategy for these assets.

### "Cache-forever-on-unique-tag-URL"

Since each tagged release creates a unique URL (`/releases/download/{tag}/...`), and tags are immutable in a semantic versioning workflow, the URL itself serves as a content-addressable key. However, because GitHub does **not** serve `Cache-Control: immutable` headers, the browser **will** still revalidate on hard reload / cache expiration based on heuristic freshness. For a truly "cache forever" experience at the HTTP level, you would need a CDN that sets `Cache-Control: public, max-age=31536000, immutable`.

---

## 3. `gh` CLI Commands

Source: [gh release create manual](https://cli.github.com/manual/gh_release_create), [gh release upload manual](https://cli.github.com/manual/gh_release_upload), [GitHub Docs: Managing releases](https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository)

### Combined: create release + upload assets in one command

Yes, `gh release create` accepts file arguments to upload as assets:

```sh
gh release create v1.0.0 \
  corpus.json.gz \
  corpus.vec.f32 \
  pca.json \
  model.json \
  --title "Corpus v1.0.0" \
  --notes "Semantic vector corpus for the Semantic Arithmetic Playground."
```

If the tag `v1.0.0` does not exist, `gh` will automatically create it from the latest state of the default branch (`--target` can specify a different branch/commit). If the tag already exists remotely, the release is created from that existing tag.

### Create a release from an existing tag (pre-pushed):

```sh
git tag v1.0.0
git push origin v1.0.0
gh release create v1.0.0 --title "Corpus v1.0.0" --notes "..." corpus.json.gz corpus.vec.f32 pca.json model.json
```

### Create a release that also creates a new tag:

```sh
gh release create v1.0.0 --title "Corpus v1.0.0" --notes "..." corpus.json.gz corpus.vec.f32 pca.json model.json
```

(No `git tag` needed beforehand — `gh` creates it automatically from the default branch.)

### Separate upload step (useful if release was created as draft):

```sh
gh release create v1.0.0 --draft --title "Corpus v1.0.0" --notes "..."
gh release upload v1.0.0 corpus.json.gz corpus.vec.f32 pca.json model.json
# Then publish from the web UI, or edit to remove --draft:
gh release edit v1.0.0 --draft=false
```

### With display labels:

```sh
gh release create v1.0.0 \
  'corpus.json.gz#Corpus Metadata (JSON)' \
  'corpus.vec.f32#Embedding Vectors (Float32)' \
  'pca.json#PCA Transform' \
  'model.json#Model Info' \
  --title "Corpus v1.0.0" --notes "..."
```

### Immutable Releases note:

Per the [gh release create docs](https://cli.github.com/manual/gh_release_create), when release immutability is enabled for a repo, `gh release create` internally creates the release as a draft, uploads assets, then publishes. Immutability is enforced only after publish.

### Aliases:

`gh release new` is an alias for `gh release create`.

---

## 4. Asset Size Limits

Source: [GitHub Docs: About releases > Storage and bandwidth quotas](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases#storage-and-bandwidth-quotas)

| Constraint | Limit |
|------------|-------|
| Max asset file size | **2 GiB** per file |
| Max assets per release | **1,000** |
| Total release size | **No limit** |
| Bandwidth | **No limit** |

The project's assets:

| File | Size |
|------|------|
| `corpus.json.gz` | ~200 KB |
| `corpus.vec.f32` | ~1.8 MB |
| `pca.json` | small (KB range) |
| `model.json` | trivial |

All well within the 2 GiB per-file limit and 1,000 assets-per-release limit.

---

## 5. Public Download Without Auth and CORS

### Unauthenticated access

Release assets are publicly downloadable via unauthenticated GET requests. This was confirmed with the `nektos/act` release asset test above — no Authorization header was sent, and the request succeeded (HTTP 200 after redirect).

### CORS headers — CRITICAL FINDING

**Neither the `github.com/releases/download` URL nor the final `release-assets.githubusercontent.com` URL returns any `Access-Control-Allow-Origin` header.**

| Check | Result |
|-------|--------|
| `Access-Control-Allow-Origin` on 302 redirect | *(absent)* |
| `Access-Control-Allow-Origin` on final 200 (Azure blob) | *(absent)* |
| `OPTIONS` preflight on `github.com/releases/download/...` | **HTTP 404** — GitHub does not handle CORS preflight on this endpoint |

**Implication:** The Semantic Arithmetic Playground, served from a GitHub Pages domain (e.g., `https://{user}.github.io`), **cannot** make cross-origin `fetch()` requests to GitHub Release asset URLs. Browsers enforce the same-origin policy for `fetch()`, and without `Access-Control-Allow-Origin` headers, the request will be blocked by the browser.

The only way to download these assets via the browser's `fetch()` API is if they are served from:
1. The **same origin** as the playground (e.g., files hosted on the same Pages site), OR
2. A CDN/proxy that sets `Access-Control-Allow-Origin: *`.

---

## 6. jsDelivr CDN Alternative

| Aspect | Finding |
|--------|---------|
| GitHub CDN URL pattern | `https://cdn.jsdelivr.net/gh/{owner}/{repo}@{tag}/{file}` |
| **Serves Release assets?** | **No.** jsDelivr's GitHub integration serves files from the **git repository tree** (branches/tags/commits), not from Release attachment assets. |
| Verified | `https://cdn.jsdelivr.net/gh/nektos/act@master/README.md` → 200 (works). `https://cdn.jsdelivr.net/gh/nektos/act@v0.2.89/act_Linux_x86_64.tar.gz` → 404 (release asset — does not work). |
| Source | [jsDelivr documentation](https://www.jsdelivr.com/documentation#id-github) |

### jsDelivr headers (for files it *does* serve from the git tree):

```
access-control-allow-origin: *
access-control-expose-headers: *
cross-origin-resource-policy: cross-origin
Cache-Control: public, max-age=31536000, s-maxage=31536000, immutable
```

jsDelivr provides **perfect CORS and caching headers** — but only for files that exist in the git repository tree, **not** for Release attachment assets.

---

## 7. Recommendation

### Problem

The playground is a GitHub Pages static site. It needs to `fetch()` binary corpus files at runtime. GitHub Release assets:
- Are **not** accessible via cross-origin `fetch()` (no CORS headers).
- Do **not** serve `Cache-Control: immutable` headers.

### Options

#### Option A: Commit corpus files to the repository tree, serve from same origin

Place the four corpus files in the repository (e.g., in a `public/data/` directory). When deployed to GitHub Pages, they are served from the same origin as the playground — no CORS issue.

- **Pro:** Zero CORS problem. Simplest architecture. Versioned with the site.
- **Pro:** Compensates for poor cache headers by using cache-busting query params or filename hashing. Alternatively, serve via jsDelivr from the repo tag for perfect `immutable` caching.
- **Con:** ~2.5 MB of binary data in git history. Acceptable for this scale.

#### Option B: Commit to repo + serve via jsDelivr

Commit corpus files to the repo (tagged), then use jsDelivr CDN URLs for fetch. jsDelivr adds `immutable` caching and CORS.

```
https://cdn.jsdelivr.net/gh/{owner}/{repo}@v1.0.0/public/data/corpus.json.gz
```

- **Pro:** Perfect CORS + `immutable` caching. Global CDN.
- **Con:** Adds external dependency. Files still need to be in the git tree.

#### Option C: GitHub Releases + same-origin proxy page

Not feasible on GitHub Pages (static hosting, no server-side proxy).

### Recommended approach

**Option A** — commit the corpus files to the repository, serve them from the same GitHub Pages origin. This is the simplest solution that avoids the CORS dead-end while keeping everything under version control. If CDN caching becomes desirable later, add jsDelivr URLs (Option B) as a transparent upgrade — the URL pattern is the same since the files are already in the git tree.

### Not recommended

Direct cross-origin `fetch()` from GitHub Release assets — blocked by browser CORS policy.

---

## References

1. [GitHub Docs: About releases](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases) — asset limits (2 GiB / file, 1000 assets / release)
2. [GitHub Docs: Managing releases](https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository) — creation flow, draft/publish workflow
3. [GitHub CLI: gh release create](https://cli.github.com/manual/gh_release_create) — CLI reference
4. [GitHub CLI: gh release upload](https://cli.github.com/manual/gh_release_upload) — CLI reference
5. [GitHub REST API: Release Assets](https://docs.github.com/en/rest/releases/assets) — `browser_download_url` format
6. [GitHub REST API: List Releases](https://docs.github.com/en/rest/releases/releases#list-releases) — API returns assets with `browser_download_url`
7. [jsDelivr Documentation](https://www.jsdelivr.com/documentation#id-github) — GitHub CDN integration (serves git tree files, not release assets)
