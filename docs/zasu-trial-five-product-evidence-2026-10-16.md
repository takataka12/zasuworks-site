# Five-product trial evidence — 2026-10-16 21:54 JST

Deadline: 2026-10-17 01:00 JST. This is an intermediate evidence ledger, not release approval. No operator action is required.

## Verified and pending

| Product | Source / draft PR | Confirmed automated evidence | Candidate and remaining gates |
| --- | --- | --- | --- |
| VOCAL | `1fd2f21bdac256abf5535b65b25ddd46d843fc3c`; zasu-daw PR6 (link below) | Existing Mac/Windows integration CI; operator activation/cache restoration evidence preserved in evening record | Latest Mac signed/notarized DMG operator-verified; older source has full Logic audio/paid migration. Windows VST3/audio and native Intel/AMD remain unverified. |
| LOUD | `dc852ccb249a7e6bea6e2fc60b23adee70bb3b46`; loud PR1 | Run38896949747 success on Mac and Windows; 11/11 groups each; Mac actual both-architecture checks; Windows actual normal/fault Setup, 32 recorded protection checks | Independently downloaded/hash-verified Mac and Windows artifacts. **Ephemeral fixture-key QA only**, not usable for real account activation or customer distribution. No Developer ID/notarization/Authenticode or manual host/audio evidence. |
| FINISH | `ecf66adcdc09e44c22cb3fa0e43997ec6be0e53e`; daw PR8 | Run38898269277 success on both OS; six native tests each, 819300 sample comparisons and 50 state roundtrips, signed expiry/offline/invalid tests; strict auval and Universal checks; 32 installer entries | Staging-key private candidate hashes independently verified. Real-account/hardware/DAW listening and Developer ID/notarization/Authenticode pending. Standalone hosts the effect; the archive's separate WAV PLAYER is not trial-integrated. |
| VOCAL EDITOR | tested C++ `4a250c6a422bdb18a80b177b91493de39feb2a06`; current CI/packaging-only head `b1f0875fad0b6f1cb2715e55e65780ef903b9c1d`; daw PR9 | Linux paid2/2 + trial4/4; Windows native trial4/4; Mac run38900126982 paid3/3 + trial5/5 with strict AU validation and VST3/AU host tests. Local saved-trial-state to paid processor verified without auth | Isolated ephemeral-key QA with browser activation disabled and temporary guarded cache. Windows installer run38901583926 and additional Mac archive run38902766111 pending. Original Mac artifact12046388786 independently matched GitHub digest and already preserves100755 executable modes; all three actual binaries contain both architectures. Deterministic in-flight analysis/render expiry coverage remains a review limitation. |
| DAW | product source `0bcc9792e616059476db7c4e7bec38e5334737a0`; workflow-only head `b54b96f747211f1259ebbee4c8ec127452bbf407`; daw PR7 | Run38897354651 Windows success: paid/no-auth, signed expiry/media-preservation QA, real GUI, Setup and 34 installer entries. Mac paid/signed tests + GUI build passed, packaging architecture command failed | Mac command corrected; run38902639227 pending. Windows artifact independently auditing. Hardware audio, GUI undo interaction and manual project migration not established by these tests. |

All counts describe executed groups/check entries, not unique user scenarios. Local Linux, hosted CI and operator hardware evidence are distinct.

## Reproduced defects corrected

- Site download gate accepted truthy malformed release flags; exact boolean true is now required (five-product RED/GREEN coverage).
- LOUD installer inventory rejected adjacent MSVC import .lib/.exp files: stage exact known product payload before strict inventory; unknown payloads remain rejected.
- FINISH checkout newline conversion broke immutable module hashes: scoped LF attributes. Release output configuration, checksum self-enumeration and manifest/factory metadata corrected.
- FINISH active fade blend could reintroduce NaN/Inf from a zero-weight dry reference: shell-only reference sanitation, demonstrated RED/GREEN; frozen DSP Core unchanged.
- EDITOR expiry gates cover direct Blob mutation and asynchronous publication; preallocated dry capacity now honors host-declared blocks above8192. AU registration/validation is explicit on disposable Mac runners. Packaging sidecars/product basename/UTF-8 test decoding corrected.
- DAW MSVC rejected a large translation literal: split into smaller adjacent literals; all42425 translation bytes preserved. Paid product identity defaults preserved. Misleading status after rejected expired actions corrected. Mac lipo command correction is under verification.

## Private artifacts

- LOUD Setup SHA256: `7ecca4e17e7fa9d20eb6266d3998d3ae532e85ad7ec69b71d198ecc26667db68`; artifact12045061791. Fixture-key QA only.
- FINISH Setup SHA256: `37fe73e5e2631cf3ccb1869c13b56988872bca583fd2831791cf0938207f8027`; artifact12045831728.
- FINISH permission-preserving inner Mac ZIP SHA256: `3b32c2d33a69c76504924682802e37371e31fda10f3d086843231994658cf56d`; artifact12044768927.
- DAW Windows Setup artifact12046307037 and protection evidence12046347020: final independent byte audit pending.
- EDITOR Linux QA artifact12046830163 digest `adb3fd35b506513d40947153dd651953b41ee24216a1e104a8ffa30c0122a673` independently matched. No real-account activation.

Verify executable modes after extraction; nested Mac ZIPs are the preferred portable payload. EDITOR's original artifact was audited and already preserves100755, so the generic mode-loss concern did not reproduce for that artifact. No newly integrated product is approved for general distribution.

## Traceable sources

- [VOCAL PR6](https://github.com/takataka12/zasu-daw/pull/6)
- [LOUD PR1](https://github.com/takataka12/zasu-loud/pull/1), [final CI](https://github.com/takataka12/zasu-loud/actions/runs/38896949747)
- [FINISH PR8](https://github.com/takataka12/zasu-daw/pull/8), [final CI](https://github.com/takataka12/zasu-daw/actions/runs/38898269277)
- [EDITOR PR9](https://github.com/takataka12/zasu-daw/pull/9), [Mac native](https://github.com/takataka12/zasu-daw/actions/runs/38900126982), [Windows installer pending](https://github.com/takataka12/zasu-daw/actions/runs/38901583926), [Mac archive pending](https://github.com/takataka12/zasu-daw/actions/runs/38902766111)
- [DAW PR7](https://github.com/takataka12/zasu-daw/pull/7), [Windows success / initial Mac packaging failure](https://github.com/takataka12/zasu-daw/actions/runs/38897354651), [Mac packaging correction pending](https://github.com/takataka12/zasu-daw/actions/runs/38902639227)
- [Existing VOCAL operator evidence](zasu-trial-candidate-verification-2026-10-16-evening.md)

## Preserved boundaries

All PRs remain draft/unmerged. All five public trial flags remain OFF; no publication, deployment or public download URL is authorized. Paid authentication defaults OFF, DSP identities/state protection reviewed and regression-tested where above. No real grant, production user/payment/sales/ads data was changed. Existing VOCAL expiry remains2026-10-22 22:27:31 JST without agent mutation. No new service was purchased. Signing/notarization and unrun hardware/manual tests remain explicitly incomplete.
