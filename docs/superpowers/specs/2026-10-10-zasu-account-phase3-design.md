# Phase 3: additive integration

Baseline: local 6825ee1; production a73bd1c. Phase 1/2 retained. Production deployment, real payment/refund and destructive operations require new approval.

The same Supabase project already stores ACCOUNT and AUDIO. Use Auth UUID plus existing session proofs. Add a private, uniquely owned AUDIO-job projection; do not infer ownership from visitor IDs or email. Legacy MIX/CONVERT 256-bit job capabilities can prove ownership, subject to expiration and source ownership. MASTER application tokens are recoverable by visitor ID in the current anonymous API: they must never authorize historical account claims. Future MASTER ownership must be recorded during authenticated creation, with the original anonymous handler preserved.

Job outputs retain the current 24-hour retention. History persists independently. Downloads must check ownership, session, expiration, canonical paid credit and live Square state; never return stored anonymous tokens. No DSP changes. Account closure immediately blocks access through existing session proofs without deleting purchases or jobs.

Desktop entitlements remain authoritative; catalog metadata describes verified distribution versions and offline licenses. FINISH and external channels remain unverified until evidence exists. Dashboard: MY PRODUCTS, MY AUDIO, MY ACCOUNT, UPDATES, Japanese, responsive, existing brand.

Cross-domain connection requires explicit consent, one-time PKCE handoff and a scoped token tied to the existing Auth session; do not put JWTs in URLs. No silent login or broad application ownership. AUDIO frontend is separately hosted: prepare an explicit deployment bundle, do not assume a site push updates it.

Phase 2 actual purchase E2E and actual simultaneous claim tests remain outstanding. No real payment tests are authorized.
