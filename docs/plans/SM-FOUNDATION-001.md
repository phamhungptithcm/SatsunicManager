> Local implementation approved by the human reply "apporved"; see ../approval-SM-FOUNDATION-001.md. Earlier PENDING discovery text below is historical. Cloud mutation remains excluded.

# SM-FOUNDATION-001 v1 — review requested

Approval: PENDING. This document is not approval evidence.

## Goal and verified starting point

Deliver the master prompt in four end-to-end slices, starting with private authentication, fixed shell, five-app registry and a real source connection. All 526 lines of the master prompt were read; its hash and discovery evidence are in `../evidence/discovery.json`. No existing application, dependencies, tests or Firebase configuration exist. Existing governance assets are untracked and must be preserved. Git has no commit; origin is the SatsunicManager repository on GitHub.

Repository intelligence is DEGRADED: CodeGraph and CocoIndex executables exist, but neither has a project index. Bounded file inventory and targeted policy/source/configuration reads establish the blank application surface. No indexed structure is claimed.

Local tools: Node 25.9.0, npm 11.12.1, Firebase CLI 14.19.1, gcloud 581.0.0, Java 17.0.16. Terraform is unavailable. Select and verify a supported Node LTS for development and Functions before installation; local Node 25 is not a deployment-runtime decision.

## Source map

| Product | Observed source | Candidate resource | Evidence/limits |
|---|---|---|---|
| HunpeoLabs | sibling `.firebaserc`, README; cloud listings | `hunpeolabs-prod`; `https://hunpeolabs.com` | Homepage 200 HTML; `/healthz` 404 HTML; no backend readiness coverage |
| SatsunicSEO | Firebase/GCP listing | `satsunicseoextension` | Resource existence only; environment/service mappings unverified |
| SatsunicCode | sibling `.firebaserc`, cloud listings | `satsuniccode` | Resource existence only |
| SatsunicPlan | sibling `.firebaserc`, cloud listings | `satsunicplan` | Resource existence only |
| BeFam | sibling `.firebaserc` conflicts with cloud listings | repo: `be-fam-3ab23`; visible cloud: `befam-b43bd`, `befam-490823` | Do not resolve by display name or create a false connection |

No Manager staging or production project was identified in visible listings. Visibility does not prove global absence. Firebase Hosting site discovery failed authentication after project listing succeeded. Deployment identity, IAM grants, billing linkage, OAuth client, App Check, region and provider data permissions remain unverified.

## Proposed architecture and dependency review boundary

Use npm workspaces: `apps/web`, `functions`, `packages/contracts`, later `packages/instrumentation`. React/TypeScript strict/Vite frontend; callable gen2 Functions; Firestore small projections; private Storage exports. Monitoring/Logging retain raw operational data; BigQuery retains billing/history. No duplicate REST API, Cloud Run or extra data platform.

Requested dependencies are those specified by the user: React, React DOM, TypeScript, Vite, React Router, TanStack Query, Tailwind, shadcn primitives, Lucide, React Hook Form, Zod, Recharts, Firebase Web/Admin/Functions; verification tooling ESLint, Vitest, Playwright, Rules unit testing and Firebase emulator tooling. Resolve exact supported versions, license metadata, transitive dependency/security checks and lockfile before using them. This is a requested package family review, not a claim that any version/license has already passed. Genkit/Vertex and provider SDKs enter only in their corresponding slice after the same review.

## Slice 1 file/function plan

| New paths | Behavior |
|---|---|
| root/workspace `package.json`, lockfile, TypeScript/lint/test/Vite configuration | Reproducible strict workspace with explicit versions and supported runtime |
| `packages/contracts/src/{identity,registry,connection,scope}.ts` | Validated input/output schemas; five immutable product identities; environment/date/timezone and provenance/freshness/quality envelopes |
| `functions/src/auth/{policy,blocking,authorize,bootstrap}.ts` | Exact verified Google email allowlist for the two specified accounts; before-created/before-sign-in rejection; project-bound tokens; server-owned UID access bootstrap; disabled access check; revoked/recent tokens for sensitive calls |
| `functions/src/api/{registry,connections}.ts` | Authorized registry read and test-connection; server resolves resource scope; validated mutation, revision conflict, transaction/audit/idempotency |
| `functions/src/integrations/{catalog,health}.ts` | Approved HTTPS targets only; DNS/private-IP/redirect SSRF defense; bounded timeout/bytes; expected status/type/body; persist attempt and success separately; homepage coverage distinct from readiness |
| `apps/web/src/{app,components,features,lib,styles}/**` | GIS One Tap plus Google fallback; authorization before private queries; fixed sidebar/top bar; mobile drawer; URL filters; Vietnamese/English; logout clears all private caches; real registry and capability states; composer disabled with reason until AI backend exists |
| `firebase.json`, `firestore.rules`, `storage.rules`, `firestore.indexes.json` | Manager-only deployment configuration; deny-by-default, verified Google allowlist plus active access record; server-only facts/audit; owner-private state separation |
| `scripts/{validate,connect}/**` | Executable preflight: prerequisites, separate Manager projects, API/IAM/config checks, honest blocker statuses and failing exit codes |
| `tests/{unit,integration,rules,e2e,fixtures}/**` | Identity/provider/email spoofing and aliases; disabled owners; cross-owner privacy; scope escape; SSRF; SPA fallback; no private content flash; fixed shell/composer offsets; no fixture leakage |
| `docs/{architecture,adr,runbooks,evidence}/**`, README | Source/IAM/data/threat maps; real command evidence; deployment and rollback procedure; product-content review |

