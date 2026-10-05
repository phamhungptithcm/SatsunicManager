# SatsunicManager production readiness

Status: **NOT_READY**. Latest status is the superseding checkpoint below. Production pilot has ten ACTIVE backend functions, deployed Firestore Rules/indexes and both registered identity blockers. Hosting and genuine owner/App Check acceptance are not verified; signup remains closed. Local seven-app registry, automatic collector foundation and HunpeoLabs composer are under fresh validation, not deployed. Earlier dated sections are historical.

Master specification: all 526 lines read; SHA-256 `bd80eb39f753a3b33e59f593bd9b4227adc71981bb3a9e6c6ff2cd134d2fcbee`. Human reply `apporved` approved local SM-FOUNDATION-001; approval record: approval-SM-FOUNDATION-001.md. Subsequent user instruction approved Satsunic visual direction and HunpeoLabs feedback reuse. Cloud setup approval and readback are in approval-SM-CLOUD-002.md and evidence/cloud-setup.json. SM-CLOUD-003 v1 is approved (approval-SM-CLOUD-003.md); historical staging foundation and explicit runtime IAM were applied; staging removal now supersedes that topology. Hosting/Functions deployment and additional build/invoker grants remain outside that approval.

## Current evidence

The exact candidate hash, timestamps, commands and exit codes are in evidence/checks.json. No commit exists (unborn main); untracked WIP was preserved. Repository intelligence remains DEGRADED, bounded source/compiler/tests were used. Missing optional index health did not block implementation.

| Requirement | Implemented | Local evidence | Deployed | Production verification / blocker |
|---|---|---|---|---|
| Two-owner Google login | GIS One Tap, popup fallback, backend token/audience/issuer/provider/verified email/UID/access checks, blocking triggers | Both owners and outsider emulator; revocation/disabled/role tests | No | Identity Platform/sole Google/domain-bound Enterprise registration verified; live GIS/FedCM/App Check token/owner login NOT_TESTED |
| Dedicated Manager project | One actual web app, Firestore native us-central1 and Identity Platform Auth | Auth/provider, database, rules source hash and anonymous403 live readback | Setup + Firestore Rules | ACTIVE; billing disabled by account project-link quota; production-only; staging DELETE_REQUESTED; Storage bucket absent |
| Authorization and security | Rules default deny, immutable client writes, exact allowlist, owner binding/access, audited bootstrap, SSRF pinned public DNS | Rules/API security and transaction/idempotency tests | No | Google-only Identity Platform configured; signup/deletion disabled. Firestore Rules deployed exact source match + anonymous403. Dedicated runtime identities and exact own-project grants verified; App Check and blocking deployment unverified |
| Fixed shell/five-app registry | Fixed sidebar/topbar, scope URL, vi/en, theme, responsive drawer, disabled AI composer; Product by HunpeoLabs | Browser and current screenshots | No | Real Manager session NOT_TESTED |
| HunpeoLabs source connection | Backend HTTPS probes, schema persistence, audit, revision/idempotency/rate guards | Actual public 200 homepage /404 healthz inside emulator workflow | No | Public reachability only; healthz readiness absent, production operational source not connected |
| Shared motion/toast/progress | Source reuse manifest and adaptations in ui-reuse.md | Concurrent/failure cleanup, paused countdown, browser focus/hover, reduced motion | No | Production browser timing NOT_TESTED |
| Finance, cloud billing, monitoring, logs, analytics | Missing-source states; no synthetic amounts or metrics | Null/partial semantics checked | No | No provider/export/view/resource authorization or snapshots |
| Incident/inbox backend | Server-only signal ingestion, dedup/version ordering, independent workflow, revision/idempotency, owner-private read state; outbox pending | Controlled demo transaction tests | No | Transport, UI, worker/email and reports remain incomplete |
| Vertex AI tools/quota | Composer only, explicitly disabled | Disabled-state browser evidence | No | Model, tools, quota and authenticated data sources absent |
| WIF/CD/rollback/retention/restore | Production-only; fail-closed predeploy doctor | Deployment denial verified | No | No staging required; IAM, billing scope and production rollback/restore drills remain |

## Dependency and governance limitations

Current npm runtime audit: 0 advisories. Full development/tooling audit: 9 (7 high, 2 moderate); exact report evidence/npm-audit-final.json. Compatible grpc and gaxios/uuid overrides remove runtime advisories; no unsafe forced major upgrades. Remaining tooling vulnerabilities are unresolved release risks, not an accepted waiver. License metadata inventory is recorded; packages without metadata still need notice verification, not legal certification. Build warns about the large Firebase-containing client chunk; load/performance production budget NOT_TESTED.

