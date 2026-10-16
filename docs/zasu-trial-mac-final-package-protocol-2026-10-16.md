# VOCAL — latest Mac private Release package protocol

Prepared only. Requires the operator's Mac, Developer ID private signing identity in the existing Keychain and the existing notary profile. Do not export credentials to CI or ask the operator for Apple passwords, private keys or tokens. No operator action is requested while away.

## Baseline versus latest source

The previously verified Universal staging DMG is from source `1e7cadf`, SHA-256 `6d34b3006c4101391e48c5c36f45df3b60b8374c4a8414f0f3f3243fbac237d7`. Its Standalone and enclosing DMG were notarized, stapled and Gatekeeper accepted; its Release AU passed Logic processing/state/paid migration. It does not contain the later watchdog correction. Keep it and its report unchanged.

Latest source currently includes the pre-thread absolute watchdog deadline correction plus Mac developer-entry staging URL pairing. Before creating a new Release, freeze the exact reviewed PR #6 commit and verify CI for that commit. Record the full SHA, not only a branch name. The new artifact gets a fresh output directory/name/hash; never overwrite the baseline or reuse its validation claims.

## Pipeline and acceptance evidence

| Gate | Required operation / evidence | Current boundary |
|---|---|---|
| Configuration | Existing public modulus digest `27fec33e...24b8d`, staging API `giljyqaohutxoxlpkfjf`, browser `http://127.0.0.1:8765/account/`; no private signing key as a build input. | Public key verified; latest Mac Release not built locally. |
| Isolated Release | Fresh CMake build directory; Release; `CMAKE_OSX_ARCHITECTURES=arm64;x86_64`; trial ON; exact public key and endpoints passed explicitly. Build AU, VST3, Standalone and paid/trial processor tests. Run relevant CTest, preserving logs. | Existing Build-TRIAL-Mac.command is Debug only; do not present it as this Release pipeline. |
| No installation | `COPY_PLUGIN_AFTER_BUILD FALSE`; leave `/Library/Audio/Plug-Ins` and user Components/VST3 unchanged. Do not run a product during packaging. | Required throughout. |
| Architectures/metadata | For all three actual main binaries, `lipo -archs` must show x86_64 and arm64. Inspect Info.plist bundle IDs/version/microphone description, deployment target and linked libraries. | Universal byte structure does not prove Intel hardware execution. |
| Developer ID signing | Sign nested Mach-O/bundles before parents, runtime+timestamp. Standalone uses the existing audio-input entitlement. Validate entitlement contents; no debug/get-task-allow or unnecessary privileges. `codesign --verify --deep --strict` all three. | Only the operator's local certificate/private key can complete it. No `--deep --sign` shortcut. |
| Payload notarization | Archive the signed three-format payload with ditto; submit using existing `ZASU-DAW-NOTARY` Keychain profile; preserve submission ID/status/log. Require Accepted; inspect rejection evidence before changes. | No new Apple account/profile purchase/setup or credential export. |
| Staple application | Staple and validate Standalone; Gatekeeper execute assessment accepted as Notarized Developer ID. AU/VST3 are covered by notarized payload/container; do not claim standalone plugin staple support. | Not yet done for latest source. |
| Private DMG | Fresh staging folder copies only signed AU/VST3/Standalone and private READ-ME/install/uninstall instructions. No `.env`, private JWK, tokens, license cache, build fixture or source checkout. Label localhost/staging/non-public. Create compressed DMG. | No automatic installer; explicit paid-file protection is essential. |
| Container quality | Sign DMG, verify, submit notarization, require Accepted, staple+validate, Gatekeeper open assessment, `hdiutil verify`. Record logs/IDs. | Not yet done for latest source. |
| Mounted content | Mount read-only at a fresh mountpoint; verify three signatures and actual architecture/metadata inside; validate app staple. Compare payload files/hash inventory; detach only own mountpoint. | Do not treat successful mount as successful product/audio launch. |
| Final identity | Hash final stapled DMG with SHA-256; record exact source/key/endpoints, signing identity/team, notarization IDs, architecture inventory, checksum and every untested gate. | Hash after final mutation, not before staple. |

Use the existing certificate and profile only after their local availability is confirmed. The implementation phase here does not execute signing, notarization or Gatekeeper on Linux. Apple tool simulations are not evidence of Apple acceptance.

## Paid installation and uninstall safety

AU/VST3 keep paid IDs for project compatibility. Do not drag the private trial over a paid plugin. For any temporary-swap test: close all hosts, verify a byte-identical paid backup, check that destinations and archive names are absent, temporarily move the original, place only the verified trial, validate its signature and AU scan, and retain a precise recovery record. Restore the exact original and compare against its backup before paid-project verification. Stop on any pre-existing unexpected destination. Do not recursively delete plugin parents or clear AU caches as a default workaround.

Standalone stays in its dedicated candidate directory. Removing that dedicated copy must not remove preferences, projects, presets or trial state. A public installer/migration UX remains a separate release gate; the private DMG is not public-installation quality proof.

## Hardware gates after packaging

Remaining: actual GUI VST3-host recognition, audio/analysis/AUTO FIX and state/paid migration; Intel Mac; real-host rates/automation/presets; clean-user downloaded/quarantined first launch; Logic expiry with a distinct test OS account and ephemeral-key fixture AU. Never change the real grant ending 2026-10-22 22:27:31 JST, system clock or real cache. No GUI expiry fixture build has yet been delivered; numerical isolated expiry success alone cannot complete that gate.

Only approve a public candidate after production configuration is separately frozen, the current artifact passes hardware/distribution gates and the operator explicitly authorizes release. PR #6/#9 remain draft/unmerged, all public flags remain false and sales/advertising are unchanged.


## CI preparation completed after this protocol was written

Source `1fd2f21bdac256abf5535b65b25ddd46d843fc3c` now has a successful [actual Universal Release preparation build](https://github.com/takataka12/zasu-daw/actions/runs/38851946359). AU/VST3/Standalone and paid/trial processor tests passed. [Independent downloaded-artifact verification](zasu-trial-mac-staging-verification-2026-10-16.json) confirms both slices, compiled key/endpoints, main-binary minimum OS 11.0.0 and file hashes. This completes the unsigned/ad-hoc CI preparation boundary only: no latest-source Developer ID/notarization/staple/DMG/hardware gate is completed by it.


The existing CI signing references were checked by a separate presence-only diagnostic workflow: all five app/notary settings were unavailable. Therefore the Developer ID / Apple notarization steps are blocked on the existing local Keychain, not merely omitted by choice. No private credential export is requested. See the [distribution evidence](zasu-trial-distribution-qa-2026-10-16.md#apple-signing-availability-was-checked-not-assumed).