Approval scope sought: local implementation, dependency installation/review, emulator and local/browser validation for these new paths. Cloud mutations are a separate gate. No existing source app is modified. No generated governance file is edited directly.

## IAM and infrastructure plan — proposal only

| Principal | Resource | Purpose / intended access |
|---|---|---|
| deploy/bootstrap identity | two confirmed Manager projects | bounded provisioning/deployment, separate from runtime |
| API identity | Manager access/registry/audit/projections | authorized user API; no source IAM or billing administration |
| collector identity | registered source Monitoring/Logging resources | read metrics and curated logs; no Owner/Editor |
| finance identity | confirmed BigQuery curated views and query project | data read at view/dataset; jobs only in query project; bounded bytes |
| notification worker | Manager outbox/inbox and approved channel | durable delivery; no source control permissions |
| AI identity | bounded Manager tools and configured Vertex resource | read-only tools, quota and kill switch |
| alert configurator | explicitly managed Monitoring policies | separately approved policy writes; dashboard reader cannot inherit writes |

Future cloud diff: create/confirm two distinct Manager projects; confirm available IDs without inventing them; choose immutable regions; attach approved billing account; enable required APIs and Identity Platform; Google-only provider/OAuth origins; dedicated runtime identities and minimum scoped grants; Firestore/Storage/Hosting; App Check and blocking triggers. No apply command will run before exact resource identifiers, permissions, cost implications and plan are presented and approved. Existing source project IAM, billing exports, domains and databases remain unchanged.

## Remaining slices and acceptance

2. Add descriptor-driven bounded Monitoring/Logging adapters, source watermark/lag, a staged controlled incident, Pub/Sub dedup/outbox, independent verified email delivery, owner-private notification state. Missing IAM/instrumentation stays blocked.

3. Connect confirmed BigQuery billing export/views and verified revenue provider or real CSV import. Integer/decimal money, currency preservation, credits and allocation reconciliation, immutable facts, query limits, consistent KPI/drill-down/export/report snapshots. Missing datasets/provider credentials remain null with reasons.

4. Add bounded read-only Genkit tools and evidence links, quotas/kill switch, fixed full-width composer; finish applicable five-app coverage, instrumentation guides, WIF deployment workflow, hardening, independent monitoring, staging restore/rollback and production smoke. No fabricated model or metric/provider IDs.

Each slice updates readiness with implemented/local-tested/staging-verified/deployed/production-data-verified separately. Discovery probes alone never satisfy connection acceptance.

## Impact, risks, alternatives and failure behavior

Risk HIGH: new authentication, cross-project observability, private financial data and production deployment. Mitigate with layered authorization and emulator/staging adversarial tests before deployment. No compatibility obligations to existing Manager consumers because none exist; preserve all governance assets and sibling applications. No migration of existing source databases. Prefer separate projects over customer Auth contamination; callable API over duplicate transports; source-native logs/time series over Firestore replication.

Use transactions for UID bootstrap, audit and revision changes. No blind increments for retried events. Bound serverless instances, requests, deadlines, results, listeners and query cache; durable rate counters rather than per-instance counters. Missing data/permission/expiry and partial failure are first-class responses. Probe content validation prevents HTML/SPA 200 from being readiness success. Retry only bounded/idempotent operations; never retry money mutation blindly. Rollback preserves immutable facts and disables connections/jobs before incompatible code; deployed rollback and restore must be tested rather than assumed.

## Checks and review

Select universal, TypeScript/JavaScript, frontend HTML/CSS, web app, API, database, concurrency, infrastructure/devops, product-content and visual-design profiles as applicable. Run lint/typecheck/unit/integration/Rules/E2E, dependency/secret checks, build. Real One Tap/Identity Platform, denied outsider, source IAM, billing reconciliation, email delivery, report/AI provenance and restore require staging/live evidence. Product language must cover all eight required principles in context. Final implementation review must be fresh and pass; report actual provider token/cost data or Unavailable.

## Exact blockers and requested decision

1. `.ai/guards/dependency-policy.yaml` requires human review for new dependencies/package installation. Review this local scope before install.
2. `.ai/workflows/plan-existing-system-change.md` step 15 and `.ai/core/required-workflow.md` require reviewed-plan approval before protected configuration/infrastructure/contracts/tests. No tracked approval exists.
3. Approval validator accepts only READY, contradicting the repository's DEGRADED fallback. Request a narrowly reviewed correction allowing documented, sufficient DEGRADED evidence (without relaxing human approval), or an approved compatible evidence path. Never mark missing indexes READY.
4. Baseline governance validators fail due to missing CLAUDE.md/generated adapters. Record baseline; repair only with approved source/regeneration scope.
5. Manager resources and deployment capabilities are not yet established. Separate cloud plan/approval is still required after local implementation approval.

Requested approval: SM-FOUNDATION-001 v1 local scope, package-family/license/security review and install, plus the narrow approval-validator policy-consistency correction and source-based governance asset regeneration. No cloud create/apply/IAM/billing/production authorization is implied.
