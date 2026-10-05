# ZASU WORKS brand homepage — 2026-10-05

Baseline: `0e30aca62bd5355b130f647b92077dd422f0121d` (published formal DAW page and exact Square product-name compatibility).

## Scope

- Root now leads with ZASU WORKS as a music-tool brand and DAW → AUDIO → LOUD.
- DAW is featured, with v1.4 / founding offer / current owner-supplied UI.
- Apps, Music, Radio, crowdfunding, other work and contact URLs remain below the primary products.
- Root title, description and social image now describe the three-product brand.
- Latest request: `#beta` lands on `#workflow`; an invisible legacy anchor also exists without JavaScript. The actual six-screen sequence is Record → 歌を整える → Pitch Editor → Harmony → Auto Mix → Auto Mastering. The demo-video section follows it, rather than interrupting the sequence.
- LOUD hero's CSS interface illustration is replaced by the current release implementation render. Purchase and download paths are unchanged.

## Image provenance and limits

- DAW: six original owner-supplied v1.4 macOS screenshots, pixel content unchanged.
- AUDIO: screenshot of the actual public service homepage at `https://zasumaster.com/` on 2026-10-05. Its processing/payment backend is not modified. This is not a screenshot of a completed audio-processing job.
- LOUD: unmodified `ZASULOUD-v1.1.2-Release/Source` editor instantiated offscreen with existing Linux JUCE 8.0.15 build objects; no audio DSP or release binaries changed. Labelled as a release-source UI render, NOT a macOS host capture or native validation. The source's non-ASCII header separator renders incorrectly in this capture; the image has not been retouched to hide it. Native host screenshot replacement remains desirable.
- OGP uses exact HTML typography and these product images; no generated application UI.

## Verification before publishing

Fresh run: 54 passed / 0 failed. Purchase/download tests: 42; formal marketing browser tests: 8; brand homepage browser tests: 4 (375 / 390 / 768 / 1440 px). Checks include product order, campaign copy, URLs, anchors, loaded images, mobile menu, horizontal overflow, legacy anchor, closed checkout on invalid configuration, and saved-purchase compatibility. `git diff --check` passed.

The initial new homepage tests failed on the old homepage; after implementation all pass. Text-transform casing was accounted for in the Built & Released assertion.

No changes to saved purchase keys, `download.js`, `site-config.js`, shared `site.css`, private storage, release API, binaries or rollback files in this homepage update. Previous exact-product-name fix is recorded separately in VERIFICATION.md.

Automated payment fixtures are not paid production end-to-end tests. No purchase is submitted. Local browser tests do not constitute physical iPhone/Mac/Windows testing. Public navigation checks must be recorded separately after deployment.

## Reproduction

```sh
node --test supabase/tests/*.test.mjs tests/marketing.test.cjs tests/home.test.cjs
node tests/render-brand-ogp.cjs
```

Set `NODE_PATH` to an existing Playwright installation and `CHROME_PATH` to an available Chromium executable if necessary. `CAPTURE_DIR` optionally saves responsive screenshots. Capture and render helpers never alter release artifacts.
