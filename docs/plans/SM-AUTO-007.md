# SM-AUTO-007 — dynamic portfolio and automatic source sync

Status: APPROVED for matching local real-data flow, verified human `apporved` to concrete six-step plan in coordination chat; scope/authority mapping in docs/approval-SM-AUTO-007.md. New cloud/provider rights remain excluded. SM-LIVE-006 pilot continues independently.

## Verified requirement and impact

Human messages in chat Xác định phạm vi SatsunicManager specify adding SatsunicGo and exact SatsunicMec, official automatic API/webhook/export sync, no manual CSV/numeric-entry product workflow, and one add-app form. Existing five-app enum, local CSV workflow and on-demand operations do not fulfill this delta. Read-only hash-bound discovery/autosync/QA handoffs are in docs/team. SatsunicMec has no verified repository/project mapping; no medic alias will be used. SEO uses Lemon Squeezy; Go source uses payOS; BeFam canonical repository project is be-fam-3ab23 and source access remains unverified.

## Requested local implementation approval

1. Replace fixed frontend catalog authority with backend registry documents and safe stable app identifiers. Seed the seven exact names idempotently; unresolved source mappings stay not_configured. Preserve historical five app IDs and incident/fact references. No deletion/migration of production history.
2. Add owner-only app onboarding/update with revision checks, idempotency, audit and server-side connector validation. Browser cannot supply arbitrary query resources or trigger a privileged grant. Health URL validation rejects non-HTTPS, credentials, private/link-local/metadata addresses, redirects outside approved targets and DNS rebinding; requests have deadline/body caps. Add-app does not automatically grant cloud access.
3. Remove manual CSV import product controls and retire preview/confirm endpoints from the prospective production surface; retain exact currency/minor-unit arithmetic for official connector facts. Report/export views consume server snapshots only, with source, observed-through watermark and coverage. Missing finance source remains unavailable, never zero.
4. Implement one automatic health/operations collection slice using the three already verified source resource mappings. Worker leases, bounded batches, deterministic run IDs, overlap replay, per-source watermarks, retry/backoff and stale/failure states. In-app incident and notification creation are idempotent; acknowledgement does not alter source firing/recovery. Outbox marks delivery only after persistent channel confirmation. No external email delivery in this local slice.
5. Build typed official provider adapters behind disabled configuration: SEO Lemon Squeezy, Go payOS subject to verified reporting capabilities, BeFam native store sources only after actual authority mapping. No fabricated credentials, GA4 property IDs, BigQuery export dataset, revenue or cloud cost. Adapter status distinguishes unsupported capability, missing config, permission denied, stale and failed. Official API contracts must be verified before adapter implementation.
6. Keep compact fixed Satsunic/HunpeoLabs shell, natural vi/en copy, add-app form, source status/progressive details, reduced motion and existing toast behavior. Inventory changed strings and all applicable states in Product Language review.

Local write scopes: packages/contracts, functions/src, apps/web/src, scripts, tests, docs, Firestore index/rule source only if compatibility/security tests justify. Lead owns shared contracts/runtime/deploy; agents own non-overlapping assignments through revision/hash-bound briefs. No dependency upgrade or unrelated refactor. Existing owner + active-access + App Check boundary stays required.

## Cloud diff excluded from this approval

This is local code/fixture/validation approval only. It does not authorize Scheduler/PubSub/service IAM, new source grants, Secret Manager access, provider OAuth/billing/webhook registration, production seeds/migrations, production deployment beyond SM-LIVE-006, paid BigQuery queries, source app changes, external email or AI. Those require an exact verified resource/permission/cost diff and separate human approval before mutation. Worker cadence and projected calls must be previewed with actual resource counts; budget alerts are not caps.

## Acceptance and evidence

Tests: unknown app/source fail-closed; unauthorized owner and missing App Check deny; onboarding retry/revision conflict; SSRF/redirect/DNS failure guards; duplicate/out-of-order source events; worker lease contention, retry and watermark atomicity; source outage retains stale data without fabricated zero; workflow versus source recovery; per-owner inbox state; exact money/refund/fee/net semantics; seven-app filter/routes and add-app keyboard/mobile/vi-en. Emulator fixtures remain explicit and cannot call production adapters. No production readiness claim until actual authorized runtime collection and browser owner flows are verified.

Rollout follows backward-compatible read contracts and deterministic new records; preserve old records. Disable worker/connector flags on failure; do not erase financial or incident history. Final review and docs/production-readiness.md must distinguish implemented, tested, deployed and production-data verified.

## Source-to-report production acceptance (verified human steering)

Per app/capability record IMPLEMENTED, TESTED, DEPLOYED, LIVE_VERIFIED or BLOCKED separately. Actual source mapping/permissions -> deployed Manager identity -> owner session + App Check -> same scoped native-provider sample comparison -> immutable report snapshot -> authenticated incident transport -> persistent inbox and verified delivery/recovery. Administrator CLI is preliminary. Worker must collect while browser closed, with approved cost bounds. No deliberate production outage/payment/AI side effect; controlled safe signal uses approved real transport. Missing sources cannot produce portfolio-green/zero totals. Financial provider reconciliation includes gross/refunds/fees/net/cost and completeness watermark; no fixture or CSV product workflow. AskAnything needs real scoped tools/evidence links and quotas before activation. External channel/IAM/worker cloud creation remains separately gated.
