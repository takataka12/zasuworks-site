# Phase 3 evidence ledger

- Feature branch feat/zasu-account-phase3 created from 6825ee1; baseline tracked tree clean. Existing supabase/.temp/ retained.
- Production main a73bd1c; ACCOUNT v3 and Square webhook v12 active. Railway workers successful; no staged changes.
- AUDIO and ACCOUNT share production Supabase siwmzradvrtetotakkbi. Test project giljyqaohutxoxlpkfjf contains corresponding AUDIO tables. All AUDIO buckets private and job tables RLS-enabled without public client policies.
- Anonymous MIX/CONVERT capabilities are SHA-256 hashes of random 256-bit tokens. MASTER application token can be returned by browser-provided visitor ID; historical MASTER auto-claim rejected by design.
- Production AUDIO frontend source downloaded read-only into private reference directory. Hosted separately from GitHub Pages, not in available repository.
- DAW distribution version 0.0.14 (marketing 1.4), VOCAL 1.0.0, LOUD 2.0.0. FINISH distribution not established. No binaries or DSP touched.
- Phase 2 baseline CI 282/282; real purchase E2E and real concurrent claims still unverified.
- TDD supplementary writing-good-tests resource unavailable; use the loaded TDD skill and existing behavior-based tests.

Implementation checkpoint: private AUDIO ownership/session/PKCE connections, new-job wrappers preserving anonymous handlers, desktop catalog reusing Phase 2 offers/releases, Japanese responsive dashboard and separate AUDIO frontend overlay implemented. Unit/browser suite 322/322 passed, zero skipped. Local SDK-backed TypeScript check passed; direct Deno dependency resolution stalled on network, not a product build failure. Remote Edge bundler compiled all five APIs successfully.

Staging: all three additive migrations applied. Transaction tests passed for unique capability ownership, invalid/master/expired claims, code PKCE/replay, scoped disconnect, closure and denied client table/RPC access. Actual HTTP 11 checks passed: history 200, claim 200, unauthenticated 401, cross-resource/profile/missing-file 403, invalid connections 401 in native APIs. Actual private Storage signed download returned exact 3-byte synthetic content, TTL <=300 seconds; test object removed. Temporary fixture-only Storage route removed by restoring normal ACCOUNT v9. All committed synthetic test users/sessions/job/link/connection fixtures removed.

Preservation: native staging functions had additional existing phase0 authentication and differ from production. Wrapped their current staging source rather than replacing it with production source. Valid native creation is blocked without the existing phase0 key; do not bypass this guard or claim full native positive E2E. Current production native files were copied verbatim with only wrapper import/serve changes. Production deployment remains held.

Corrections verified RED→GREEN: actual CONVERT action is create_upload, not create_job; connection preflight preserves existing stage-auth headers. Remaining: fresh security review, final staging bundle refresh/readback, deployment overlay/manifest/report and approval. Phase 2 real purchase/concurrency checks still outstanding.

Final review (fresh gpt-6-astra): no confirmed Critical. Four findings accepted as Important by actual user impact: (1) actual AUDIO column is amount_jpy, (2) vocal-only multipart groups split the output, (3) arbitrary first 100 upload IDs can hide newest MASTER jobs, (4) expiration in an open tab silently created anonymous jobs despite a connected banner. Each reproduced in tests (7 failing cases), fixed in one pass; focused 24/24 and full suite 325/325 pass, no skips. Added service-only owned MASTER history RPC in a fourth additive migration and applied to staging. Final SDK-backed TypeScript check passed. Remote bundler compiled updated ACCOUNT v10 and native wrappers; stage native existing phase0 authentication preserved.

Ruling: do not auto-claim historical MASTER from recoverable application tokens — require support-backed purchase/ownership verification — cost: some legitimate old MASTER history requires manual assistance.
Ruling: retain 24-hour file retention, five-minute AUDIO signed links, and existing ACCOUNT session proofs — no DSP/storage expansion or offline restrictions — cost: already issued signed links remain usable until their short expiry; files may be unavailable after retention.
Ruling: re-grade chunk corruption, omitted latest history and silent anonymous fallback as Important and fix them in the single review pass — user-visible data loss exceeds polish — cost: one additive read-only RPC/migration.
Ruling: preserve existing native staging source and its phase0 gate — no bypass or replacement of other development — cost: native positive E2E remains unverified without the existing staging credential.
Deferred minors: none (all confirmed findings fixed after impact re-grading).

Final staging verification: updated ACCOUNT v10 and all four native wrapper bundles ACTIVE, original verify_jwt settings retained. HTTP authorization checks 11/11 pass on final version. Additional transaction test proves authenticated MASTER upload binding, foreign re-assignment rejection, latest-job retrieval across 110 uploads, 100-job limit, foreign/closed-account rejection; all fixtures rolled back. Repeated HTTP fixtures then removed; no synthetic accounts left. Production has zero Phase 3 tables and main remains a73bd1c. No main push, production Edge deployment, production migration, Square payment/refund, or DSP build performed.
