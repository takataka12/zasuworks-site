# ZASU WORKS analytics design — 2026-10-15

Goal: measure visits from the active X VOCAL campaign, product interest and purchase intent without changing authentication or commerce.

Use one deferred, consent-gated GA4 loader, installed by a dependency-free page builder run after existing generators. Keep the public measurement ID in assets/analytics-config.js. Empty ID means no Google tag and no consent prompt; never invent an ID. Only load Google after affirmative analytics consent, worldwide. Advertising storage, personalization, user data and Signals remain disabled. Store a versioned choice for 180 days; offer equal accept/reject choices and persistent settings to withdraw. This deliberately undercounts visitors who do not consent.

Send page_view manually once per document, view_item on actual product detail pages, click_purchase and channel-specific click_booth/click_square, click_demo, click_download (intent only), contact_email_open, and click_apply. Do not send purchase, revenue, or contact_submit: current contact forms create mail drafts and cannot confirm delivery. GA4 enhanced measurement must be disabled to avoid automatic URLs/form values/download duplicates.

Allow only generated public paths, strip fragments and all URL parameters except validated, finite public campaign tokens. Referrers contain origin only. Use fixed product IDs/names, destination categories and public paths; never send DOM text, email, form data, transaction IDs, signed URLs, account IDs or arbitrary attributes. Skip account, admin, client, protected download and thanks routes before Google loading. Derive products from the existing zasu-* detail-page paths at build time; maintain explicit mappings only for external checkout/BOOTH IDs.

The static site deploys from main via .github/workflows/pages.yml. No Sites migration. All sale, download, account and webhook code remains unchanged. Square verified payment/webhook records are useful operational sales data but contain no reliable consented GA client/session binding for existing static payment links. BOOTH has no callback in this repository. Report the gap rather than fabricate attribution.

Verification: fail-first unit tests for privacy/filtering/classification, DOM/browser tests for consent/revocation/dynamic checkout buttons/duplicate loading/mobile layout, existing full regression suite, GitHub deployment, then actual GA4 Realtime and DebugView after account setup. Never equate queued events with server receipt.

External setup dependencies: select intended Google account, accept Google Analytics terms, create/reuse property and stream, obtain measurement ID, disable enhanced measurement, create product_id/product_name/sales_channel custom dimensions and key events, build GA reports. The Google page currently shows first-time setup under the personal account; business account selection/terms require the owner.
