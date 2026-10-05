# SM-RELEASE-009 — production application release and Git sanity

Status: APPROVED by actual human reply `Approve SM-RELEASE-009` for the exact production delta below. Human current request authorizes finishing local work and commit/push; SM-LIVE-006 already authorizes Hosting and safe signup unlock after both identity blockers. SM-AUTO-007/SM-UI-008 local approval does not independently authorize a new function. Repository Intelligence Gate refreshed READY; CodeGraph getOperations structure and CocoIndex release contracts verified against source. Existing implementation, scope, Rules/auth boundaries and tests inspected.

## Exact production diff requiring approval

Target satsunicmanager /317759361800 only, us-central1; production only. Redeploy the original ten SM-LIVE-006 functions from the freshly tested release candidate, and create only addApp. Deploy reviewed Hosting bundle, compatible unchanged deny-by-default Rules/indexes. listApps/getOperations now accept the approved seven-app registry; unverified mapping never becomes query authority. addApp requires a real owner, active access, recent authentication, App Check, revision/idempotency and durable10/minute cap. Runtime uses existing manager-api@satsunicmanager.iam.gserviceaccount.com and existing narrowly scoped grants. All11 functions maxInstances2/concurrency8/256MiB; callable30s, identity7s. Public HTTPS transport on exact callable services retains business Auth/App Check enforcement and two exact Hosting CORS origins.

For this release's function builds only, reuse existing 317759361800-compute@developer.gserviceaccount.com with its existing roles/editor, a disclosed residual build risk. Do not grant Editor or any new build/runtime role, create keys, or reuse this identity for business runtime. Stop if new manual grant is required. Standard Google-managed deployment service agents may be provisioned; inspect readback.

Signup: refresh readback of Google-only Identity Platform, exact domains and both allowlist blockers; publish Hosting with App Check registration unchanged, then unlock end-user signup under the existing SM-LIVE-006 order. Self-deletion and every non-Google provider remain disabled. Owner must personally complete real Google login; no manufactured tokens or bypass. Production addApp flag becomes true only when its deployed Auth/App Check/caps metadata are verified.

No collector/Scheduler/PubSub, additional source grants, billing-account/budget changes, report bucket, artifact deletion/cleanup policy, finance/analytics connector secrets, provider OAuth, email, AI or source-app deployment is included. Current finance stays disabled and honest missing-source states remain. Existing USD10 alerts-only budget is not a cap. Function build/storage/requests may incur charges; no invented projected dollar amount or savings.

## Local implementation / Git diff

- Add explicit addAppEnabled config defaultfalse; retain demo availability and enable production only after exact backend readback.
- Release wrapper accepts only recorded release approval and exact fixed eleven-function selection; doctor binds candidate, actual cloud readback and the approval receipt, never arbitrary deploy args.
- Correct capsule-context overlap/contrast while retaining canonical capsule and motion; expand IME/backdrop/viewport and add-app actual emulator checks under existing SM-UI-008/SM-AUTO-007 local approvals.
- Add GitHub Actions sanity: Node22, locked npm install, compiler/lint/build/unit/security/approval and dedicated demo emulators/browser; no cloud secrets, credentials or deployment. CI success is not production acceptance.
- Audit complete staged files for secrets/PII/raw production data; exclude local credential/build/index/runtime caches. Preserve WIP. Commit with Conventional Commits and push normal fast-forward to verified empty origin/main. No force push or automatic PR needed.

## Validation / rollout / rollback

Fresh exact-candidate checks and Product Language/final source review → commit source and verify remote SHA → backend exact11 with signup closed → readback states/identity/caps/auth blockers/public denial → Hosting hashes/config/headers/browser App Check checks → signup unlock → real two-owner/outsider/user revocation/provider-period source acceptance where available. Record each independently in production-readiness; full master remains NOT_READY while automatic collection, source/report/delivery and required credentials are absent.

Capture actual pre-release function source storage references and Hosting release metadata before mutation. Rollback uses captured actual versions where available; initial Hosting has no earlier application release, so closed login is fallback. Never delete user data/history or invent a restoration drill. Stop affected deployment for unexpected roles/resources, missing source authority, failed review or unavailable real owner interaction. Complete unaffected Git/sanity work.

## In-scope App Check transport correction

Pre-release source review found Hosting CSP lacked reCAPTCHA connection and challenge-frame endpoints. Add only connect-src https://www.google.com/recaptcha/ and frame-src https://recaptcha.google.com/recaptcha/ per https://docs.cloud.google.com/recaptcha/docs/faq. Retain frame-ancestors/object/base restrictions and all Auth/App Check enforcement. This corrects the already-approved Google App Check integration; no provider, permission or source scope expansion. Verify exact deployed headers and live browser separately.

Production archive correction: Functions now carries its own npm-generated lockfile and the same existing root security overrides. Direct dependency versions are unchanged; isolated installation audit reports zero vulnerabilities. This makes Cloud Build resolution reproducible within the approved release source scope.
