# ZASU TRIAL SYSTEM Implementation Plan

Goal: deliver a reusable verified trial foundation, then integrate VOCAL before other products.
Architecture: common DSP + separate paid/trial packages; independent account-authenticated API; atomic database grants and signed offline licenses.
Tech: existing Supabase Postgres/Edge functions, ES modules/WebCrypto, JUCE C++17+.
Spec: docs/zasu-trial-design.md and user's full specification.

Global constraints: 168 hours; five product IDs vocal/loud/finish/vocal_editor/daw; paid builds default and DRM-free; no client secrets; no unverified release.
Review focus: request replay/races, account closure/session revocation, clock rollback/reinstall, plugin latency/layout bypass, release flag bypass.

1. Database: add trial catalog/grants/browser requests and service-only transactional RPCs, self-read RLS and aggregate stats. Test original expiry, retries, concurrency, isolation, disabled releases and owned products in a transaction against staging.
2. API: write failing node tests for PKCE browser handshake, fixed-duration signed license, malformed/expired requests, no authorization, rate limits, missing signer and error hygiene; implement handler/service/crypto. Test actual WebCrypto RSA signatures. Deploy staging only after tests; production waits for signing and release gates.
3. Desktop: test signature and time state machine, then implement common JUCE module, cached license and browser activation UI off audio thread. Paid compiles without trial. Integrate only authoritative VOCAL source; compare state/IDs and processing behavior. Build on available environment, report missing native gates explicitly.
4. Web/account: add responsive trial overview and management/browser confirmation to existing account UI. Test no premature trial start, no nonexistent download URLs, analytics consent. Add source-only product CTAs until release gates pass.
5. Verification/handoff: self-review security and failure paths, run existing account suite and new tests, record commits, platform evidence and remaining blockers. No other-product integration or public deployment until VOCAL verification succeeds.
