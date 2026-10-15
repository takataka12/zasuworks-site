# ZASU WORKS — analytics operations

Status (2026-10-15): GA4 `G-JPG8NNYWWT` is deployed and receiving production events. Account `412134904`, property `559113085`, Web stream `16132618253`. The owner completed Google terms and approved the currently signed-in personal Google account. Enhanced measurement, Signals and user-provided data collection are off. Realtime confirmed one verification visitor, page_view, view_item, click_purchase, click_square and the exact approved UTM URL. DebugView and the mobile app have not been independently verified. The active X ad URL has not been changed; untagged visits cannot yet be reliably classified as paid campaign traffic. See analytics-delivery.md for the final coverage and links.

## Activate the actual stream

1. Select the Google account that should own the analytics data. Check existing accounts/properties first. The initially opened personal account shows first-time Analytics setup; this does not prove other Google accounts have no existing property.
2. Reuse an appropriate existing property or create `ZASU WORKS`, reporting timezone `Japan / Tokyo`, currency `JPY`. Minimize optional account data sharing. The owner must approve Google Analytics terms.
3. Create/reuse a Web stream for `https://zasuworks.jp`, stream name `ZASU WORKS Web`. **Disable enhanced measurement entirely** before activation: automatic history views, clicks, downloads, videos, search and forms would bypass this implementation's privacy filters or duplicate its events. Leave user-provided data collection and Google Signals disabled. Set data retention to 2 months initially.
4. Copy only the public `G-...` measurement ID into `assets/analytics-config.js`. Never store API secrets, Google account credentials, or service-account keys in the repository. Run `node tools/build-analytics.cjs`.
5. Add event-scoped custom dimensions for `product_id`, `product_name`, `sales_channel`, and `destination` in Admin → Data display → Custom definitions. The `view_item` event also includes standard `items.item_id` and `items.item_name`.
6. Mark `click_purchase` as a key event if desired, explicitly named **purchase intent**, never a confirmed purchase. Do not add `purchase` or monetary values. Channel-specific click events and `click_purchase` describe the same click and must not be summed into one funnel step.
7. Run all generators and tests, publish through the existing GitHub Pages workflow, then check actual production collection with consent enabled in Realtime and DebugView. Realtime can lag; standard reports/custom dimensions commonly require 24–48 hours. Debug mode must be enabled only for the testing browser (Google Analytics Debugger or Tag Assistant); do not globally enable it for real users. Queued browser events or successful HTTP delivery do not establish GA4 processing.

## Events

| Event | Meaning | Completion / revenue? |
| --- | --- | --- |
| `page_view` | One approved public document view after consent | No |
| `view_item` | Product/service detail page, fixed product metadata | No |
| `click_purchase` | Square or known BOOTH product purchase intent | No |
| `click_square` | Square checkout navigation intent | No |
| `click_booth` | BOOTH item/shop navigation intent | No |
| `click_demo` | YouTube/demo anchor access or first audio/video play per element | No |
| `click_download` | Download entry/file link intent | No; neither completion nor entitlement |
| `contact_email_open` | Email-client launch, including MEDIA prepared mail | No; delivery unobservable |
| `click_apply` | MEDIA consultation section access | No |
| `click_service` | ZASU AUDIO service entry | No |

`view_item` is the GA4 recommended equivalent of the requested `view_product`. `contact_submit` and `purchase` are intentionally not emitted. Do not infer successful contact delivery from a submit event that only creates a mailto draft.

## X campaign

Destination prepared for approval:

https://zasuworks.jp/zasu-vocal/?utm_source=x&utm_medium=paid_social&utm_campaign=zasu_vocal_20261015&utm_content=vocal_demo

Do not change the active ad without the owner's explicit approval. Depending on ad type, editing a destination may require replacing the promoted post/ad and a fresh review; confirm current X Ads UI behavior first. Analytics activation can begin without changing the ad, but historic untagged traffic cannot be reliably relabeled as this campaign. t.co referrals alone do not distinguish paid from organic X visits.

GA4 Reports → Acquisition → Traffic acquisition: use **Session source / medium**, select `x / paid_social`, and **Session campaign** `zasu_vocal_20261015`. Compare Sessions, Total users, Engaged sessions, Event count and Key events. Do not use first-user acquisition dimensions as a substitute for session attribution.

X clicks and GA4 sessions differ: repeat clicks can share one session; a click may never finish loading; refusal, script blocking and browser restrictions prevent GA collection; automated or accidental clicks are filtered differently; reporting timezone, date range, latency and attribution definitions differ. This implementation's explicit consent creates a known collection gap. Do not compute reliable cost per purchase without verified ad cost and attributed completed sales.

## Free Google report collection — configured

Published collection: `ZASU WORKS｜集客・製品・購入意向`, collection ID `16132652584`. It includes the standard traffic overview, Pages and screens, Traffic acquisition and Events, plus two saved custom reports:

