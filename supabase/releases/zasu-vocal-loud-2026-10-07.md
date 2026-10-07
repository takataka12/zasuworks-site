# ZASU VOCAL / ZASU LOUD — finalized distribution reflection

Date: 2026-10-07 (Japan)
Baseline site commit: 5c720e2d574d9831e055e02b25bfe04ac0996068.

User supplied Distribution ZIPs are the sole binary authority. No rebuild,
DSP, plugin identifier, state format, DAW, AUDIO, or Square checkout change.
macOS signing/notarization status is based on the owner's final Mac verification;
Windows installers are unsigned.

## Exact artifact identity

| Product | Filename | Bytes | SHA-256 |
|---|---|---:|---|
| VOCAL | ZASU-VOCAL-v1.0.0-macOS-Universal.dmg | 50328061 | `24819de09df41738897bc9c21aa72edc2ef8d402dde1a0a02985ac605c37158c` |
| VOCAL | ZASU-VOCAL-v1.0.0-Windows-Setup.exe | 5358290 | `b24cf49bfa3b18fd9d1be9a8d8eaca757a42a5be0fe05c585713191a53924363` |
| LOUD | ZASU-LOUD-v2.0.0-macOS-Universal.dmg | 10174842 | `52022752d2c117c7d5556e46fffda11e35bff4d7914f401a88b4a280b7867b42` |
| LOUD | ZASU-LOUD-v2.0.0-Windows-Setup.exe | 4856437 | `d969ae96b49ab65d415dfc46433df6eb64c83a88366b72bbfe88eae1ab9c9ef2` |

Remote files were fully downloaded through authenticated administrator transfer
URLs and matched each exact size and SHA-256. VOCAL already matched, so its
objects were retained. Buyer input methods and purchase criteria were retained. LOUD was uploaded to its existing
private release bucket under 2.0.0; old 1.1.2 objects remain for rollback.

## Buyer delivery

- VOCAL: existing /zasu-vocal/download/ and zasu-vocal-download function retained;
  receipt binding was strengthened without changing accepted input methods or product criteria.
- LOUD: user explicitly approved adding /zasu-loud/download/ with the same
  Square server-side verified-purchase approach. /zasu-loud/thanks/ also presents
  this protected page, preserving the existing checkout redirect.
- Separate LOUD localStorage keys, bucket, endpoint and rate-limit namespace.
- Exact historic Square title `ZASU LOUD v1.1.2 for macOS` continues to qualify;
  `ZASU LOUD v2.0.0` also qualifies. The fixed checkout title/settings are unchanged.
- Sign only the two expected product-specific artifacts after Square verifies
  location, exact product, quantity, amount, completed payment and no refunds.
- Signed file URLs retain the existing 600-second convention. Saved purchase
  identifiers or a Square receipt/transaction ID allow verification again.
- LOUD webhook purchase validation, deduplication, email delivery and AUDIO
  branches remain as in the authoritative live snapshot. Only LOUD's download
  destination and email/version/platform presentation change. The email directs
  a buyer to the protected page with the verified payment identifier.
- No emails were sent manually and no test payments were made.

## Validation and limits

139 purchase-verification, receipt, page, expiry and delivery tests passed.
Live VOCAL and LOUD functions rejected missing references (400), unknown orders
(403), and disallowed origins (403). All four raw private/public storage paths
refused unauthenticated access. All release buckets have public=false and there
are no storage object policies granting anonymous access.

No completed VOCAL/LOUD purchase suitable for an end-to-end positive live test
was found. Positive purchaser and re-download paths are covered by controlled
Square fixtures and actual binary retrieval; a real paid purchase confirmation
is still unverified. Do not describe these as real purchase tests.

The existing home/DAW Playwright tests could not launch: the runtime lacks its
required Chromium executable, and the browser download did not produce a valid
archive. Those pages were not changed.

## Rollback

Restore the site baseline above, the backed-up square-payment-webhook version
10, and VOCAL download function version 1 if rolling back the receipt validation. No database/schema/auth/checkout settings were changed. VOCAL binary objects
remain unchanged. LOUD's old v1.1.2 objects were preserved.

## Receipt binding

Review found that short receipt numbers alone cannot strongly bind a receipt to
its merchant-owned payment. Both products now extract one unique full Payment
ID from Square-generated `/receipts/pt/` footer links in the trusted receipt
HTML, fetch that exact Payment via Square, and apply the existing complete
order/payment/product/refund verification. The observed provider footer ID was
confirmed read-only as the exact API Payment.id for a completed DAW purchase;
that purchase does not qualify for VOCAL or LOUD.

The receipt method no longer scans merchant payment history, avoiding page and
age cutoffs. Missing/ambiguous provider identifiers fail closed with 422 and an
instruction to enter the direct transaction ID. Input formats, Square provider,
purchase criteria and buyer browser storage keys remain unchanged.

## Next stage

VOCAL 3980 JPY and LOUD 2980 JPY delivery are reflected. The proposed 5980 JPY
production bundle has not been created. The legacy Square LOUD checkout title
still describes v1.1.2/macOS; update it in a separately authorized checkout stage.
