# ZASU TRIAL SYSTEM — implementation design

Status: development; no product is approved for public trial distribution.

The user's 2026-10-15 specification is the authority: five independent 168-hour trials, existing ZASU ACCOUNT, no card or automatic billing, DRM-free paid builds, unchanged DSP/IDs/state, verified Mac and Windows packages before public links.

## Distribution decision

| Approach | Existing buyers | Maintenance | Sessions | Decision |
|---|---|---|---|---|
| A: separate source/build | Paid unaffected | Divergent DSP risk | Same IDs possible | Avoid source duplication |
| B: common binary | Authentication may leak into paid path | One binary | Simplest replacement | Reject new runtime dependency for paid use |
| C: common DSP, separate build/package | Paid compiles without trial module | One DSP, two packages | Same IDs/state; replace trial with paid | Adopt |

Paid is the default. Trial builds explicitly enable an additional module and supply product ID and verification public key. No runtime switch unlocks a paid build. Never install trial and paid versions together; installing paid replaces trial at the same path. Host rescan/restart and project restore are release gates. No plugin identifiers or preset serialization fields change.

## Server and authentication

Add independent `zasu-trial` Edge Function, reusing the existing account adapter's `authenticate()` (confirmed email, account profile and session proof). Do not change existing login, purchases or webhook endpoints. Native client generates a random verifier (256 bits), sends its S256 challenge to create a ten-minute browser authorization request. Only request ID appears in browser fragment. Existing account UI displays product and requests explicit start confirmation. Native polls with verifier over TLS; no account token ever reaches desktop. Authorization and exchange recheck account session. First successful exchange starts the product trial using database time. A unique (user, product) grant and transactional ON CONFLICT prevent restart or duplicate issuance. Retry exchanges within request lifetime return the same grant; never another 168 hours.

Tables and RPCs are service-role only except self-read policy on grants. Client cannot choose user, timestamps, duration, signing key or purchase status. Product release flags default false and must stay false until platform QA. A disabled product cannot consume a trial. Each released platform requires a verified package URL and SHA256. Per-action request rate limits use existing database limiter; no raw IP, email, hardware ID or fingerprint is stored in trial records. Random installation identifiers and artificial device limits are omitted for user convenience; multiple personal machines share the same expiry.

## License and desktop

RS256 compact signed license (fixed algorithm, 2048-bit RSA): issuer, audience/product, trial entitlement UUID, issued/server time, original start, expiry, schema version. No email/account bearer credential. Private JWK only in server environment `ZASU_TRIAL_PRIVATE_JWK`; public key only in client. Initial activation requires network; signed license works offline until original expiry. Login again restores same grant after reinstall; deleting cache never grants a new period. Clock uses maximum of persisted observed time, wall clock and monotonic elapsed time. Wall rollback beyond tolerance requires online authentication. Local cache deletion can weaken rollback detection; document this limit, do not add invasive DRM.

Audio thread reads atomic access state and performs bounded preallocated dry/wet fade (50ms minimum) after latency-aligned dry capture. Authentication/network/disk/UI never runs on audio thread. Paid processing does not link trial code. Expiration preserves parameters/state, transitions to raw bypass, and never clears unrelated output. DSP latency and channel-layout tests are mandatory at VOCAL integration. DAW expiration permits open/view/save-copy/backups and playback, disables editing/record/export at command and engine boundaries, preserves existing files. DAW work waits until VOCAL gates pass.

## Web and operations

`/trial/` and product CTAs are source-only until packages pass QA. Account adds trial management and browser approval panel, uses existing session refresh and API. Download and purchase URLs come from validated catalog. Analytics honors current consent and records observed page/button/download completion/activation only; no trial events include account ID/license/request/verifier. No synthetic desktop-start, expiry, signup or purchase event.

Admin statistics are aggregate and restricted to explicit account user allowlist in server environment. No extension/test-license API initially; this avoids a privilege surface until operational need exists. Conversion queries report only account-linked paid purchases, with earliest verified purchase on/after original start. BOOTH/unlinked purchases cannot be inferred.

## Release gates

Automated protocol, crypto, database race/RLS and failure tests; real product DSP/state regression; Mac Universal signature/notary/staple and Logic AU; Windows x64 install/uninstall and host tests. Never publish a fake download, source ZIP as installer, or an unverified package. Missing native environments or private key setup is a blocker, not a passed gate.
