# Integrated analytics implementation — 2026-10-15

Goal: extend the existing consent-gated GA4 layer without changing checkout, account, payment or refund code. No paid services or ad changes.

1. Extend public metadata with categories, explicit source/campaign, actual file_download and product selection. Keep purchase and generate_lead disabled without verified success.
2. Add opt-in Clarity loader to the same owner, with renewed disclosure consent, whole-body masking, public route allowlist and rejection of unrecognized query/hash/referrer data. Empty project ID is inactive. Withdrawal ends recording and reloads after clearing owned cookies. Add price-section and scroll observation once per page.
3. Keep advertising consent separate and default off; X integration requires real Ads Manager pixel/event IDs. Do not invent IDs or alter campaign settings.
4. Run existing analytics and commerce/browser tests, plus meaningful privacy and duplicate-event regressions. Publish verified source changes using existing Pages workflow, preserving any concurrent GA4 updates.
5. Complete Clarity signup after owner accepts terms; create project, verify receipt and masking. Inspect Search Console and X access. Track external setup blockers explicitly.
6. Inspect SEO and performance; implement safe measured improvements, configure reports/dashboard where authenticated access permits. No fabricated metrics or attribution.

Decisions: direct tags extend existing vanilla-JS ownership; GTM adds another control plane without a present benefit. Do not add Sentry before confirming coverage, a free project, and sanitization. Test-only provider IDs and SDK interception prevent automated test traffic from contaminating production.

Validation: node --test tests/*.test.cjs supabase/tests/*.test.mjs with existing Playwright install. Separately verify deployment and real provider receipt. Synthetic tests are not evidence of provider-side data receipt.

Execution: native implementation in fresh task-specific clone/branch. User supplied full scope and explicitly authorized phased publication, so no repeated design/publish approval gates. Only provider terms and required account verification need owner action.
