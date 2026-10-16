# ZASU VOCAL — private Parallels validation protocol

Status: PREPARATION COMPLETE; PAID-DETECTION BLOCK OBSERVED; INSTALL/AUTH/AUDIO NOT YET EXECUTED. See the dated evidence and clone-only branch below. No public release authorization. Do not purchase, renew, or upgrade Parallels or another service.

## Evidence and environment boundary

The intended environment is an existing Parallels Desktop guest on Apple Silicon: Windows 11 ARM running the Windows x64 candidate through emulation. Confirm the actual guest architecture before installing. Record it as `Windows 11 ARM / Parallels / x64 emulation`; success here never establishes Intel/AMD native x64 hardware compatibility. GitHub-hosted Windows installer tests are a third, separate environment.

Record: candidate source commit and SHA-256; Windows version/build; guest native architecture; Parallels version; host Mac architecture; host DAW name/version/architecture; audio interface/driver; sample rate and buffer. Do not include machine serials, passwords, OTPs, tokens, private keys, personal file listings or license contents.

For an unknown environment, the supplied read-only `Inspect-TRIAL-Windows.ps1` reads OS/CPU and boolean VOCAL install locations/registrations; it does not modify the registry, access license contents, install software, or request authentication. In this session the original guest's paid registration and Setup refusal are already established. Do not ask for those facts again. Review only the still-missing clone safety gates below before the next action. Do not send a batch of install/login commands.

## Preconditions before Setup.exe

1. Match candidate.json sourceCommit/key/environment/endpoints to the reviewed staging artifact; independently verify Setup SHA-256. Expected key digest: `27fec33eb59362eaa51bcb7c0d178a1264d60a4a35e90f151f1a9a178c124b8d`; staging API is `giljyqaohutxoxlpkfjf`, browser `http://127.0.0.1:8765/account/`. The ephemeral CI candidate is unsuitable for real-account approval.
2. Record Authenticode status. Current Windows candidate is unsigned: Windows may show an unknown-publisher or SmartScreen warning. This is an unverified distribution gate, not a reason to disable SmartScreen, antivirus or security policy. If execution is blocked, preserve the exact error and stop that stage.
3. Inspect the existing DAW scan paths as well as standard paid VOCAL paths/registration. The same plugin UID is retained; do not rename or co-load paid and trial VST3 modules. If paid VOCAL or an unknown VOCAL module exists, expect Setup to refuse before writing. Do not uninstall or relocate the user's paid installation automatically.
4. Close the DAW and VOCAL. Use a guest snapshot only if that feature already exists and the operator authorizes it. A snapshot is useful rollback preparation but is not a substitute for testing the installer itself.

## Sequential gates

