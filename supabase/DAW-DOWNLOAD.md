# ZASU DAW Beta delivery

Product page: https://zasuworks.jp/zasu-daw/
Square checkout: https://square.link/u/M3YGTWd8
After-payment page: https://zasuworks.jp/zasu-daw/download/

One purchase provides both macOS and Windows. Binaries are never committed to
this public repository. Supabase private bucket `zasu-daw-releases` contains versioned releases.
Mac 0.0.11 is current; Windows remains 0.0.10. See
[Mac 0.0.11 release record](releases/zasu-daw-mac-0.0.11.md) for hashes, verification and rollback.

The initial 0.0.10 files below are retained:

| Object under `0.0.10/` | Bytes | SHA-256 |
| --- | ---: | --- |
| ZASUDAW-0.0.10-macOS-Universal.dmg | 7433716 | cd278dce5801f49f0339c207f3acfd7b8cca979fe24f65269432509582e8fa43 |
| ZASU-DAW-Beta-0.0.10-Windows-x64.zip | 3856461 | 8e413ec71ee100af68652088fe53592ff6212053b7fc71729fcf13b29e9ac712 |

## Authorization

`zasu-daw-download` is a new, isolated Edge Function in the existing ZASU MASTER
project. Its gateway JWT check is disabled because it uses custom purchase
verification. Existing ZASU AUDIO functions and Square settings are unchanged.

The fixed Square link's current checkout client appends `orderId` (also
`transactionId`, with the same order ID) on redirect. This was inspected in the
live checkout JavaScript on 2026-10-03; a redirect is **not** proof of payment.

The server reads Square's order and payments with the existing server-only
`SQUARE_ACCESS_TOKEN`. It checks location, exact normalized product title, one
item, JPY 1980 or 2980, completed payment, matching order/payment identifiers,
no outstanding balance, and no refunds or returns. Only then are two signed
download URLs issued for 600 seconds. Both OPEN and COMPLETED orders are allowed
when the payment is complete, because fulfillment may remain open.

Changing the Square product title, price, location, or tax settings requires
reviewing the validator and testing the purchase flow before sales continue.
The validator intentionally rejects unexpected products and totals.

The opaque order ID is a bearer credential, not account authentication: anyone
given a valid order ID can request the files. The page removes it from the
visible URL, uses no-referrer, and keeps it in localStorage for later downloads
from the same browser.
Do not publish order IDs, signed URLs or payment logs. The file URLs expire, but
a paid order can request new ones. No DRM or email-based license system is added.
Downloads already obtained cannot be revoked by a later refund.

Reopening in another browser/device may require support using the customer's
Square receipt. Do not tell customers to buy again. No automatic email is sent.

The existing rate-limit RPC is used with a DAW-specific actor namespace so DAW
requests do not consume other products' limits. Errors fail closed. No customer
records or raw provider errors are returned to the browser.

## Deployment and checks

Deploy the two files in `functions/zasu-daw-download/` together; they depend on
existing `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SQUARE_ACCESS_TOKEN`.
Keep the service-role and Square credentials server-side. SDK pinned to 2.95.0.

Run local behavior tests (Node 24):

```sh
node supabase/tests/daw-download.test.mjs
node supabase/tests/daw-download-page.test.mjs
```

The release upload helper used a short-lived task-specific credential and exact
two object paths. After upload and byte comparison, it was replaced by a 410
response with gateway JWT checking enabled. It grants no further upload access.

Verified: remote file byte equality, private storage, Square merchant/location
access, local authorization tests, public unauthenticated denial checks, and a
real JPY 1980 payment through the fixed link followed by successful download on
2026-10-04 JST. No refund or email was created by this deployment. No macOS
signing check was run on this Linux environment.

Sales enabled in `zasu-daw/site-config.js` on 2026-10-04 JST at the owner's
explicit request, to allow purchase-to-download checking before announcement.
The first real payment and download were subsequently confirmed by the owner.
No public bypass is exposed for testing.
