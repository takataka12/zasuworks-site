# VOCAL trial distribution QA — 2026-10-16

Private development only. PR #9 and #6 remain draft/unmerged. This record separates implementation, automated evidence and hardware evidence. No production deployment, general download publication, paid service purchase, OTP retry or real grant modification was performed.

## Installer decision and ownership

Adopt separate trial installer registration and per-user application location, with explicit uninstall-before-migration. Reject replacing an installed paid product. Installer AppId `jp.zasuworks.ZASUVOCAL.trial.windows` is distinct from the paid package; the VST3 UID is unchanged.

The standalone goes under `%LOCALAPPDATA%\Programs\ZASU WORKS\ZASU VOCAL Trial`; VST3 uses `%LOCALAPPDATA%\Programs\Common\VST3\ZASU VOCAL.vst3`. Setup requests no elevation. Known paid registrations/paths/global VST3 and existing unknown user VST3 cause refusal before payload writes. Updates and downgrades refuse existing trial files: close the host, uninstall, then install the new package. Arbitrary custom DAW scan directories cannot all be discovered; they remain a pre-install hardware check.

Uninstall deletes only compiled-in payload paths whose SHA-256 still matches. Modified, unreadable, locked and foreign files survive. It never recursively deletes shared VST3 folders, presets, projects or the license cache. A paid module introduced after trial setup survives trial uninstall. Reparse points and directory overrides are rejected.

## Defects reproduced and fixed

1. Inno's `uninsneveruninstall` protects files from its automatic uninstaller, but also excludes them from automatic failed-install rollback. A deliberate second-payload copy obstruction produced a real setup failure and left the first file behind. Fix: track whether installation actually began/completed, and run the same hash-bound cleanup on incomplete setup. A preflight rejection never runs cleanup. The fault-injection compile flag is used only in the disposable CI test installer.
2. An exclusively opened payload makes `GetSHA256OfFile` throw. The original cleanup aborted, preventing cleanup of later owned files. A real Windows installer/uninstaller regression reproduced this. Fix: catch hash-read failure per file, preserve that file and continue cleaning other owned files.
3. Browser account navigation was visible while initial session validation was pending. A settings click could be overwritten by the eventual account-load callback. A deterministic held-response test failed before the fix; navigation now stays hidden until initial validation finishes.
4. The added VST3-only trial test host compiled a macOS AU format reference even though `JUCE_PLUGINHOST_AU` was disabled. macOS compilation failed with `no member named AudioUnitPluginFormat`. Commit `dac23767e802198f7bbcd13fd44f4be13dc0eea9` guards that branch by both platform and enabled format. Paid AU-enabled host behavior is retained. Final native/release CI is tracked at that commit below.

No test was removed, disabled or retried into a passing result to resolve these defects. Superseded CI runs may be cancelled by branch concurrency; current-commit results must be evaluated separately.

## Automated evidence

