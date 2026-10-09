# Execution ledger — plan: 2026-10-09-zasu-account-phase1.md

Baseline: main 75be3caa70216298967870077766c877c32bd68f; fresh clone, no existing uncommitted changes; feature branch only.
Task 1: handler 16 tests RED->GREEN; native SDK session exchange uses a fresh client to protect shared service-role database client.
Task 2: staging migrations applied; own-profile RLS, no client DML/TRUNCATE/private RPC, OTP retry/expiry/replay/binding, 24h and revoked sessions pass; synthetic transaction fixtures rolled back.
Task 3: 9 browser tests RED->GREEN at 320/390/768/1440px; screenshots inspected; existing guest routes retained. Full pre-review suite 204/204 passing.
Actual staging integration: Auth fixture login, me/update, forbidden mutation/origin, missing login, invalid code, logout then me401 and refresh400 pass. Fixture is synthetic example.invalid only, never sends real mail.
Final review: no Critical, Important native Auth bypass and unbounded shared mail consumption.
Final: session proof insert and mail guard tests RED->GREEN. Staging database native-session regression failed before proof binding, proving the bypass. Service-only proof records bind protected API and RLS; initial independent mail budget 30/hour and 50/day. Global API rate guard separate from existing DSP/guest fulfillment.
Final: CI deployment gate expanded to all browser and backend suites.
Ruling: account email-address change, identity reopening and personal-data deletion use existing support channel in Phase 1; automated safe dual-email changes belong to a later increment. Display name/locale and verified closure are available now. Cost if wrong: support workload; no automatic mutation of purchase identity.
Ruling: no real customer or owner's mailbox was used for test sends. Provider-reserved test address may test API acceptance; end-user inbox placement requires recipient-side verification. Cost if wrong: inbox-specific delivery problems cannot be ruled out by synthetic tests.
Ruling: no commerce records or webhook paths changed. Phase 1 empty product section explicitly says integration pending. Cost if wrong: users cannot yet manage purchases inside the account.
Minor (deferred): generic login response shape does not eliminate timing-based email enumeration; independent limits reduce abuse. No purchase/access rights are derived from email lookup.
Minor (documented): closure status is authoritative even if global Auth sign-out fails; account access is blocked immediately, and support may need to retry session cleanup. Never reopen an account automatically after partial closure.
Local Deno check could not download npm package due runtime network policy. Supabase Edge bundling succeeds; local TypeScript SDK check passed before adapter extraction. Final JS syntax checks and SDK-backed staging tests remain required.
