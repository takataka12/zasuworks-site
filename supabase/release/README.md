# ZASU DAW 0.0.14 / Build 0.0.15 — Work publication

This branch is **staged, not published**. Main and the production download
function still select 0.0.11. Do not merge this whole branch to main: the
publisher releases the frontend, function and marketing in the required order.

## Reused production flow

- GitHub: takataka12/zasuworks-site, GitHub Pages on main.
- Supabase project: siwmzradvrtetotakkbi. Private bucket: zasu-daw-releases.
- Existing function: zasu-daw-download, custom Square purchase verification.
- Product / redownload URLs and Square link remain unchanged.
- Storage uses immutable versioned paths. Both 0.0.10 and 0.0.11 remain private.
- New objects: 0.0.14/ZASUDAW-0.0.14-macOS-Universal.dmg and
  0.0.14/ZASU-DAW-v0.0.14-Windows-Setup.exe.

## Input

The local Mac and Windows wrappers produce `dist/handoff/*-Handoff.zip` after
their native checks. Each contains the **unmodified** installer, report, native
check results and hashes. Work receives those two ZIPs. Naked DMG/Setup files
can be kept pending, but must have the corresponding evidence before promotion;
do not invent PASS records from a filename or a previous release's tests.

## Work execution (not a command the customer needs to run)

Read `publish-work.js` into the Work JavaScript orchestrator, evaluate it to
obtain its function, then await it with the existing authenticated `tools`:

```js
const publish = eval(source); // source is the checked-in publish-work.js
const result = await publish(tools, {
  root: '/absolute/path/to/this/checkout',
  job: '/absolute/private/path/to/a/NEW/release-job',
  mac: '/absolute/path/to/mac-Handoff.zip',
  windows: '/absolute/path/to/windows-Handoff.zip',
  sevenZip: '/absolute/path/to/7zz' // current Linux 7-Zip, if not on PATH
}, notify);
```

Python 3.9+ and current 7-Zip with DMG/APFS support are needed in Work.
No user Mac credentials are needed by Work. Apple credentials stay in Keychain.
No GitHub/Supabase token needs to be copied out of the connected apps.

The combined release waits for **both** native artifacts before changing the
shared formal-release copy. An earlier-arriving file can be checked and held;
the currently published versions continue working while the other is built.

## Automated gates and ordering

1. Validate native receipts, Version/Build, all required manual/audio checks,
   payload inventory, Setup/app PE and x64 app architecture. Unsigned is allowed.
2. Test/extract the DMG with 7-Zip; read actual Info.plist and Universal Mach-O.
   Linux does not substitute for codesign/notary/stapler or Windows execution.
3. Refuse drift in main or deployed function before remote mutation.
4. Deploy a short-lived transfer helper: random 256-bit capability, only its
   SHA-256 in deployed source, 90-minute expiry, exact paths and byte hashes.
   Old files are read-only. No customer or payment search is implemented.
5. Upload with `upsert:false`, retrieve new AND old files, compare size/SHA-256,
   and reject any public-bucket access.
6. Publish only download.js allowlist/cache refresh. Wait for actual Pages bytes.
7. Deploy/read back purchase function, keeping its authorization code intact.
8. Fetch delivery files, verify byte identity and public unauthorized denial.
9. Publish product/download/home/products copy and release catalog. Actual sizes
   come from the files. Wait for public Pages content, fetch/compare files again.
10. Close transfer helper in `finally`: 410 body and JWT required. No uploads
    remain enabled after success or failure. The capability expires as fallback.

If a post-cutover check fails, restore the original purchase function. If
marketing already committed, create a restoring commit without force pushing.
Never delete the old storage files. A concurrent main edit stops the operation;
rebase the plan on that edit before continuing instead of overwriting it.
Errors explicitly identify a failed rollback; do not report publication then.

`upload-verification.json` and `post-publication-download.json` are local evidence.
No private token, signed download URL, customer identifier or native machine
path is committed. The public release record contains filenames/hashes only.

## Verification boundary

Admin-issued URLs retrieve the exact same private Storage objects delivered
to verified buyers. That is a real network download and hash check, **not** a
paid-customer end-to-end purchase test. The publisher reports this separately.
The last release used this same method. Do not search payment/customer history
to find a test credential. An owner-supplied test order/receipt can optionally
be used with the unchanged public purchase API for a further end-to-end check.

## Pricing copy

Staged copy says FOUNDING USER 1,980円（税込）/ 先着10名 / 通常2,980円（税込）予定 /
今後のアップデート追加料金なし. It does not invent a remaining-count display.
This change does **not** add automatic ten-sale enforcement to Square or change
checkout product names: old purchases require the historical Square title to
remain accepted. Ten-place stock/closing is a separate Square sales setting;
no customer history was searched and no price/quantity setting was changed here.

## Tests

```sh
node --test supabase/tests/daw-download.test.mjs supabase/tests/daw-download-page.test.mjs \
  supabase/tests/release-transfer.test.mjs supabase/tests/release-publish.test.cjs
```

Release tests mock connected apps and are not native Mac/Windows tests. No new
DMG or Setup was available while preparing this branch; the new-binary upload,
API cutover, new public download and new local installation remain NOT RUN.
