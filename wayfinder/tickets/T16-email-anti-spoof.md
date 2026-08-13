---
id: T16
title: Lock down email anti-spoofing (SPF/DMARC) on both domains
labels:
  - wayfinder:task
status: closed
assignee: null
blocked_by: []
blocks: []
---

## Question

Both `detimzhao.dev` and `detimzhao.com` had no MX, SPF, DMARC, or DKIM — so
mail to `@detimzhao.{dev,com}` bounced and the domains could be spoofed. Lock
down anti-spoofing with the correct posture for site-only domains.

Checklist:

- [x] Decide mail posture: **no incoming mail, no sending** on both domains
- [x] Add SPF `v=spf1 -all` (TXT `@`) on both domains — nobody may send
- [x] Add DMARC `v=DMARC1; p=reject;` (TXT `_dmarc`) on both domains — reject
      forgeries
- [x] Skip MX (NULL MX is optional polish; Cloudflare UI rejects the bare `.`
      target, and no-MX already makes senders fall back to the web IP, which
      refuses SMTP)
- [x] Skip DKIM (nothing sends → no DKIM record to publish) and skip `rua`
      (opted out of aggregate reports)

## Resolution

Both domains locked to "site-only, no mail, no sending":

| Record | Name | Content |
|---|---|---|
| TXT | `@` | `v=spf1 -all` |
| TXT | `_dmarc` | `v=DMARC1; p=reject;` |
| MX | — | *(none — intentionally no mailbox)* |
| DKIM | — | *(none — no sender)* |

Applied on `detimzhao.dev` and `detimzhao.com` (both Cloudflare zones) and
verified via `dig`. Effect: mail to the domains bounces deterministically, and
any forged message claiming to be `@detimzhao.{dev,com}` is rejected by
receivers (`p=reject` with SPF hard-fail, no legitimate senders to protect).

Reversal notes (if email is ever needed):
1. To receive mail, add MX — delete nothing here, but note there is no NULL MX
   to conflict with (e.g. Cloudflare Email Routing would add its own MX).
2. SPF must change from `-all` to the sender's include (e.g.
   `v=spf1 include:_spf.mx.cloudflare.net ~all` for Email Routing).
3. Before any sender goes live, drop DMARC to `p=none`, align SPF/DKIM for that
   sender, then ramp back to `p=reject`.
