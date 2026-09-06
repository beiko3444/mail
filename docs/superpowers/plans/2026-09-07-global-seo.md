# Global multilingual SEO implementation plan

Goal: Publish Korean plus English, Japanese, Spanish, Portuguese, French and German versions of the working mailbox and helpful public content.

Architecture: Preserve Korean URLs. Generate static locale directories with translated visible content, self-canonicals and reciprocal HTML hreflang including English x-default. Serve one shared mailbox application with locale dictionaries; preserve the same HttpOnly mailbox cookie across language navigation. Never redirect by IP or browser language. Keep private mailbox/API content excluded from search snippets and indexing.

- Add tests for seven locales, static translation, route equivalence, canonical/hreflang, sitemap inclusion, privacy boundaries and runtime messages.
- Add translation catalogs for UI, metadata, FAQ, guides and information pages. Update inaccurate Korean retention/provider descriptions to reflect deployed Cloudflare/Supabase storage without inventing deletion guarantees.
- Extend static build and shared app translation. Add an accessible language navigation and responsive styles. Keep each translated route local to its language.
- Document dated keyword research with source links and explicit absence of keyword-volume data. Use relevant search terms naturally in titles/headings/explanations; no doorway pages or keyword lists in product UI.
- Run all tests and inspect desktop/mobile pages and mailbox behavior. Publish only this task's files, preserving unfinished SMTP changes locally.
- Verify production localized pages, redirects, metadata and sitemap. Submit sitemap through Search Console if the authenticated property is available; report actual indexing status without promising rankings.
