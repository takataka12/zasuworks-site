# Analytics verification — 2026-10-15

Production analytics is **active and receiving events**. This record includes both preparation and subsequent activation evidence.

- Baseline: main `a822f5499084fe9b05da1ffcb9c9a2f026684fd8`.
- Actual public VOCAL page confirmed at `/zasu-vocal/`.
- Candidate UTM URL returned HTTP 200 without redirect and contained the VOCAL product plus its existing release configuration: `https://zasuworks.jp/zasu-vocal/?utm_source=x&utm_medium=paid_social&utm_campaign=zasu_vocal_20261015&utm_content=vocal_demo`.
- No source GA4, GTM or existing measurement ID found during inspection.
- Initial investigation: Google Analytics opened at first-time provisioning under the personal signed-in account; other accounts were not checked. Subsequently the owner explicitly selected that account and personally accepted Google's terms. Account `412134904`, property `559113085`, Web stream `16132618253`, measurement ID `G-JPG8NNYWWT` were created.
- Existing publishing route: GitHub Pages from main, `.github/workflows/pages.yml`. Existing source builders retained; common analytics builder runs last.
- Route inventory after all generators: 33 public pages, six actual product/service detail pages within this repository (DAW, VOCAL, LOUD, FINISH, VOCAL EDITOR, MEDIA). MIX/MASTER remain external; only AUDIO service-entry links measured here.
- Final command: `NODE_PATH=/tmp/zasu-home-check/node_modules node --test tests/*.test.cjs supabase/tests/*.test.mjs`.
- Final result: **484 passed, 0 failed, 0 skipped**, approximately 36.4 seconds, Chromium 141 / Playwright 1.56.1 matching the existing workflow version.
- Analytics-specific tests: 18 passed. Browser tests stub Google's tag and use a clearly test-only measurement ID; no actual analytics data is transmitted by these tests.
- Verified: consent before Google load; one pageview/item view; no arbitrary query/hash/form data; dynamic Square anchors and JS-only buttons; BOOTH purchase versus existing-buyer guidance; consent withdrawal/cookie deletion; cross-tab choice propagation; audio demo; inert empty ID; protected-route exclusion; generator idempotence; responsive checks at existing suite widths including 320px.
- First full suite: 481/482 passed, editorial generated-output check failed due to new common tags. Fixed the editorial validator to ignore only the owned analytics block; final full suite passed. Independent review found BOOTH existing-buyer intent inflation; a failing regression test reproduced it and the final tests confirm the fix.
- `git diff --check` clean. No modifications to Supabase, ACCOUNT, client, payment, webhook, fulfillment or refund code.

Activation verification: real measurement ID set; full 484-test suite rerun and passed. PR #7 merged as `94f38a3fa99ad3687fc05f7472b1bfaa08cc6ef0`, including activation commit `31912cec6b41759e5622e7aaeb0627de3a888a99`. GitHub run `38687685988` finished successfully, including deployment and published-site browser checks. Public VOCAL page displayed the new consent UI. After consent, its actual Square purchase link opened the correct ZASU VOCAL checkout without submitting payment. GA4 Realtime subsequently showed one verification visitor, page_view=1, view_item=1, click_purchase=1, click_square=1. view_item → page_location drilldown displayed the exact approved campaign UTM URL. These are verification interactions, not independent ad results or completed purchases.

GA configuration verified: enhanced measurement off; Google Signals and user-provided-data collection not enabled; event and user data retention two months with reset-on-activity off; product_id/product_name/sales_channel/destination definitions saved; click_purchase key event with no monetary value and once-per-session counting; collection `16132652584` published with traffic/product/event reports and custom purchase-intent/X campaign reports.

Pending/unmeasured: active ad destination edit requires owner approval; real advertising campaign classification after UTM deployment; dedicated DebugView validation; actual iPhone Analytics report rendering; successful contact delivery; BOOTH completion; verified Square revenue/session attribution; AUDIO internals on zasumaster.com. No purchase-completion, revenue, BOOTH completion or contact-delivery instrumentation is claimed. Active X advertisement was not edited.

Review decisions: use global opt-in consent, accepting undercount; allowlist campaign metadata; aggregate unrecognized referral origins; omit sensitive account/download pages; keep verified commerce untouched. These protect data at the cost of coverage, recorded in analytics-operations.md.
