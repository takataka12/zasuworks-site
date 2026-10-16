# Five-product shared trial implementation plan

> **For agentic workers:** Execute the user's approved specification autonomously. Independent product integrations use isolated workspaces; shared module changes require regression checks across consumers. No merge or public release.

**Goal:** All five desktop products use the existing product-bound 168-hour signed trial while paid builds remain DRM-free and compatible.

**Architecture:** Copy the frozen, byte-identical JUCE Trial module to product build roots and call its existing `zasu_enable_trial(target, product)` only from default-OFF trial variants. Guard actual processing/mutation boundaries; preserve serialized project/parameter formats. DAW uses a data-preserving restricted mode rather than plugin dry bypass.

**Tech Stack:** JUCE/CMake, Node test runner, GitHub Actions macOS Universal and Windows x64.

**Spec:** User's 2026-10-16 20:07 JST nineteen-section five-product development request in this conversation. Explicit autonomous execution overrides skill handoff/approval pauses.

## Global constraints

- Product audiences: vocal, loud, finish, vocal_editor, daw. Duration 604800 seconds.
- All public release flags OFF; draft PRs only; no merges, production writes, sales/payment/ads changes or new subscriptions.
- Paid DSP, plugin identifiers and serialized project/parameter formats unchanged; no paid login or DRM.
- Existing VOCAL grant ends 2026-10-22 22:27:31 JST; no reset, extension or cache deletion.
- Keys for automated expiry tests are ephemeral and never authorize real accounts. No private keys/tokens in artifacts/logs.

## Review focus

- Cross-product signed license must be rejected even with the same verification key.
- Ambiguous public flag values must not expose downloads.
- Expiry mid-block must reach safe dry without allocations or clicks; paid audio must not acquire gating.
- Editor worker completion and direct Blob gestures must not bypass expiry guards or destroy saved edits.
- DAW deferred commands/recording finalization must preserve captured media and project backups after expiry.

## Task 1: Shared/site release and evidence guards

Files: `trial/model.mjs`, `tests/trial-model.test.mjs`, `supabase/tests/trial.test.mjs`, dated validation records.

- [x] Reproduce string/number public flag leakage for all five product entries.
- [x] Require exactly boolean true and verify false/malformed flags refuse links.
- [ ] Test five signed audiences against every other audience, exact expiry and tampering with real RSA verification.
- [ ] Run site/account/server/browser regression suite and record only observed results.
- [ ] Persist Windows operator activation/cache restoration and Mac package evidence in draft PR #9.

## Task 2: LOUD and FINISH

Isolated workspaces `rollout-loud` and `rollout-finish`; separate draft branches based on exact product source.

- [ ] Add failing real processor tests for unauthenticated dry/expired and active unchanged DSP.
- [ ] Integrate shared Controller, safe fade, UI and default-OFF trial CMake paths.
- [ ] Run paid/core/state and trial tests locally; preserve product IDs and latency compensation.
- [ ] Add macOS Universal/Windows x64 CI and private candidate SHA/source identity.
- [ ] Push verified changes into draft PRs; inspect actual CI outcome before claiming success.

## Task 3: VOCAL EDITOR and DAW

Isolated workspaces `rollout-editor` and `rollout-daw`; separate source branches to avoid mixing v2.1 performance changes.

- [ ] Add failing access/expiry/state tests at real data mutation boundaries.
- [ ] Editor: guard capture, render publication, direct Blob edits/AUTO EDIT/Undo; keep saved edit/audio state and dry playback safe.
- [ ] DAW: guard new recording/edit/export, finalize existing recording safely; retain open/play/backup and media/history.
- [ ] Add trial UI and frozen shared module without changing paid behaviors/IDs/state.
- [ ] Build/test paid and trial; create draft PRs and macOS/Windows private CI candidates.

## Task 4: Aggregate verification

- [ ] Review independent product diffs against paid compatibility and shared-module invariants.
- [ ] Reconcile source commits, test logs, CI jobs and candidate hashes per product.
- [ ] Report implemented/automated/manual/unverified separately. Missing credentials or host access stay pending while independent work continues.

No claims of scheduled/background continuation after the active execution ends. No new operator action unless a genuinely machine-only gate is selected later.
