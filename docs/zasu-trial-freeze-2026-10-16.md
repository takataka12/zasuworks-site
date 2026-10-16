# ZASU TRIAL SYSTEM — owner freeze, 2026-10-16 JST

Owner instruction at22:35JST supersedes all implementation/deadline/retry instructions. No autonomous restart without an explicit new owner instruction.

## Stop actions completed

- Active EDITOR agent interrupted. No further development/build/test/sign/notarize/installer/publication work authorized.
- 01:00JST report automation disabled.
- Automatic push/pull_request/scheduled triggers removed from17 trial workflow copies across7 branches. Manual workflow_dispatch remains structurally present, but EVERY job is guarded with literal false; manual dispatch cannot schedule a runner under this committed definition.
- Freeze commits use skip-ci and were checked by read-only retrieval, not a new CI run.
- No freeze-commit workflow run observed on last inspection. Site and LOUD repositories had no active runs.
- Product source, paid DSP/authentication/IDs/state, sales/payments/purchaser rights, production configuration and existing grant data were not modified.
- All associated open PRs verified draft=true; branches and prior commits preserved.

| Repository / branch | Freeze commit | Workflow copies |
| --- | --- | --- |
| zasu-daw / codex/zasu-trial-vocal-editor | `865aa93cb3ca4ba46bda681c7c36912b3e58cc88` | 1 |
| zasu-daw / codex/zasu-trial-daw | `d2a31f23d1df670484d7c1b1a81cca306b3ad0d7` | 1 |
| zasu-daw / codex/zasu-trial-finish | `942e54404834729a93b529857f13841affaae7b5` | 1 |
| zasu-daw / codex/zasu-trial-signing-readiness | `45f0dc8fcb4359e9fa7492b74db62b90758638b2` | 6 |
| zasu-daw / codex/zasu-trial-vocal | `e28ceea07264401b266fdbc132b2ee9a55cd7796` | 5 |
| zasu-loud / codex/zasu-trial-loud | `eb742088f7332c470bdbb805045a5642609dde0f` | 1 |
| zasuworks-site / codex/zasu-trial-system | `9a6c7c0869fa6b82475f7bb2566621ae1c435d45` | 2 |

## Unresolved immediate cancellation

Run [38906912605](https://github.com/takataka12/zasu-daw/actions/runs/38906912605), VOCAL EDITOR static-runtime retry, was still in_progress after the freeze commits. Its pre-existing runner is NOT terminated by changing the workflow definition. The connected GitHub tools expose reads and reruns, but no run cancellation or workflow-disable operation; no authenticated gh CLI is installed. Do not claim it cancelled. Owner action in Actions → Cancel workflow, or explicit browser-fallback authorization, is required.

Repository-level disabled_manually state was not set through GitHub administration. The17 source definitions are instead frozen with no automatic triggers and false job guards. Reverting them would remove this freeze.

## Billing

Cumulative cost, budget/spending limit and payment settings are UNKNOWN: current connector excludes account/organization billing administration APIs. No new build or test was started to inspect costs. Do not use screenshot estimates as an independently verified bill.

## Preserved product evidence

| Product | Last implemented source | Existing evidence / remaining limits |
| --- | --- | --- |
| VOCAL | `1fd2f21bdac256abf5535b65b25ddd46d843fc3c` | Mac operator auth/offline/Logic/paid migration evidence retained with source distinctions; Windows Parallels auth/cache restore; Windows VST3/audio still unverified. Native PR6. |
| LOUD | `dc852ccb249a7e6bea6e2fc60b23adee70bb3b46` | Run38896949747 Mac/Windows11groups each,32 installer check entries, hash/architecture audits. LOUD PR1. Fixture-key QA only. Manual activation button lacks QA inhibition; never use these candidates for real activation. No real trial consumption demonstrated. |
| FINISH | `ecf66adcdc09e44c22cb3fa0e43997ec6be0e53e` | Run38898269277 bothOS6groups,32 installer entries, Universal/auval/hashes. DAW PR8. Staging only; separate archived WAV PLAYER not trial-integrated. |
| VOCAL EDITOR | C++ `4a250c6a422bdb18a80b177b91493de39feb2a06`; latest pre-freeze CI/auditor `c7796350cc8d0216806c75f1d8b6ed88ab57d56c` | Mac38902766111 paid3/trial5, Universal/auval/archive verified. Windows38901583926 paid2/trial4 and32 installer entries pass, but payload depends on external VC runtime. Static-runtime correction was still running at freeze; unverified. DAW PR9. |
| DAW | `b54b96f747211f1259ebbee4c8ec127452bbf407` | Run38902639227 bothOSsuccess, signed expiry/project/media tests,34 installer entries, artifact hashes verified. DAW PR7. Manual hardware/GUI undo/signing/notarization remain open. |

Private Actions artifact references (subject to GitHub retention; not public releases):
- LOUD Mac12044238564, WindowsSetup12045061791, products12044637590, installer evidence12044987001.
- FINISH Mac12044768927, Windows12045831728, run38898269277.
- EDITOR Mac12048875425; prior Windows12048332368 (shared-CRT dependency caveat), Linux12046830163.
- DAW Mac12048047778, Windows12048564368, safety12049200716, run38902639227.
- Existing VOCAL Mac signed/notarized DMG remains on operator Mac. Its final SHA256 c677538a42ab7f8f785d07a9b40b3af5b11ff15d5972e1bace894b463bee2ecb is recorded in the evening verification document.

Artifacts were not deleted. Actions retention expiry is not disabled by preserving a branch; permanent retention/export of any not-yet-exported candidate remains an explicit follow-up preservation task, not a reason to build again. No source branches or commits were deleted.

## Publication / restart

All five public trial flags were last observed OFF in the existing read-only catalog inspection; no flag mutation or production deployment occurred during freeze. This freeze did not independently re-query production grant data. Existing VOCAL expiry2026-10-22 22:27:31JST was not changed.

Before any future restart: obtain explicit owner authorization and cost cap; resolve LOUD fixture activation safety, EDITOR clean-Windows runtime result, paid/host/hardware gates, actual signing/notarization and real-user browser flow. Reuse preserved evidence rather than repeating known operator actions. No merge/general distribution without separate owner approval.