| Stage | Action and expected evidence | Stop condition |
|---|---|---|
| Protected setup | Execute reviewed private Setup as standard user. No elevation requested. Windows Settings registers ZASU VOCAL Trial separately. | Unexpected UAC/elevation, unknown path, paid module present, warning that blocks execution. |
| Paths | Standalone under `%LOCALAPPDATA%\\Programs\\ZASU WORKS\\ZASU VOCAL Trial`; VST3 under `%LOCALAPPDATA%\\Programs\\Common\\VST3\\ZASU VOCAL.vst3`. | Shared/global paid path changed or duplicate UID modules visible. |
| Standalone first launch | Launch without authorizing yet; capture safe diagnostic build/key/cache state and startup error if any. | Missing DLL, crash, freeze or wrong key/config. |
| Private browser page | Start the packaged private validation server inside Windows. Confirm its own startup and private staging banner. Windows localhost is separate from Mac localhost. | Another process owns port 8765, wrong environment, exposed private path or startup failure. Do not kill an unknown process. |
| One normal approval | First read the staging allowlist and existing grant without modifying them. Then one product-originated browser request → login/approval → product activation. Do not resend OTP merely because of delay. | Expired allowlist, rate limit, wrong request/environment or classified authentication failure. Capture safe diagnostics instead of retrying blindly. |
| Signature/save | Diagnostic stages `license_received`, `signature_verified`, `cache_saved`, `activated`, active=true. Compare existing grant expiry without changing it. | Signature mismatch, save failure, incorrect expiry. |
| Offline restart | Exit normally, disconnect guest networking, relaunch; require `cache_restored`, active=true and expected remaining period. Reconnect after evidence. | Reauthentication demanded, inactive license or state loss. |
| Communication recovery | Preserve valid cache. Verify existing activation survives offline/online transition without another grant or OTP. Live pending-exchange fault injection stays in isolated tests. | Cache deletion, repeated approvals or infinite busy state. |
| VST3 host | Use an already available x64 VST3 host under emulation, or an explicitly supported bridge. A native ARM64 host cannot be assumed to load an x64 plugin. Add the standard per-user scan path only if the host supports it. | Host architecture mismatch, duplicate plugin, crash/scan failure. Never copy over the paid global VST3. |
| Real audio | Headphones; vocal plus backing audio; analyze, AUTO FIX and correction ON/OFF; compare audible output, dropouts, clicks and hangs. Record actual rates/buffers. | Unexpected gain/noise/dropout/freeze. Stop playback, retain a safe report. |
| Preset/project | Save a copy with 65% strength and analysis; close/reopen host/project; verify state and audio. Exercise existing automation at 44.1/48 kHz first, then other supported rates. | Lost analysis/parameters/audio or project format changes. |
| Guest restart | Normal Windows guest restart, then launch with networking off and restore the same test project. | Missing cache, inactive trial or changed state. |
| Uninstall | Close hosts; Windows Settings → Apps → ZASU VOCAL Trial → Uninstall. Verify owned unchanged payload removed; cache/projects/presets retained. Modified/locked files must survive. | Paid or foreign files removed, unexpected parent-directory deletion. |
| Paid migration | Only in an operator-approved test guest with an independently supplied paid package: uninstall trial, confirm one plugin location, install paid, open copied project. No login/DRM; same state/audio. | Paid install absent, duplicate UID, lost state, login requirement. |

Each row is its own operator interaction, with purpose and expected output explained before it. Do not claim later rows from success of earlier rows. This document is a protocol, not a record of successful hardware execution.

## Expiry and account preservation

Existing real grant remains `2026-10-22 22:27:31 JST`. No clock changes, cache deletion, grant reset/reissue or extension are permitted. Run expiry in a separate test OS user/guest and an ephemeral-key build with an isolated signed fixture. Current numerical processor/CI expiry evidence covers bounded fade to exact dry, stopped capture/render, 65% and project state preservation. It does not prove audible real-host playback, expired GUI startup or paid migration. Those remain manual gates; do not substitute the real staging artifact for the ephemeral fixture build.

## Completion rule

Parallels pass requires actual installation, one approval/signature/save, offline/restart restoration, VST3 real audio/AUTO FIX, preset/project roundtrip, protected uninstall and paid migration evidence. Intel/AMD native x64, clean-machine SmartScreen behavior and signed Windows distribution remain separate gates. No flags, production endpoints, sales or ads are changed by this protocol.

## Execution evidence and clone-only preparation — 2026-10-16 JST

These are separate from automated CI results:

