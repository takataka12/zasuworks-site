# ZASU MEDIA indefinite operational pause

Owner instruction: 2026-10-17 JST. Restart requires a new explicit owner instruction. Do not restart MEDIA, AUDIO, or TRIAL as a side effect of this change.

## Scope and implementation

- Base: `1c9671df1f7f70b6184869287dd271cb0aa3d2d6`, after AUDIO pause PR #10. MEDIA-only branch; frozen trial PR #9 is excluded.
- Remove the mail composer, draft/copy/send controls and recruitment copy from the MEDIA homepage. Keep `#submit` as a permanent pause notice for existing links.
- Disable the former composer JavaScript as defense against mixed cached HTML/assets. There was no submission `fetch`, server endpoint, database insert or automatic acknowledgement in this flow: it generated `mailto:` content only.
- Show the owner's pause notice on every generated editorial page, preserve editorial/archive/sample pages, stop application CTAs, and reject a nonempty review manifest at build time. There were zero published third-party reviews at suspension.
- Preserve existing navigation labels and product routes. Homepage MEDIA card links to the pause notice. MEDIA context navigation no longer advertises applications.
- Preserve the prior exclusion of the MEDIA homepage from session recording after removing its form. A DOM opt-out marker is checked alongside the existing form exclusion; no consent, purchase, authentication, or download logic changes. Bump the shared analytics asset version to invalidate cached code; generated product pages receive only that asset URL change.

## Infrastructure inventory

- Host: existing shared GitHub Pages workflow. No scheduled MEDIA workflow. Keep the shared workflow because it also publishes the storefront, ACCOUNT UI and support pages. The editorial build is local static rendering with no external API or AI calls.
- Production and staging Supabase: no MEDIA/review tables or MEDIA submission function found. Product asset buckets named `zasu-vocal-media` / `zasu-loud-media` are software product media, not ZASU MEDIA intake, and must remain.
- Production cron jobs: ACCOUNT commerce recovery and regular bundle pricing remain active. AUDIO cron jobs were already inactive. None was changed by MEDIA suspension.
- Railway: both accessible projects contain AUDIO engine workers/staging frontend, no MEDIA service. No mutations, contracts, volumes or services removed.
- No dedicated MEDIA paid resource or stoppable recurring automation identified. Shared bills are not attributable to MEDIA using this inventory. Confirmed incremental recurring savings: zero; exact shared hosting/storage/Actions allocation not available. No invented monthly/annual saving.

## Preservation and privacy

- Prior form implementation and visual design remain recoverable from Git history at the base commit. Current CSS, editorial renderer, review schema/validator, sample and creator note remain in source. Generated routes are rebuilt by `node tools/build-media.cjs`; generated HTML is ignored by Git by existing policy.
- Existing submission/response threads remain in the original mailbox. No applicant personal data or correspondence copied into this public repository, build output or backups. No inbox deletion or new retention promise is made. Keep correspondence only for existing application follow-up; review retention after the closure notice is delivered and questions are resolved, not for indefinite inactive marketing use.
- No new secret, API key, customer data or database dump is added.

## Restart procedure

1. Obtain explicit owner instruction defining restart scope. Do not assume permission to restart AUDIO/TRIAL.
2. Review this pause commit and current storefront changes; do not revert the entire commit or shared files blindly.
3. Confirm staffing, costs, privacy notice, application retention and any applicant commitments before accepting new works.
4. Restore the mail composer selectively from the base revision, remove publication guard only for approved new material, update dates/copy and the form JS cache version. Preserve the session-recording exclusion.
5. Run all builders in `.github/workflows/pages.yml`, then `node --test tests/*.test.cjs supabase/tests/*.test.mjs` with Playwright installed.
6. Review/merge a scoped PR and verify live mobile/desktop pages, static POST rejection, product checkout links and authenticated ACCOUNT download flow with an owner test account. Notify previous applicants only with separate send approval.

## Verification boundaries

Automated browser ACCOUNT tests use controlled API responses; they verify the browser flow, not a real customer's authenticated production purchase history. Production API denial without credentials is checked separately. No purchase, OTP email, licence activation or customer download is created as a test.
