# Analytics Implementation Plan

Goal: deliver the common consent/privacy-safe measurement layer, then activate it with the owner's real GA4 stream.
Architecture: build-time public route inventory, runtime event classification, one consent-gated Google tag.
Tech stack: existing static HTML, vanilla JS, Node test runner, existing Playwright checks.
Spec: docs/analytics-design.md

Constraints: preserve commerce/authentication code; no purchase or contact-success claims without confirmed success; no GA API secrets; no deployment with a placeholder ID.

Review focus: hostile URL query/fragment and referrer; bundle clicks from single-product pages; JS-generated Square buttons; storage unavailable or consent revoked; generated pages losing tags.

1. Write and run failing tests for sanitized URLs, public route eligibility, product and destination classification. Implement shared core and route generator. Verify idempotent generation.
2. Write and run failing browser tests for no requests before consent, manual pageview once, channel clicks, no purchase/contact_submit, withdrawal, protected routes and mobile controls. Implement loader, consent UI, safe config and CSS.
3. Add builder to existing workflow after page generators. Update privacy disclosures and operation/report guide. Run full existing suite and review diff. Commit to an isolated branch using the GitHub connector if shell push authentication is unavailable.
4. Owner completes Google account/terms steps. Configure actual stream, custom dimensions, key events and reports. Set measurement ID, rerun checks, merge/deploy through existing Pages workflow. Verify production Realtime/DebugView separately from browser delivery. Obtain explicit confirmation before altering the active X ad destination.

Progress: implementation and privacy disclosure prepared. Independent review completed; existing-buyer BOOTH intent inflation fixed with a regression test. Build tests use isolated temporary copies. Final full suite: 484 tests passed, zero failed (2026-10-15). No live tag or Google property created yet. Remaining external dependency: owner account selection and Google terms, followed by actual stream/report configuration and production verification.
