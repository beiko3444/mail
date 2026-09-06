# 하루메일 Google SEO Implementation Plan

> Execute the authorized SEO improvements in an isolated worktree using test-first implementation and independent spec/code review. The owner handles Search Console and publishing; no additional approval is needed for routine implementation choices within the user's SEO request.

**Goal:** Make the existing Korean public service clearly crawlable and understandable to Google, with consistent site identity, descriptive content, reliable canonical routes and Search Console submission. Ranking and sitelinks remain Google's decisions.

**Architecture:** Preserve the static Node build, current inbox behavior, existing URLs and strong mailbox privacy. Improve build-time metadata and visible internal navigation. Do not add trackers, paid services, fabricated reviews, SearchAction, FAQ rich-result promises, duplicate keyword landing pages or new email domains.

**Implementation task (agent):**
- [ ] Add regression tests against the generated HTML for a single home WebSite node with name 하루메일 and canonical root URL; consistent WebPage/Article breadcrumbs; unique titles/descriptions; exactly one H1; local links and section anchors resolve; related guides never link to themselves; API routes excluded from sitemap; API responses noindex; Google verification config escaped safely when present; existing 33 tests continue passing.
- [ ] Run tests and verify failures for missing SEO behavior before changing production code.
- [ ] Modify scripts/build.js, index.html, styles.css and necessary content/config files: home title `하루메일 | 무료 임시메일·일회용 이메일`, natural home H1 and description about free no-signup 24-hour temporary receiving; useful short description of temporary email below inbox; all existing guides discoverable via homepage/hub, visible article TOC and 2–3 related guides, home > guides > article breadcrumbs. Keep functional UI and factual limitations.
- [ ] Add safe JSON-LD: home WebSite name/url; consistent Organization identity pointing to /about/; WebPage, Article and BreadcrumbList using real URLs/content. Keep existing truthful publication dates. Do not add automatic lastmod timestamps or ratings.
- [ ] Support optional `searchConsoleVerification` config or `GOOGLE_SITE_VERIFICATION` env; omit when unset. Owner will supply verified public token if needed. Existing favicon is a valid square 48x48 SVG; retain it. Canonicals must stay on configured production origin. Exclude transient inbox content from snippets with data-nosnippet, without hiding the public tool description.
- [ ] Retain robots.txt public allow and /api/ disallow, add X-Robots-Tag noindex to API responses in shared http helper. Avoid weakening the inbox CSP for structured data. Handle /index.html canonical alias with redirect in local server and Vercel if supported.
- [ ] Run full build/tests, review diff, and report changed files and limitations. Do not publish, push, change site ownership, or submit to Google.

**Owner task:**
- [ ] Inspect authenticated Search Console. Add only `https://xtmail.vercel.app/` URL-prefix property if absent. Obtain HTML-tag verification token through UI; include it in build if required. Never publish credentials or private email data.
- [ ] Independently review spec compliance, then code quality. Confirm crawlability, canonical links, real 404 status, sitemap response and API noindex.
- [ ] Publish tested changes to the existing authorized main deployment using GitHub connector if local git authentication is absent.
- [ ] After public deployment, complete ownership verification, submit sitemap and request homepage indexing when supported. Record any Google-side quota/processing limits accurately.
- [ ] Deliver public site link and brief account of implemented improvements, verification, and any remaining Google processing. Do not claim guaranteed ranking or sitelinks.

**Validation commands:** Use `/Users/idabin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/build.js` then the same Node executable with `--test --test-concurrency=1 tests/*.test.js`. Baseline: 33 passing tests.
