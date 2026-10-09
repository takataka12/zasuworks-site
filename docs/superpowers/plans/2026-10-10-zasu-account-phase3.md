# Phase 3 execution plan

1. Preserve baseline and record production evidence (done).
2. Add and test ownership/expiration rules, private AUDIO link migration and account API history/claim integration.
3. Add scoped cross-domain handoff and native creation adapters; preserve anonymous handlers.
4. Reuse verified desktop catalog in dashboard; add AUDIO and owned-product updates.
5. Run Phase 1/2 regression, authorization and responsive browser tests, staging-only synthetic database/API checks.
6. Review changes, prepare production migration/function/static/AUDIO bundle and report; request deployment approval.

Implementation is explicitly authorized by the user; skill design-approval checkpoints do not introduce additional permission gates. No production write, destructive change, real payment/refund, DSP change, or rebuild of desktop binaries.