| Scope | Source | Evidence / limits |
|---|---|---|
| Installer and packaging | `dac23767e802198f7bbcd13fd44f4be13dc0eea9` | [Distribution CI](https://github.com/takataka12/zasu-daw/actions/runs/38838632802): synthetic-payload actual Setup.exe protection job passed 32 assertions; packaging job passed 19 tests. Real Release payload job is tracked separately below. |
| Browser handoff/cancellation/navigation | `0fc37a49b455030eebe4facd547df0c7b3053a46` | [Browser CI](https://github.com/takataka12/zasuworks-site/actions/runs/38837928677): Windows, macOS and Linux jobs passed, 44 targeted tests each; full prepared-site suite on Linux passed 552/552, zero skipped. HTTP is mocked; no real OTP is sent. |
| Paid processor source invariants | same native source | Local existing Python VOCAL regression: 7/7. This does not substitute for native processor/host CI. |
| Native Mac/Windows integration | `dac23767e802198f7bbcd13fd44f4be13dc0eea9` | [Candidate CI](https://github.com/takataka12/zasu-daw/actions/runs/38838632787) passed both complete OS jobs. Mac job `116773442462`, Windows job `116773442808`: paid processor, trial processor, actual loaded VST3 host and common controller/signature/cache/network recovery tests all passed. Core tests 4/4 per OS; Mac core configuration enables AddressSanitizer. Actual-host failures: zero. |
| Windows runtime dependency gate | `0e0b02cb426be193225b87235d797ed604a8efaa` | [Runtime-policy job](https://github.com/takataka12/zasu-daw/actions/runs/38840144184/job/116778422952) passed: actual MSVC `/MD` binaries were rejected, `/MT` binaries accepted, x64 PE headers/imports inspected. Full product Release build and repeated integration CI at this commit are still in progress. |

The 32 installer assertions cover paid-path/registry refusal, unknown user VST3 refusal, junction refusal, `/DIR` override refusal, injected installation failure and rollback, clean install, trial registration, update refusal, modified module preservation, paid module introduced later, foreign preset/cache preservation, uninstall/reinstall, locked payload handling and junction-safe uninstall. They run on a disposable GitHub-hosted Windows VM. They do not prove real hardware audio or Windows restart behavior.

The downloaded macOS core log also contains `PASS transient exchange failure recovers with original request`, `PASS signed license receipt, activation, atomic save, offline restart, active-click guard`, and signature tamper/wrong-key rejection. The ASan configuration uses `detect_leaks=0`; it is not a leak-free certification or a product/DAW-wide sanitizer run.

| Requested Windows scenario | Automated boundary | Hardware boundary |
|---|---|---|
| Clean environment | Actual silent install and per-user paths | First interactive launch pending |
| Paid only | Paid registry/path sentinels block setup; hashes unchanged | Actual purchased package pending |
| Trial only | Dedicated registration and install payload verified | Audio/authentication pending |
| Trial to paid migration | Trial uninstall preserves later global paid sentinel | Actual paid module/project migration pending |
| Trial attempted with paid present | Refused before writes | Running paid DAW not exercised |
| Trial uninstall | Exact-hash removal, foreign/cache preservation, locked-file continuation | Windows Settings interactive UX pending |
| Reinstall | Actual uninstall/reinstall succeeds | User environment pending |
| Old version/update | Existing files cause safe refusal; no in-place updater | Prior shipping trial does not exist; explicit migration pending |
| Installation failure | Real copy failure and ownership-bound rollback | Power loss/crash recovery not exercised |
| Windows restart | Not performed | Pending |

## Browser behavior and completion boundary

Existing request restoration supports pre-login and signup/OTP continuation, explicit handoff from another logged-in tab, expired requests, duplicate click prevention and communication retry. New cancellation buttons clear only this tab's pending request/OTP continuation and invalidate late inspection responses. They do not revoke an already approved grant or cancel another tab. Product polling can continue until its existing maximum ten-minute timeout; the Japanese message says so. Cancellation during an in-flight approval is disabled to avoid claiming that an already sent approval was cancelled.

The preceding Mac session demonstrated approval from a logged-in tab and activation without manually transporting the request URL. First-time signup/email verification on real user hardware remains pending; mock-browser tests alone do not complete that gate.

## Configuration and paid-product protection

Product DSP, plugin IDs and saved-state representation were not changed in this phase. Native edits are build/test-host/integration infrastructure and a separate trial installer. Paid builds retain the existing DRM-free processor target. Native regression CI and actual host migration are distinct evidence.

The recursive Git trees at baseline `1e7cadf7d59e3a2580b0c2b0c51f91906afa5e8e` and current `dac23767e802198f7bbcd13fd44f4be13dc0eea9` were compared. Exactly 13 blob paths changed, all workflows/build/installer/test/documentation files. No `plugins/vocal/Source/` or shared DSP source blob changed; processor/header blobs are identical. The CMake plugin identity remains `Zasu/ZV01`; new definitions apply only to the test-host target.

CI Release packages use ephemeral public keys and `example.invalid` API endpoints. They cannot authenticate the real staging account. The staging Windows builder accepts only the existing public RSA modulus and pins the staging API/localhost browser endpoint. Never transfer `trial.env`, private keys, OTPs or tokens. This workspace has the known public-key digest, not the full existing staging public modulus, so it cannot yet create a real-account Windows staging package. Windows code signing has not been provisioned; inspect the generated Authenticode status and hashes, and do not disable SmartScreen.

The Release builder now explicitly selects `CMAKE_MSVC_RUNTIME_LIBRARY=MultiThreaded`. Without that selection CMake's Windows-MSVC default is `MultiThreaded...DLL` (`/MD` for Release); a developer runner's installed VC redistributable can mask the missing dependency. Before compiling Setup.exe the builder inspects both actual payload binaries, records x64 PE machine/imports/SHA-256/Authenticode, and rejects dynamic VC/debug/missing imports using the existing release-verification module. The negative-control `/MD` probe and positive `/MT` probe above use real compiled executable images, not mocked DLL-name lists. This gate does not substitute for a clean Windows VM or hardware first launch.

Read-only staging queries confirmed all five release flags false and the real VOCAL grant unchanged: start `2026-10-15 22:27:31.014479 JST`, expiry `2026-10-22 22:27:31.014479 JST`, last authentication `2026-10-16 08:05:23.772645 JST`. No grant or allowlist extension was made.

## Mac evidence and residual work

The prior real-Mac record remains authoritative: [Mac validation](zasu-trial-mac-validation-2026-10-16.md). The notarized staging DMG from source `1e7cadf` has SHA-256 `6d34b3006c4101391e48c5c36f45df3b60b8374c4a8414f0f3f3243fbac237d7`. It remains a localhost/staging configuration, not a public build.

Still pending: real GUI VST3-host audio/state/paid migration; Logic playback across expiry in a distinct OS test account with an ephemeral-key test AU; Intel hardware; real-host sample rates/automation/presets; downloaded/quarantined clean-user launch; public-quality installation/uninstallation UX. Numerical isolated expiry testing does not prove click-free Logic playback. Do not change the real account's grant, clock or cache to run this test.

## Remaining products and release gates

[Four-product source inventory](zasu-trial-rollout-inventory-2026-10-16.md) records inspected commits, identifiers and saved-state formats for LOUD, FINISH, VOCAL EDITOR and DAW. No trial integration was rolled into those products. The shared module can be reused only after VOCAL's unresolved hardware/distribution gates pass.

Public release remains blocked on Windows real-account/audio/DAW/migration/restart validation, real staging-key packaging and signing policy, Mac residual gates, general-user browser authentication evidence, final production configuration/keys/endpoints/package rebuild and explicit user approval. No current CI artifact is authorized for public distribution.

The user confirmed that the available Windows environment runs on the Mac. Exact Windows/CPU architecture and virtualization product are not yet confirmed. Record ARM64 x64 emulation as such; never call it native x64 hardware. First hardware action will be a read-only environment inventory, after current CI verification.
