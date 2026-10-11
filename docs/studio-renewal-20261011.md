# Studio homepage renewal — 2026-10-11

The homepage positions ZASU WORKS as an independent creative studio built by a person with AI. Music remains a primary product field alongside apps, web services and experiments.

## Updating content

- Homepage: `index.html`. Edit the four static news entries in `#news`; give a date only when it is confirmed.
- Project status: `#projects`. DRUMS is under development; RADIO is published; beyond-music tools are an unnamed concept with no committed release date. BEAST is omitted pending verified public status.
- Prices and supported environments must match product pages. The bundle remains 5,980 JPY and links to its existing approved Square checkout. Its buyer download URL is unchanged.
- `assets/studio.css` and `assets/studio.js` are shared by homepage, Products and About. Other product and legal pages retain their styles and URLs.
- `assets/ogp.svg` is rendered to `/ogp.png` by the existing Pages job; homepage social metadata points there.
- App image: SoloFrame's Japan App Store screenshot, retrieved on 2026-10-11 using the existing listing ID 6815981662.

## Validation and deployment

The existing single Linux Pages job runs responsive homepage tests at 320, 360, 390, 430, 768 and 1440 px, buyer/account regression tests, and backend unit tests. It deploys only after tests pass. After deployment, it checks the public homepage and captures production screenshots. No extra macOS jobs, CMS, backend changes or paid integrations are added.

The post-deploy screenshot step covers Chromium viewport sizes; it does not certify a physical iPhone or Safari. Authenticated production purchase/download operations are not exercised with new charges; regression tests use fixtures and the real public entry pages are checked separately.
