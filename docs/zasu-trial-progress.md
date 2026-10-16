# Trial implementation ledger

Specification: user request 2026-10-15; design docs/zasu-trial-design.md; plan docs/zasu-trial-plan.md.

- Read-only discovery: production account uses custom email verification + session proofs, not plain Supabase getUser. Existing paid rights use commerce_entitlements joined to paid commerce_orders. Reused adapter.authenticate.
- Authoritative VOCAL v1.0.0 source recovered from ReleaseKit source ZIP. Incremental bundle requires unavailable base commit; imported snapshot into an isolated local git branch. No published product files changed.
- Decision: continue within explicit user authorization to implement; no repeated approval of already-specified goal. Separate worktree prevents current analytics work being overwritten.
- DB: new tables and RPCs applied only to existing AUDIO v2 STAGING project. All five products released=false. Transactional fixture tests passed and rolled back.
- API: input/auth/PKCE/RS256/expiry/exception privacy tests passed. Staging Edge Function deployed with no private signing key; catalog works, unsigned activation fails closed. Production untouched.
- Native: time/fade tests compiled and passed. WebCrypto RSA signature verified by JUCE 8.0.15 verifier; tamper/product/key rejection passed. VOCAL paid/trial build checks in progress.
- Web: account trials and explicit authorization preview implemented; 11 existing account browser tests and 4 new trial browser tests pass with local Chromium headless shell. No trial begins on page view.
- Release gates: Mac actual hardware/Logic/notary and Windows x64 installer/host tests are unavailable here. Phase 3 is blocked until VOCAL completes these gates, per user request. Never relabel Linux checks as native QA.