| Evidence | Result and limit |
|---|---|
| Original Windows paid registration (operator screenshot) | ZASU VOCAL 1.0.0, `C:\Program Files\ZASU WORKS\ZASU VOCAL\`; established, do not repeat. |
| Actual private Setup launch (operator screenshot) | Japanese paid-version detection message stopped installation. It did not request deletion of the paid version. Installation/auth/audio remain untested. |
| Actual uploaded Setup bytes (independent SHA-256 calculation) | `3955a58fac42c87b5022eca675337f01f969a0e7d12ff246d456651257c7d84a`, matches reviewed Windows candidate from commit `44a59ac80f425e30bb4475cf412afc052d6e0ea2`. Unsigned. |
| Original shutdown | Operator reported Windows Start → Power → Shutdown before copying. No need to repeat the copy; current running/stopped state remains a separate safety gate. |
| Original location | `$HOME/Parallels/Windows 11.pvm`, already established. |
| Test copy | `$HOME/Parallels/ZASU-TRIAL-TEST.pvm`; operator's `cp -cR` and full `diff -qr` completed successfully. Do not copy again. |
| Copy registration | Operator opened the test PVM; Parallels displayed `Windows 11 (1)` and a duplicate-MAC prompt; operator selected a new MAC. The display name alone is insufficient authorization to uninstall anything. |

### Capacity and shutdown gate

The copy already exists. APFS copy-on-write does not reserve its future growth, and a same-disk copy is not protection against disk failure. No host/guest free-space measurement has been received: **capacity is not yet confirmed**.

Prepared host tool: `tools/inspect-trial-parallels.sh`. It performs only `df`, `du` and, when available, a read-only Parallels inventory filtered to Name/State/Home. It never starts/stops/registers/renames a VM, changes a MAC, deletes a file or reads guest license data. The CLI may require a supported Parallels edition; failure does not justify a subscription upgrade. On that branch use Control Center → Show in Finder for the test VM and verify the already-known target, without searching for the original path again. The script requires macOS; Linux syntax/platform-guard checks are not macOS execution evidence.

For this existing copy, use **20 GiB available on the Mac and 10 GiB on Windows C:** as conservative project testing budgets, not vendor minimums or guaranteed maximums. Check both before writes and after installation. Keep large media, Windows updates and new DAW downloads outside this budget; recalculate if they are required. `du` totals may double-count shared APFS blocks and must not be subtracted from `df` free space again. If a future independent full copy is needed, budget the allocated source size plus testing headroom on the destination. Low space stops the stage; do not auto-delete anything.

Current state gate before any uninstallation: original must be **stopped**, test copy must be identified by its **Home path**, and only the test copy may run. Suspended, paused, saving and stopping are not stopped. If an additional copy/backup ever becomes necessary, fully shut down the guest first; do not copy a running/suspended VM. Full shutdown can use Windows `shutdown /s /t 0` only when that one action has been explained to the operator. Never force-kill the VM.

### Paid installation in the copy: explicit branch

Copying the PVM also copies paid VOCAL, its registry and plugin. A new MAC does not remove it. The protected trial Setup must continue to refuse until the paid install has been removed **inside the verified disposable copy only**.

1. Read-only safety review: exact test Home path, original stopped, available disk budgets. Do not accept the ambiguous display name `Windows 11 (1)` alone. If CLI inventory is unavailable, inspect the selected VM's Show in Finder result. Do not remove anything yet.
2. With the test VM shut down, isolate **that VM's** Mac sharing: disable shared Mac folders/shared profile/Desktop/Documents redirection and attached external drives that expose original files. Verify test projects and candidate files are on the guest's local `C:` drive, not `\\Mac`, mapped shares or redirected host folders. Use copies of audio/projects only. Do not change the original VM's sharing settings. Shared folders are external state and are not isolated by PVM copying.
3. Boot only the verified test copy. Use Windows Settings → Apps → Installed apps → **ZASU VOCAL** → Uninstall in this copy. Explain this clone-only deletion immediately before asking the operator to do it. The original PVM and original paid installation remain untouched. The source paid Inno installer reviewed in PR #6 removes its installed program/plugin payload, with no AppData/project/media deletion directive; this source review does not prove that every historical installed uninstaller is identical. Stop if its dialog proposes user-data deletion, an unexpected product/path, or shared-drive operations.
4. Run the supplied read-only Windows inspection **in the copy after uninstall**; this is a new postcondition, not repetition of original-environment diagnosis. Require paid registration/global paid VST3 absent. Check DAW custom scan paths too. If anything remains, stop and inspect; never manually erase registry keys, rename the paid plugin to bypass detection, or disable installer protection.
5. Launch the already hash-matched private trial Setup in the copy as standard user. Require no elevation, separate Trial registration, and only per-user paths listed above. Then proceed through the sequential gates one at a time. Do not perform authentication until safe build/key diagnostics, Windows local server and staging allowlist checks are complete.

The trial Setup protection checks all paid registry views and standard paid paths; the supplied read-only inspection is a summary rather than an exhaustive custom-plugin search. Its clean result never overrides Setup's refusal. No destructive or automatic uninstaller command is included in this preparation.

### Recovery

At a failure, stop that stage, retain safe diagnostics, close hosts and shut down **the test copy** normally. Leave it in place for investigation; do not delete or overwrite either PVM. Return to the original by opening its already-known `Windows 11.pvm` only after the copy is stopped. This needs no paid reinstall in the original. Never use "remove from disk" on the original. A Parallels registration error is investigated without copying the test guest over the original.

Paid migration testing is later and separate: trial uninstall in the copy, then a supplied paid installer and a copied test project. It must not borrow or move the original's live installed files. If no paid installer is available, migration remains pending; original-machine Mac compatibility evidence cannot replace Windows migration evidence.

PVM rollback does not roll back server grants. Preserve real expiry `2026-10-22 22:27:31 JST`; no grant reset/extension, cache deletion, key regeneration or clock changes. Expiry fixtures remain isolated from this real-account guest. The last recorded staging allowlist ended at `2026-10-16 21:56:33 JST`; check its current validity read-only before an approval, and do not extend it without authorization.

### Prepared versus still unmeasured

Prepared and reviewed: existing diagnostic script, paid-presence stop branch, candidate SHA match, paid uninstaller source audit, clone-only sequence, shared-data isolation, capacity policy, and recovery. Operator evidence confirms the copy and its initial byte equality. Still unmeasured: current runtime-to-PVM mapping, host/guest free space and actual shared-folder isolation. No claim of clone-only installation, Windows authentication or audio success is made. The next operator interaction must collect only those missing safety facts, beginning with the consolidated read-only host inspection; no repeated paid-version/location search and no authentication retry.

Official shutdown/copy guidance: [Parallels backup guidance](https://kb.parallels.com/en/4859). Read-only inventory follows the [Parallels command-line reference](https://download.parallels.com/desktop/v18/docs/en_US/Parallels%20Desktop%20Command-Line%20Reference.pdf). Unsupported CLI is a fallback condition, not a reason to buy Pro.

## Official architecture/privilege checks (2026-10-16)

The installer uses `ArchitecturesAllowed=x64compatible` and `ArchitecturesInstallIn64BitMode=x64compatible`. Inno's [architecture documentation](https://jrsoftware.org/ishelp/topic_archidentifiers.htm) explicitly includes Windows 11 ARM64 x64 emulation in `x64compatible`; it differs from `x64os`, which would exclude ARM64. No architecture flag change is needed merely to permit Parallels Windows 11 ARM. This is installer eligibility, not evidence of audio performance.

Inno's [PrivilegesRequired documentation](https://jrsoftware.org/ishelp/topic_setup_privilegesrequired.htm) states that `lowest` avoids requesting administrative elevation and selects non-administrative installation mode. The artifact still needs actual standard-user/Windows Settings UX confirmation.

Microsoft's [Windows on Arm emulation documentation](https://learn.microsoft.com/en-us/windows/arm/apps-on-arm-x86-emulation) distinguishes Windows 11 x64 application emulation from driver support: kernel drivers must be ARM64. Do not install an x64-only audio driver into the ARM guest or assume that a Mac audio interface's Windows driver works there. Begin with an already functioning guest audio device; record latency/dropouts separately. No driver installation or paid host purchase is authorized by this test plan.
