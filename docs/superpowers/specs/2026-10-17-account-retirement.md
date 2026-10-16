# ACCOUNT retirement design
User instruction (2026-10-17 JST) authorizes implementation, tests and production deployment. Preserve all customer records, existing refund promises, licenses, payment links and offline binaries. No real charges, customer contact, deletion, new fixed fees or Railway subscriptions.

Retain Square webhook/recovery in zasu-account. Add a separate guest product-download endpoint using the existing exact-offer verifier and private release registry, rate limiting, 600-second signed URLs and live Square paid/refund checks. Deploy and verify the alternative before disabling public account actions. Retain old account source and database for rollback, but replace its public page with support/download routes. Do not disable Supabase Auth project-wide because it is shared.

Keep old refund terms accessible. New wording is limited to Square VOCAL 1.0.0, LOUD 2.0.0 and their bundle. Apply only to new purchases after an explicit future JST effective date, once pre-purchase disclosure is verified; otherwise defer enforcement. Requests received within 168 hours qualify regardless of response date. No unilateral discretion, excessive proof or retroactivity.

Release ruling: final Square checkout/ad disclosures cannot be fully verified in this session. Publish amendment as advance notice only; effective date is unset and old guarantee remains operative until verified and a date is announced.