Generated skill sync was repaired from canonical sources; narrow approval validator DEGRADED consistency fix has 7 regression tests. Governance baseline still has missing native adapter documentation; ai-agent-kit runtime ledger CLI is unavailable. Report rendering is manual and disclosed; no runtime receipt is invented.

## Evidence boundary

Auth emulator identities are fixtures, not genuine production Google identities. Browser tests skip only optional external cosmetic assets in the emulator login widget; app/API/Auth responses are not mocked. Public HTTPS probe results are real, but persistence/auth belong to demo-satsunicmanager. Storage/Firestore tests operate only on localhost demo fixtures. Only approved Manager app/Auth/Firestore setup and Firestore Rules changed. No customer database, manual IAM grants or billing links changed. Firebase initialization created its managed admin service account; it is not reused as the runtime identity. Missing values remain unavailable, not zero.

Final review: BLOCKED for cloud configuration, live acceptance, remaining development dependency advisories and governance/runtime evidence limitations. Details and review cycles: final-review.json and task-report.md. Production readiness remains fail-closed; local passes are not release acceptance.

Progress: local foundation built and validated; 0 of 4 complete production end-to-end slices. Remaining master slices require authenticated source connections and reviewed cloud/resource/billing plans. Token usage: Unavailable. Actual billed cost: Unavailable. Memory candidates: None.

## Cloud setup checkpoint — 2026-10-04

App ID `1:317759361800:web:d4710116013ca2dca492bd` exists and is ACTIVE. Public SDK fields and actual OAuth client ID are recorded from API readback, never guessed. No `manager-config.json` was published: App Check/runtime service configuration is incomplete.

Google-only Auth configuration succeeded. End-user signup and self-deletion remain disabled, with no localhost authorized domain. Subtype remains FIREBASE_AUTH; blockingFunctions empty. This closed state is intentional until Identity Platform, backend and real two-owner acceptance exist. The initial all-disabled provisioning attempt completed but did not initialize config; Console Get started did. Both observations are retained, not collapsed into a false success.

Firestore `(default)` is native in us-central1 with delete protection. Active ruleset `6bfd89c7-1865-47c8-880e-02f0037910eb` hashes exactly to source. Anonymous valid-path read returns403. A prior probe used a reserved document ID and returned400; this was corrected and rerun. No production document was created, changed or deleted by the verification.

Storage has no bucket: Storage Rules are locally tested but NOT_DEPLOYED. Firebase public SDK bucket name is a logical default, not proof of an existing bucket. Billing remains disabled. Remaining setup and release blockers are in plans/SM-CLOUD-003.md. No production readiness or whole-master completion is claimed.

## SM-CLOUD-003 current cloud checkpoint

Approved v1 partially executed. Both actual Manager projects now have web apps, native Firestore us-central1 with delete protection, and dedicated manager-api identities. Both released Rules match the tested source hash; live anonymous reads return403. Readbacks: evidence/satsunicmanager-cloud-setup.json, evidence/satsunicmanager-staging-cloud-setup.json and both runtime-iam/token-role files. Production Google-only Auth still has signup/deletion disabled. Earlier staging CONFIGURATION_NOT_FOUND was resolved: actual Auth now initialized, Google-only and locked; both environments upgraded to IDENTITY_PLATFORM.

Billing links to account01428C-358437-2361F8 failed for both projects with Cloud billing quota exceeded. Runtime API activation failed with UREQ_PROJECT_BILLING_NOT_FOUND. REST Identity Platform initialization requires billing, but Firebase Console supports Spark upgrade; both upgrades succeeded. Enterprise App Check registration also succeeded independently. Live token enforcement, Storage and application deployment remain incomplete. The filtered USD10 budget create returned INVALID_ARGUMENT; currency is USD but the precise rejection cause is unverified. No budget alert is active, and no actual spend was verified. No alternative billing account or broad IAM grants were used.

Current cloud/helper checks:48 unit tests rerun PASS, helper syntax PASS, executable assertions verified both Rules hashes, anonymous403, region/delete protection, exact runtime roles and production signup lock. Earlier25 emulator/API and3 browser scenarios were not rerun for documentation/read-only helper changes; their evidence remains local and tied to its earlier candidate. Current checkpoint: evidence/cloud-003-execution.json. Resolve the approved account project-link quota before billing-dependent setup can continue.

## Current continuation checkpoint

