# ZASU WORKS software shop — 2026-10-17

## Scope and preservation

Base: `e930471` (ACCOUNT retirement PR #12). The implementation is an existing GitHub Pages site change; no new hosting, services or dependencies. The latest guest delivery and deferred refund amendment are retained. Current refund terms remain in force; the proposed amendment is not activated by this change.

Home: VOCAL real Logic Pro screenshot → exact existing Square checkout / demo hub → VOCAL+LOUD bundle → LOUD / FINISH / VOCAL EDITOR / DAW → buyer support / redownload / product inquiries. Navigation: products, buyer support, contact. Contact covers pre-purchase questions, setup and bug reports. Product detail intros share purpose, real image, OS/formats, price, purchase and redownload order. Existing detailed technical requirements and release-gated checkout blocks remain.

Public source prices: VOCAL ¥3,980 v1.0.0; LOUD ¥2,980 v2.0.0; FINISH ¥1,980 v1.0.0; VOCAL EDITOR ¥2,980 v0.3.0; DAW ¥1,980 v1.4 (founding offer); bundle ¥5,980. FINISH / EDITOR scheduled regular prices and checkout links remain controlled by the existing release script. BOOTH conditions remain separate.

AUDIO / ACCOUNT / MEDIA / RADIO / crowdfunding / commissioned production are absent from primary navigation and sales promotion. `/radio.html` and `/services.html` are noindex pause/end notices. `/crowdfunding.html` is a noindex existing-supporter help page. `/audio-status.html`, `/account/`, MEDIA pause pages and every existing buyer download URL remain reachable. Retired discovery URLs are removed from sitemap. Former homepage project/news footer links were removed rather than sent to nonexistent anchors. A pre-existing broken VOCAL sales disclosure link now points to its actual shared VOCAL/LOUD disclosure.

No source assets, audio, protected distribution files, order records, applications, consultation records, customer licenses or entitlements were deleted or changed. Previous public text is retained in Git at the base revision. No customer login, paid purchase, authorization bypass, trial development/verification or Railway restart was performed.

## Crowdfunding

Public CAMPFIRE project `https://camp-fire.jp/projects/988242/view` displayed a supporter in its ¥5,000 tier and future delivery promises when inspected. This is public page evidence, not a private order/fulfillment audit. Existing stakeholder inquiry guidance is retained at the original URL. No supporter message, promise change, cancellation or CAMPFIRE configuration change was made. The owner should separately confirm the actual fulfillment and campaign acceptance state in CAMPFIRE; external campaign reception is not stopped by removing this site's links.

## Validation

- Full existing frontend/backend suite: 527 tests passed locally, zero failures/skips (final confirmation recorded at release), including protected delivery, purchase recovery, sale gates, consent and analytics. Updated layout-specific assertions to the requested replacement design.
- Width checks: 320, 360, 375, 390, 414, 430, 768, 820, 1024, 1440 pixels for home; responsive product and buyer routes in existing suites.
- Static internal links and fragments: `python tools/check-public-links.py`.
- Reproducible generation order matches Pages: media → navigation → product guide → storefront → shop → analytics.
- Visual screenshots are Chromium at desktop and iPhone-like viewport sizes; they are not physical iPhone Safari evidence.
- No live paid transaction or customer-specific successful redownload was tested. Existing mocked integration and authorization-denial tests do not establish a real buyer's purchase-to-file flow. Public production route and revision checks are recorded in the final delivery report.

Before / after: [desktop before](qa/shop-20261017/before-desktop.png), [desktop after](qa/shop-20261017/after-desktop.png), [mobile before](qa/shop-20261017/before-mobile.png), [mobile after](qa/shop-20261017/after-mobile.png).

## Recovery

Revert this shop PR's merge commit with `git revert -m 1 <shop-merge-sha>`, push a reviewed recovery change to main, then confirm the GitHub Pages workflow and public site. This restores the pre-shop design while retaining base PR #12's ACCOUNT retirement and refund protections. Do not reset main to an earlier pre-retirement commit; do not revert unrelated later work. No database or hosting rollback is required.
