# International Search Strategy Implementation Plan

**Goal:** Apply a coherent keyword-to-page strategy for seven existing languages and validate the public SEO signals without promising rank or inventing search volume.
**Architecture:** One configuration holds language-level search intents and public titles. Existing static builders consume those titles and keep language-specific canonical URLs. A shared root WebSite identity, guide navigation and build audit make the strategy maintainable.
**Tech Stack:** Node CommonJS, static HTML, existing localization catalogs and node:test.

User asked to plan and apply the strategy; retain the current languages and URL structure. Expand countries only when their language/content requirements justify distinct pages. Do not require approval for routine choices already within that scope.

- [x] Record primary/secondary search intentions, candidate countries, evidence and measurement decisions in docs/2026-09-07-global-search-strategy.md.
- [x] Add content/seo-strategy.json with seven language entries, unique home/guide/FAQ titles and one intent per existing article route. Do not generate meta keywords or country doorway pages.
- [x] Add scripts/seo.js: validated configuration, site-wide WebSite identity, and explicit language/page metadata access.
- [x] Wire Korean and translated builders to the same strategy. Add localized guide table of contents and clear breadcrumb current-page semantics.
- [x] Add build SEO audit output with language URLs, title, description, self-canonical, reciprocal alternates and no public API URLs. Fail on missing localization or mismatched route intent.
- [x] Test all 84 pages for metadata/navigation/schema consistency; render representative mobile guide pages; review code; deploy and confirm production.
- [x] Inspect Search Console if authenticated browser use is available without conflicting with user activity. Record actual results only; do not infer rankings from a site: search.

Validation: 54 tests passed, including the existing unrelated local SMTP test; seven-language guide/contact/privacy browser check passed for35 pages. Independent read-only code review found no blockers. Deployment verification is recorded after push.
