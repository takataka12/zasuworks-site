# ZASU WORKS analytics delivery — 2026-10-15

The site analytics layer is deployed and GA4 Realtime reception is verified. The active X ad destination was not changed. The X campaign report will identify traffic using the approved tagged URL; existing untagged ad clicks are not retroactively attributed.

## Access

- Measurement ID: **G-JPG8NNYWWT**.
- GA account `412134904`; property `559113085`; stream `16132618253`.
- Verified Realtime URL: https://analytics.google.com/analytics/web/provision/#/a412134904p559113085/realtime/overview?params=_u..nav%3Dmaui&collectionId=16132652584
- Verified X report URL: https://analytics.google.com/analytics/web/provision/#/a412134904p559113085/reports/explorer?params=_u..nav%3Dmaui&ruid=C4A86DE0-8CCA-490D-8516-734B87161160&collectionId=16132652584&r=16132658471
- Navigation: Reports → `ZASU WORKS｜集客・製品・購入意向` → `集客・製品・購入意向`. Includes overview, Pages and screens, Traffic acquisition, purchase intent, X campaign and Events.
- Date selector: choose Today, last 7 days or last 30 days; include today when assessing the new installation. Default historical ranges may exclude today. Normal aggregation/custom definitions may lag 24–48 hours. Realtime is for the last 30/5 minutes, not an all-day total.
- Use the same Google account in mobile web or the official Google Analytics app. Actual iPhone app rendering remains unverified.

## Verified results

- 33 public pages covered by the final common builder. Account/admin/client/download/thanks/QA routes excluded to protect authentication and delivery data.
- Product pages automatically discovered: DAW, VOCAL, LOUD, FINISH, VOCAL EDITOR; MEDIA also classified. AUDIO entry links are measured, but MIX/MASTER pages on another host are not instrumented by this repository.
- After a real consented verification visit, GA4 showed one visitor and actual page_view, view_item, click_purchase and click_square reception. Each was 1 during observation. The view_item page_location parameter contained the exact approved UTM URL. These counts include implementation verification, not proven customer activity.
- The actual VOCAL purchase link still opened the correct ¥3,980 Square checkout. No payment was submitted. Existing authentication, fulfillment, refund and commerce handlers were not changed.
- 484 tests passed after activating the actual stream ID, 0 failed. Production GitHub workflow succeeded: https://github.com/takataka12/zasuworks-site/actions/runs/38687685988

## Events

`page_view`, `view_item` (recommended GA4 equivalent of view_product), `click_purchase`, `click_booth`, `click_square`, `click_demo`, `click_download`, `contact_email_open`, `click_apply`, `click_service`.

GA4 also collects standard session_start, first_visit and user_engagement after consent. Purchase click and its channel event describe the same interaction; do not add them together. BOOTH existing-buyer receipt links emit only click_booth, not new purchase intent. Download events represent link intent, not successful delivery.

The saved purchase-intent report filters click_purchase, defaults to product name, and offers sales channel/session source-medium dimensions. Revenue is removed. The key event counts once per session and has no default monetary value. The saved X report filters session source-medium `x / paid_social` and campaign `zasu_vocal_20261015`, with Sessions, Total users, engagement and key-event metrics; revenue is removed.

## Active-ad approval still required

Verified candidate URL:

https://zasuworks.jp/zasu-vocal/?utm_source=x&utm_medium=paid_social&utm_campaign=zasu_vocal_20261015&utm_content=vocal_demo

The site successfully serves this URL and GA4 received it. Replacing an ad destination may require a replacement ad/post or renewed review depending on the ad type; inspect the current X Ads editor before changing it. Owner confirmation is required before modifying the live advertisement. Do not infer paid traffic from t.co alone, and do not relabel old visits.

X clicks can exceed GA sessions because of repeat clicks in one session, unfinished page loads, refused consent, blockers, bot filtering, reporting latency, timezone and attribution differences. Conversely, another session can begin later. GA4 installation does not recover historical visits.

## Coverage limits and next useful additions

- Square verified payments/webhooks and ACCOUNT purchase history exist, but this integration has no reliable consented visitor/session-to-payment binding. **Purchase completion, revenue and ad return on spend are not instrumented.** Do not count thank-you views or historic purchase registration as a sale.
- BOOTH provides no authenticated completion callback here. Only outbound intent is observable.
- MEDIA/contact generates email drafts; send success is unobservable, so contact_submit/generate_lead are not emitted.
- Independent DebugView testing and actual smartphone-app verification remain unconfirmed; event reception was verified through GA4 Realtime and parameter drilldown instead.
- Useful later work: consent-aware Square checkout/session binding plus deduplicated server purchase/refund events; separate AUDIO deployment/cross-domain design; real contact success callback; a clearly separated owner/test-traffic filter after enough stable data. No API secrets should enter this static repository.

## Source and publication

- PR: https://github.com/takataka12/zasuworks-site/pull/7
- Foundation: `924400c02e8af9b6e8fe370d5c36cb0eb57fd528`.
- Real-stream activation: `31912cec6b41759e5622e7aaeb0627de3a888a99`.
- Production merge: `94f38a3fa99ad3687fc05f7472b1bfaa08cc6ef0`.
- Files: assets/analytics-config.js, analytics-core.js, analytics.js, analytics.css; tools/build-analytics.cjs; tools/build-media.cjs validation integration; .github/workflows/pages.yml; privacy.html and LOUD privacy disclosure; common tags on 29 tracked public HTML sources plus generated MEDIA pages; three analytics test files; analytics design/plan/operations/validation/delivery documents. The PR contains the exact changed-file list.

Privacy approach: worldwide explicit opt-in, no Google requests before consent, fixed public metadata only, strict query/referrer filtering, no form contents/transaction/account data, ad storage/personalization and Signals off. This intentionally undercounts unconsented visits and groups unknown referring hosts. The data layer is maintainable through one builder and one public config file.
