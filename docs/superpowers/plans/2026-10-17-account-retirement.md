# ACCOUNT retirement implementation plan

Goal: guest software delivery while preserving existing purchase rights.
Spec: docs/superpowers/specs/2026-10-17-account-retirement.md
Execution: inline under the user's explicit implementation/deployment instruction.

- [ ] Add regression tests for guest paid delivery, wrong product, pending/refunded purchase, origin, malformed input, size and rate limits; run RED.
- [ ] Implement guest endpoint using existing Square verifier and registry; run all server tests; deploy guest only and verify invalid requests and existing purchase without charges or email.
- [ ] Replace member UI with retirement notice/download routes, add FINISH/EDITOR guest forms, remove ACCOUNT navigation at generators and pages; update privacy, FAQ and support.
- [ ] Archive old guarantee, publish clear prospective wording with no retroactivity and review Square final disclosure before enforcing.
- [ ] Verify guest alternative, then retire only account public API actions, retaining webhook and recovery; preserve DB/Auth/files.
- [ ] Run build and full test suite; review diff; commit, PR, merge and verify deployment if checks pass. Report blockers and exact unverified items.

Review focus: pending/refunded orders never sign; product cross-access denied; old receipts stay valid; generator reruns do not restore member links; webhook/recovery never retired.
