# ZASU ACCOUNT Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Track steps and failures in the sibling progress file.

**Goal:** Optional Square-verified purchase claims, purchase history, entitlements and protected re-downloads.
**Architecture:** Add commerce modules to the existing isolated account API; reuse account session proof and existing private release files. Independent webhook consumer and live reconciliation avoid disturbing legacy fulfillment.
**Tech Stack:** Static HTML/CSS/ES modules, Supabase Postgres/Edge, pinned supabase-js, Square REST and existing Resend.
**Spec:** docs/superpowers/specs/2026-10-09-zasu-account-phase2-design.md

## Global Constraints
Preserve Phase 1, all guest APIs, existing Square links, products/DSP/files, real customer data and unrelated changes. No secrets in output or browser. No email-only claims. No native Auth bypass of account session proof. Production authorization persists from the user's instruction; user explicitly requests continuous progress without redundant approvals.

## Review Focus
- Concurrent claims and resent/consumed/expired codes must not steal or duplicate ownership.
- Refunded/partially refunded bundles and out-of-order events must not reactivate rights.
- Missing Square email and mixed tender emails must require support.
- API/storage failures and legacy webhook delivery must preserve guest fulfillment.
- Other-account order IDs, closed/revoked sessions and browser writes must be denied.

### Task 1: Authoritative purchase verification
Files: functions/zasu-account/purchase.mjs and supabase/tests/account-purchase.test.mjs.
Produces: verifySquarePurchase(orderId, {getOrder,getPayment,getRefund}) → server snapshot with offer, products, payments, status, buyerEmail and purchasedAt; errors expose fixed codes only.
- [ ] Write fixtures/assertions for current/legacy titles, bundle, mismatched merchant/total/refunds, absent/email conflicts; observe failure.
- [ ] Implement exact bounded verification, then pass behavioral tests.
- [ ] Commit verified module/checkpoint.

### Task 2: Atomic order/entitlement and claim persistence
Files: CLI-created migration; supabase/tests/account-commerce-db.sql.
Consumes verified snapshot; produces service-only commerce_sync_order, commerce_begin_claim, commerce_finish_claim and event-task lease RPCs. User SELECT uses parent ownership + account_self_active.
- [ ] Write DB tests for role denial, claim races/expiry/attempts, atomic bundle grants and refunded state.
- [ ] Apply additive staging migration, run transaction tests and advisors; record results.

### Task 3: Account commerce API and UI
Files: commerce.mjs, index.ts, handler.mjs, account UI; API/adapter/UI behavioral tests.
Actions: purchases, claim_request, claim_verify, download. UID derived from authenticated session, not browser. Buyer confirmation code requires separate purpose and global mail budgets shared with Phase 1.
- [ ] Write failing tests for authorization, destination, resend, revalidation/refund and generic failure.
- [ ] Implement claims and UI using existing branding and safe text rendering.
- [ ] Verify focused then full suite and staging API.

### Task 4: Independent webhook consumer/recovery
Files: commerce webhook module and existing webhook additive wrapper; tests.
- [ ] Test signature denial, duplicate tasks, retry after failure, reverse event order, old fulfillment on account failure.
- [ ] Inspect live subscription and implement durable leased task processing; no credential extraction.
- [ ] Verify staging synthetic notifications, current provider reads and recovery.

### Task 5: Review and deploy
- [ ] Fresh-context whole change security review; important fixes reproduced RED→GREEN.
- [ ] Full suite once after final changes; staging RLS/claims/refunds test evidence.
- [ ] Production additive migration/functions, then exact-head checked GitHub update and Pages publish.
- [ ] Public verification, report scope/limitations/cost and retain Phase 1 artifacts.
