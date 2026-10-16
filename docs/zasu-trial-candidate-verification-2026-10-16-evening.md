# ZASU VOCAL private candidate verification — 2026-10-16 evening JST

This record reconciles existing operator evidence with independently inspected artifacts and CI logs. No operator action is requested by this record. CI results below were read again, not rerun. No public-release authorization.

## Windows candidate: independently checked

Source: `44a59ac80f425e30bb4475cf412afc052d6e0ea2`.
[Release run 38849450585](https://github.com/takataka12/zasu-daw/actions/runs/38849450585), job `116807184333`: success.

The Setup bytes extracted in memory from the downloaded workflow artifact, the actual Setup uploaded by the operator, and candidate.json all agree:
`3955a58fac42c87b5022eca675337f01f969a0e7d12ff246d456651257c7d84a`.

Local Python assertions passed for all three hashes, publicRelease=false, environment=staging, public-key digest matching the Mac-validated digest, and 30 recorded installer checks. The artifact's binary verification report identifies x64 Standalone and VST3, static VC runtime and OS imports. Its report is CI evidence, not a new local execution of these binaries.

Fresh job-log inspection confirms paid/trial processor tests 2/2, PE/dependency inspection, and all 30 installer-check entries. These include paid payload unchanged after refused Setup, paid registry detection, unknown user VST3 refusal, junction protection, clean per-user install, separate uninstall registration, blocked in-place update, modified VST3 preservation, later paid-install preservation, preset/cache preservation, owned-file removal, reinstall, and locked-file cleanup. Repeated successful uninstaller-exit checks are included in the 30 entries; this is not 30 unique scenarios.

Setup, Standalone and VST3 are **unsigned**. SmartScreen and clean-machine distribution acceptance remain open gates. No security setting should be disabled to force acceptance.

Operator screenshot evidence establishes paid VOCAL 1.0.0 and Setup's protective refusal on the original Windows environment. Later clone-only operator execution is recorded below.

## Integration CI

[Run 38851946316](https://github.com/takataka12/zasu-daw/actions/runs/38851946316): macOS job `116814897072` and Windows job `116814897296` both success on fresh job-status retrieval. This does not establish Parallels audio performance or Intel/AMD hardware behavior.

## Latest Mac candidate: operator evidence preserved

Source `1fd2f21bdac256abf5535b65b25ddd46d843fc3c`.
Inner private ZIP SHA-256:
`9946e28607e5f30b8849495264094d5c57535f7effd970bc19db777937ad3f35`.

The operator supplied successful output for all three binary hash checks, Developer ID signatures and strict verification, plus x86_64/arm64 in AU, VST3 and Standalone.
Payload ZIP Apple submission `37c04742-3293-4fb9-85c2-4cd8158b7ef6`: Accepted.
Standalone Staple validation and Gatekeeper: accepted, Notarized Developer ID.

Latest staging DMG Apple submission `bb2a6348-0ed9-4363-ac4e-6468fa58af63`: Accepted.
DMG Staple and Gatekeeper: accepted.
Read-only mounted DMG: checksum valid; three signatures valid; all three Universal architectures present; Standalone Staple valid. Operator reported remaining trial time displayed from the mounted app. Detach succeeded.

Final signed/stapled DMG:
`ZASU-VOCAL-Trial-LATEST-STAGING-Universal.dmg`
SHA-256:
`c677538a42ab7f8f785d07a9b40b3af5b11ff15d5972e1bace894b463bee2ecb`.

These are operator-supplied command results, not commands executed remotely on the operator's Mac. Earlier lipo option errors were inspection-command errors and were resolved with successful architecture output; they are not evidence of a product defect.

Earlier Debug/Release Logic real-audio, analysis/AUTO FIX, 65% project restoration and return-to-paid checks succeeded as reported earlier in the conversation. The latest CI-built candidate has not received a new Logic audio run; do not attach the earlier runtime result to this newer binary as if retested. The latest mounted Standalone display alone does not establish a new authentication flow or offline test.

## Next execution boundary

The PVM copy was made and fully compared by the operator. Both original and copy contain paid VOCAL. Follow the [clone-only protocol](zasu-trial-parallels-validation-2026-10-16.md); do not ask to rediscover known locations or repeat the original paid-presence diagnosis.

The earlier consolidated host inspection script was declined. Later the operator supplied df output (55 GiB host available) and a Windows C: property screenshot (55.0 GB free); both exceed the stated project test budgets. Do not request those measurements again. Complete runtime inventory and shared-folder isolation were not independently evidenced; do not mark them verified merely from capacity or activation success. Operator reported paid VOCAL removed only in the test copy at 19:38, then trial Setup installed at 19:41; screenshot at 19:45 shows trial UI and initial diagnostic has cache_missing.

### Windows operator runtime results, 19:51–19:59 JST

- Windows validation server startup screenshot at 19:51 shows the fixed loopback account URL. No license/private keys read.
- Product-originated new browser tab at 19:52 retained the trial request through ordinary login. At 19:54 the same tab showed ZASU VOCAL approval and authenticated account, without manually moving a request URL.
- Product at 19:55 showed 147 hours remaining. Diagnostic: active=true, busy=false, license_received → signature_verified → cache_saved → activated. Public-key SHA-256 matches the Mac-validated digest. One transport_failed event preceded later HTTP200 responses and final activation; cause of that isolated failure is unknown. This proves recovery in this observed exchange, not every fault mode.
- At 19:59, after instructed app exit/network disconnect/relaunch and subsequent reconnection to share results, operator diagnostic contains only cache_restored, cache_saved, active=true, busy=false. This is application offline restart/cache restoration, not Windows guest reboot.
- Operator reported no Windows DAW available and elected to stop audio/VST3 testing. Do not claim those tests passed or ask to repeat them in this session.

Still pending: actual trial uninstall/reinstall/cache preservation on this guest, guest OS reboot, original paid post-check, VST3 host and Standalone real audio/AUTO FIX, project/preset roundtrip, Windows paid migration. Parallels ARM emulation and native Intel/AMD x64 remain distinct. No grant-expiry equality query was performed after Windows activation; UI/diagnostics alone do not establish exact server timestamps. No grant mutation was requested or performed by the agent.

Mac remaining manual gates include VST3 real-host audio, real-host isolated expiry, Intel execution and additional automation/sample rates. Do not repeat passed Mac checks without a material reason.

Real trial expiry remains `2026-10-22 22:27:31 JST`; no extension/reset is authorized. PRs #9/#6 remain draft and unmerged. No product flags, sales, payments, ads, public URLs, paid DSP/plugin IDs/state formats, or subscription arrangements changed in this work.