Supersedes earlier setup blockers: both environments are IDENTITY_PLATFORM, sole Google provider, exact Firebase domains, disabled signup/deletion; domain-restricted Enterprise SCORE keys and App Check registration read back successfully. Evidence/cloud-003-continuation.json, both *-auth-readback.json and *-app-check.json are authoritative for current state. Blocking Functions remain undeployed and signup remains locked. Auth upgrade proof: evidence/identity-platform-production.jpg. Public site keys are configuration, not private credentials. No SA key/OAuth client secret fetched.

Blocking runtime import-order defect fixed within approved slice1 Auth scope: identity handlers now capture own configured region/serviceAccount and capped resources before index globals; missing configuration rejects authentication.49 unit,7 Python approval,25 emulator Rules/API,3 browser tests PASS on evidence/checks.json candidate. First browser connection check failed, final run passed; root cause NOT_VERIFIED, evidence/verification-retries.json retained. No claim that a transient failure was fixed.

Origin verified locally as https://github.com/phamhungptithcm/SatsunicManager.git; no push/WIF binding occurred. Local remaining operations/finance/reports/AI/instrumentation modules require the reviewed delta docs/plans/SM-LOCAL-004.md under the existing-system gate; plan APPROVED by current human reply; implementation in progress. Billing project-link quota and budget rejection persist. Overall production readiness NOT_READY. Token usage/billed cost unavailable; memory candidates None.


## Production-only checkpoint — SM-REMOVE-STAGING-005

Current user explicitly approved SM-LOCAL-004 and requested removal of Manager staging. Production-only supersedes every earlier two-project/staging requirement in this document and plans. Historical observations above are retained as historical evidence, not current topology.

After displaying the deletion plan and verifying the exact staging project number, root Firestore collection listing returned zero collections, Storage bucket listing was empty, and Functions API was disabled. The authorized project deletion returned `DELETE_REQUESTED` for `satsunicmanager-staging` / `274705062317`; evidence/staging-removal-preflight.json and evidence/staging-removal-result.json. This is deletion requested, not verified physical purge. No measured billing savings, verified backup or data restoration claim. Production project `satsunicmanager` is preserved; no source application changed.

Runtime contracts/UI/cloud helpers/doctor now accept only Manager production. Demo emulator remains for safe local testing, not a second paid environment. New incident/inbox backend remains LOCAL ONLY; real transport and delivery have not been enabled. Pending outbox records explicitly retain `channel_not_verified`. Remaining master features are not complete. The approved billing-account project-link quota still blocks paid runtime setup/deployment; production login, operational/financial sources and email remain unverified.

Current local validation candidate `674ed6b30376e71b202ae45b07222b758c181360b26dcf1216fd60df360a12ce`: 49 unit, 7 Python approval, 32 Rules/API and 3 browser PASS, typecheck/lint/build/secret scan/approval PASS. Doctor and full final review remain BLOCKED. New code/indexes have not deployed.


## Superseding checkpoint — SM-LIVE-006 / SM-AUTO-007

Actual human approval exists for SM-LIVE-006 and one pilot build with the existing default Compute identity. Production billing is now enabled on selected account 01D369-A6379A-DF9192; prior quota-blocked entries above are historical, not current billing state. Runtime APIs enabled. USD10 monthly project-only budget created/read back; alerts do not cap spend. No measured billing spend or savings claim.

Manager API was granted exact monitoring.timeSeries.list custom roles and exact _Default Logging view access for hunpeolabs-prod, satsunicseoextension and satsunicplan. Administrator CLI read actual request series/log metadata for those three sources; this is NOT runtime Manager verification. Current administrator could not impersonate Manager runtime; no additional impersonation role applied. No raw log payload fetched. Existing build identity Editor is an explicitly accepted one-pilot residual risk; business runtime uses dedicated manager-api.

Implemented locally: operations UI/API bounded Monitoring/Logging reads and source provenance; incident workflow and private inbox persistence; exact-money snapshot/import prototype; owner preferences API. Finance prototype is disabled in production config and finance/preferences endpoints excluded from pilot deployment allowlist. User now requires automatic official-source sync, no manual CSV product workflow, seven apps and app onboarding. SM-AUTO-007 proposes that material delta; it is not yet approved or implemented. Discovery confirms Go source payOS and SEO Lemon Squeezy; SatsunicMec mapping remains unknown, BeFam source access unresolved. No revenue/GA4/billing export data fabricated.

