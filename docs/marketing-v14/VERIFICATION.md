# ZASU DAW v1.4 marketing refresh

Date: 2026-10-05. Release baseline: `413deed666d4749d53264adcd30b54efea4f2b21`.

Marketing name: ZASU DAW v1.4 正式版. Binary Version 0.0.14 / Build 0.0.15 remains unchanged.

## Pre-publication checks

- Existing purchase/download unit suite: 40 passed.
- Browser suite: 8 passed, including 375 / 390 / 768 / 1440 px, hero CTA visibility, no horizontal overflow, image enlargement, buyer recovery, legacy #beta anchor, disabled sales and mismatched checkout rejection.
- Independent review: price CSS specificity corrected and retested; early-access copy qualified as planned.
- Backend, purchase storage keys, site-config.js, download.js, original shared style.css, release paths, binary hashes and private rollback objects unchanged.
- Visible Beta and old launch-price text removed. Historical backend receipt product names intentionally preserved for existing purchases.
- All six application images supplied by the owner on 2026-10-05 are current macOS UI screenshots. Pixel content is unmodified. Old daw.png / vocal.png / harmony.png URLs now contain the latest UI. No generated product mockups are used.
- OGP: 1200 × 630 PNG, exact text layout with the real Pitch Editor screenshot.

## Reproduce

```
node --test supabase/tests/*.test.mjs supabase/tests/*.test.cjs
NODE_PATH=<directory-containing-playwright> node --test tests/marketing.test.cjs
SITE_URL=https://zasuworks.jp NODE_PATH=<directory-containing-playwright> node --test tests/marketing.test.cjs
```

Use CHROME_PATH for an existing Chromium executable if needed; CAPTURE_DIR optionally saves screenshots. `tests/render-ogp.cjs` renders the social image from `tests/ogp-v14.html` (Japanese fonts required).

## Limits

Automated browser checks do not submit a payment or impersonate a buyer. Paid end-to-end redownload must be distinguished from the unit tests and unauthenticated recovery UI checks. This change does not enforce a new ten-buyer quota in Square, change existing licenses or alter the published Mac/Windows files. Windows remains Unsigned, tested in Windows 11 ARM + x64 emulation, not native x64 hardware.
