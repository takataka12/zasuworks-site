# Analytics verification — 2026-10-15

Prepared implementation, **not yet active production analytics**.

- Baseline: main `a822f5499084fe9b05da1ffcb9c9a2f026684fd8`.
- Actual public VOCAL page confirmed at `/zasu-vocal/`.
- Candidate UTM URL returned HTTP 200 without redirect and contained the VOCAL product plus its existing release configuration: `https://zasuworks.jp/zasu-vocal/?utm_source=x&utm_medium=paid_social&utm_campaign=zasu_vocal_20261015&utm_content=vocal_demo`.
- No source GA4, GTM or existing measurement ID found during inspection.
- Google Analytics opened at initial provisioning under the personal signed-in account. Other accounts have not been checked. No property/account/stream created; no terms accepted.
- Existing publishing route: GitHub Pages from main, `.github/workflows/pages.yml`. Existing source builders retained; common analytics builder runs last.
- Route inventory after all generators: 33 public pages, six actual product/service detail pages within this repository (DAW, VOCAL, LOUD, FINISH, VOCAL EDITOR, MEDIA). MIX/MASTER remain external; only AUDIO service-entry links measured here.
- Final command: `NODE_PATH=/tmp/zasu-home-check/node_modules node --test tests/*.test.cjs supabase/tests/*.test.mjs`.
- Final result: **484 passed, 0 failed, 0 skipped**, approximately 36.4 seconds, Chromium 141 / Playwright 1.56.1 matching the existing workflow version.
- Analytics-specific tests: 18 passed. Browser tests stub Google's tag and use a clearly test-only measurement ID; no actual analytics data is transmitted by these tests.
- Verified: consent before Google load; one pageview/item view; no arbitrary query/hash/form data; dynamic Square anchors and JS-only buttons; BOOTH purchase versus existing-buyer guidance; consent withdrawal/cookie deletion; cross-tab choice propagation; audio demo; inert empty ID; protected-route exclusion; generator idempotence; responsive checks at existing suite widths including 320px.
- First full suite: 481/482 passed, editorial generated-output check failed due to new common tags. Fixed the editorial validator to ignore only the owned analytics block; final full suite passed. Independent review found BOOTH existing-buyer intent inflation; a failing regression test reproduced it and the final tests confirm the fix.
- `git diff --check` clean. No modifications to Supabase, ACCOUNT, client, payment, webhook, fulfillment or refund code.

Pending: owner Google account selection/terms; real measurement ID; enhanced measurement disabled in actual stream; custom dimensions/key events/report collection; production merge and Pages deployment; actual GA4 Realtime/DebugView receipt; mobile Analytics report verification. No purchase-completion, revenue, BOOTH completion or contact-delivery instrumentation is claimed. Active X advertisement was not edited.

Review decisions: use global opt-in consent, accepting undercount; allowlist campaign metadata; aggregate unrecognized referral origins; omit sensitive account/download pages; keep verified commerce untouched. These protect data at the cost of coverage, recorded in analytics-operations.md.