Test status: latest recorded full suite has E2E failure; isolated diagnostic observed real demo getOperations200 and unavailable-source labels, then timed out awaiting finance preview completion. Longer bounded waits/explicit API response assertions are under verification; no production guard weakened. Fresh full checks and Product Language/final review remain required. Current automatic workers, external notification delivery, maintenance, finance connectors and AI are incomplete.

Deployment: application pilot NOT_DEPLOYED at this checkpoint. Google signup remains closed; both blocking triggers must read back before opening. Actual two-owner Google/App Check login and authorized production runtime reads NOT_TESTED. Overall NOT_READY.

Evidence: docs/evidence/billing-live006.json, manager-budget-live006.json, live-operations-read.json, source-discovery.json, satsunicmanager-auth-readback.json; docs/team hash-bound handoffs and ui-qa-v2 correction. Shared source/deploy remains owned by lead.


## Superseding checkpoint — pilot readback and approved local automation/UI

SM-LIVE-006 deployed exactly beforeCreated, beforeSignedIn, bootstrapOwner, listApps, checkConnection, listIncidents, updateIncident, listNotifications, markNotificationRead and getOperations. All ten read back ACTIVE with dedicated manager-api runtime, maxInstances2, concurrency8 and 256MiB. Firestore Rules/indexes released. CLI exited1 because gcf-artifacts has no cleanup policy after successful function creation; no unapproved image deletion/retention change was made. Evidence: evidence/pilot-backend-readback.json and evidence/manager-iam-post-pilot.json.

Both identity blockers are registered; Google signup/self-deletion remain closed. Six live anonymous/invalid-App-Check attempts returned401. These are denial checks, not valid owner/App Check acceptance. Hosting NOT_DEPLOYED, real owner login and authorized Manager runtime source reads NOT_TESTED. Evidence: evidence/satsunicmanager-auth-readback.json and evidence/pilot-denial-live006.json. Administrator source reads verified three actual mappings; they do not establish a browser-closed collector or delivered alerts.

SM-AUTO-007 matching local approval and SM-UI-008 local approval are recorded. Locally implemented: seven named products including exact SatsunicMec, owner app registration with unverified metadata separated from compiled reader authority, metrics-only internal collector with fenced leases and atomic successful checkpoints, no manual financial import workflow, and HunpeoLabs composer presentation/state transitions with blocked AI transport. New callables and collector are excluded from the ten-function live pilot. Current source is newer than the deployed candidate; fresh checks/review are in progress. No 100% visual parity claim.

Still blocked: verified source mapping/access for remaining apps; official finance/GA4/billing export sources; worker identity/schedule deployment; immutable downloadable reports; safe native alert transport and verified external delivery/recovery; AI tools/quota; production owner/App Check, revocation and provider-period reconciliation. Missing money, fees, net settlement, costs and metrics remain unavailable rather than invented zero. Artifact cleanup requires a concrete retention/rollback diff before an infrastructure change. Full master acceptance remains NOT_READY.


### Review corrections and reference comparison

Independent collector review v1 found failed-window retry suppression, skipped collection gaps and lexical ISO precision comparison. Corrected implementation v2 keeps immutable failed attempts, retries into new attempt IDs, deduplicates successful windows, requires contiguous/overlapping recovery and rejects malformed cursor values; source review v2 passed within disabled local scope. Runtime identity still requires actual deployed readback before enablement. Evidence: team/collector-implementation-v2.json, team/collector-review-v1.json and team/collector-review-v2.json.

Public HunpeoLabs idle desktop1280x720/mobile390x844 screenshots were captured using GET-only browser navigation; no question/provider request sent. Reference input geometry recorded in local command output. Manager idle had extra status height; local CSS now positions initial AI status above scope while preserving canonical capsule bottom inset. Full reference modal/motion/IME/backdrop comparison remains NOT_VERIFIED; no 100% claim. Manager own demo modal/hide/reopen/focus/no-AI-transport scenarios passed before the last geometry correction; final fresh suite is running.


### Latest stable validation

Candidate `18e6937b5acb14d3274ce893e87452e6d08b5b311712c58944e2c142a260257d`: 60 unit, 7 Python approval, 41 Rules/API and 6 browser tests passed; typecheck/lint/build/approval/secret scan passed. All ten check records match candidate. Doctor remains BLOCKED; current local changes not deployed. Final review cycle10 remains BLOCKED for complete production/visual/source acceptance, not an unresolved tested collector P1. Current desktop/mobile, demo dialog/hidden screenshots reviewed; idle capsule inset20px browser assertion passed. No 100% reference comparison or complete accessibility claim. Evidence: evidence/checks.json, final-review.json. Token usage/actual billed cost Unavailable; memory candidates None.
