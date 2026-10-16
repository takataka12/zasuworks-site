# ZASU VOCAL — private Parallels validation protocol

Status: PREPARED, NOT EXECUTED. No request for operator action while away. No public release authorization. Do not purchase, renew, or upgrade Parallels or another service.

## Evidence and environment boundary

The intended environment is an existing Parallels Desktop guest on Apple Silicon: Windows 11 ARM running the Windows x64 candidate through emulation. Confirm the actual guest architecture before installing. Record it as `Windows 11 ARM / Parallels / x64 emulation`; success here never establishes Intel/AMD native x64 hardware compatibility. GitHub-hosted Windows installer tests are a third, separate environment.

Record: candidate source commit and SHA-256; Windows version/build; guest native architecture; Parallels version; host Mac architecture; host DAW name/version/architecture; audio interface/driver; sample rate and buffer. Do not include machine serials, passwords, OTPs, tokens, private keys, personal file listings or license contents.

First operator action, after return: run the supplied read-only `Inspect-TRIAL-Windows.ps1` in the Windows guest and share its JSON. It reads OS/CPU and boolean VOCAL install locations/registrations; it does not modify the registry, access license contents, install software, or request authentication. Review actual output before the next action. Do not send a batch of install/login commands.

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
