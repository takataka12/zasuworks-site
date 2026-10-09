# ZASU ACCOUNT Phase 1 production plan

Goal: Optional passwordless account at /account/, with a common Supabase Auth UUID, personal dashboard, editable display name/locale, current/all-session logout, and verified account closure.
Architecture: Existing GitHub Pages frontend + one additive Supabase Edge Function; Supabase Auth remains identity issuer; existing verified Resend transport sends OTP. No Square, guest API, product file, DSP, AUDIO, or worker changes.
Tech: HTML/CSS/ES modules, Deno/Supabase JS, PostgreSQL, Node test, Playwright.
Spec: User's ZASU ACCOUNT request and subsequent explicit production-deployment authorization on 2026-10-09.
Global constraints: No secrets in git/logs; keep existing guest purchase/download/desktop offline paths; do not infer purchase rights; no purchases/licenses tables in Phase 1; no new paid resource or billing change; no reset/revoke of unrelated data/grants.
Review focus: OTP expiry/replay/attempts, enumeration/rate limits, strict active session, consent capture, RLS cross-user denial, browser XSS/storage, production rollback.

## Task 1: Backend security contract
Files: supabase/functions/zasu-account/{handler.mjs,index.ts}; supabase/tests/account.test.mjs.
Interfaces: POST {action:request|verify|me|update|logout|close}; request requires email,purpose,consent; verify requires random challengeId,code. Protected actions accept Bearer JWT and require active Auth session and active profile. All responses no-store; only official origins. Unauthorized origins never mutate.
Write behavior tests first, run RED, implement dependency-injected handler, run GREEN. Include invalid requests, generic missing-user login, OTP success/replay, profile authorization/validation, logout/closure.

## Task 2: Additive database
Files: supabase/migrations/<CLI-generated>_zasu_account_phase1.sql; supabase/tests/account-db.sql.
Interfaces: account_profiles server-owned verified identity FK; challenges are private, short-lived, capped attempts, atomic consumption, keyed OTP digest; service-only RPCs identity lookup/session check/consume/profile-close. No browser DML or TRUNCATE. RLS enforced and self read only for active session. Closure revokes Auth sessions transactionally but retains identity for future purchase recovery.
Test DB contract and isolation transactionally using disposable synthetic rows and rollback; inspect SQL and grants before deploy.

## Task 3: Frontend and privacy
Files: account/{index.html,account.css,account.mjs}; tests/account-ui.test.cjs; index.html; privacy.html.
Interfaces: REST Edge adapter, same-origin policy, sessionStorage tokens, refresh on expiry, tab-restricted session, no URL credentials, no innerHTML of personal data. Real dashboard is empty purchase integration notice plus existing guest-download links. Name/locale management; close requires new email OTP; logout all.
Write UI flow and responsive tests RED, implement, run GREEN. Update privacy disclosure and add account navigation while preserving existing checkout links.

## Task 4: Production gates and rollout
Run all Node/Playwright suites. Fresh-context whole-change review, fix critical/important findings with regression tests. Apply additive migration, verify RLS/grants; deploy new function with explicit custom auth; negative API probes, synthetic OTP round trip without external mail; upload atomic commit fast-forward with expected head; await GitHub Pages success. Verify production /account/, homepage routes, download rejection behavior. Record commit/function/migration references and exact tests. Rollback frontend additive files/navigation using reverting commit; deactivate new function if needed; retain profiles/identities, never drop user data.