- `製品別購入クリック｜売上ではありません` (`16132657345`): filter eventName regex `^click_purchase$`; default dimension 製品名; alternative dimensions 購入先, セッションの参照元 / メディア and イベント名; metrics Event count, Total users, Events per active user. Revenue removed.
- `X広告｜VOCAL 20261015` (`16132658471`): sessionSourceMedium regex `^x / paid_social$` AND sessionCampaignName regex `^zasu_vocal_20261015$`; Sessions, engaged-session/engagement metrics, Event count, Key events, session key-event rate and Total users. Revenue removed.

Four custom definitions (product_id, product_name, sales_channel, destination) were saved. click_purchase is a key event counted once per session, with **no default monetary value**. Default purchase appears in GA4's own key-event list, but this site does not emit purchase.

The table below remains a reference for reading/expanding the collection:

Use GA4 Library → create a `ZASU WORKS` collection, publish it, and add:

| Report | Dimensions / filters | Metrics / date selection |
| --- | --- | --- |
| Today | Realtime overview, then Pages and screens | Active users (Realtime window); today's Views, Total users and Sessions in standard reports |
| Acquisition | Session source/medium, Session campaign | Sessions, Total users, Engaged sessions; last 7 / 30 days |
| Products | Page path, product_id; event=view_item | Views and Total users by page; view_item Event count; ranking descending |
| Purchase intent | product_id, sales_channel; event=click_purchase | Event count and Total users; no revenue label |
| X VOCAL | source=x, medium=paid_social, campaign=zasu_vocal_20261015 | Sessions, view_item users/events, click_purchase users/events |
| Sales coverage note | No fabricated chart | GA confirmed purchases/revenue **not instrumented**; Square/BOOTH official sales reports are separate |

For an optional GA4 Exploration funnel use session X campaign → VOCAL `page_view` → `view_item` → `click_purchase`. Configure consistent session scope, sequential steps and the appropriate open/closed funnel setting. Label its final step as purchase intent. A simple event-count ratio is not a purchase conversion rate and can exceed 100% with repeat clicks. Use user/session funnel completion rates with matching denominators.

Use the same owning Google account in mobile web or the official Google Analytics app. Desktop collection navigation, saved report filters and live receipt were verified; actual iPhone app/mobile report rendering remains unverified. Standard reports initially default to the previous 28 days and exclude today: use the date selector for Today or a 7/30-day period that includes today. Fresh standard reports can remain blank while Realtime already receives data; do not read that as zero total traffic.

## Sales coverage

Square static links and JS-generated buttons are recognized without changing their URLs. Existing Supabase account/purchase code verifies Square orders/payments and handles signed webhooks, delivery and refunds. None of those handlers or databases are changed by this implementation. Do not send an order from a browser thank-you/download page as a new purchase; returning to such pages or adding historic purchases to ACCOUNT would duplicate sales.

The repository does not currently bind a consented GA client/session/campaign to a verified Square payment. Existing total sales can be viewed separately but cannot be honestly assigned to this X campaign. A future opt-in checkout session integration needs server-confirmed payments, a deduplicated transaction event/outbox, refund handling, minimal public item IDs, consent propagation, and securely stored Measurement Protocol secrets. Design/test that separately before modifying commerce.

BOOTH has no implemented authenticated completion callback/session binding in this repository. Only its outbound purchase intent is measured. ZASU AUDIO (MIX/MASTER) is on `zasumaster.com`; only service entry from this repository is instrumented. Internal AUDIO page views/payment funnel require a separate authorized deployment to that application. Current seven requested product/service areas are not all measurable within this site alone.

## Maintenance

Run the analytics builder **last** after media/navigation/product/storefront generation. New `zasu-*/index.html` product pages are discovered automatically. New media articles are included in the public route inventory after generation. Add approved public campaign tokens in `campaigns` and source/medium/content allowlists in the core. Add explicit external BOOTH/Square IDs when introducing a sales destination; unknown destinations are grouped under site rather than guessed from the source product.

Account, admin, client, download, thanks and QA pages are excluded. This protects signed URLs and account data, at the cost of not tracking protected file delivery. Unknown referrers are grouped as `other-referral.invalid`; add an approved public origin in the core for finer source reporting. No large independent dashboard, paid Analytics plan, paid Looker connector or X API was introduced.

Verification command:

```sh
node tools/build-media.cjs
node tools/build-navigation.cjs
node tools/build-product-guide.cjs
node tools/build-storefront.cjs
node tools/build-analytics.cjs
NODE_PATH=/tmp/zasu-home-check/node_modules node --test tests/*.test.cjs supabase/tests/*.test.mjs
```

Rollback: revert the analytics integration commit(s). The tag is isolated from all commerce/authentication code. Disabling the measurement ID makes the loader inert immediately after the updated file propagates; it does not erase already collected Google data.
