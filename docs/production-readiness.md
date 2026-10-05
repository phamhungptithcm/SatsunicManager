# Production readiness

Full master: **NOT_READY**. SM-RELEASE-009 pilot release is in progress; this checkpoint supersedes historical status in evidence/readiness-before-release009.md.

Candidate: `caa92cba588125ebc70091297ff097b798c39d0e2f10f53f809e9dd5a95a7989`.

| Area | Implemented and tested | Production evidence |
|---|---|---|
| Two-owner Google/Auth + App Check | Allowlist, token verification, revoked/disabled access, blocking triggers, real SDK missing-AppCheck regression | Existing two triggers registered; genuine owner sessions NOT_TESTED; signup closed pending safe release sequence |
| Fixed shell, seven-app registry, add-app | Persisted onboarding, source authority remains separate, vi/en and mobile browser checks | Release in progress |
| HunpeoLabs composer/toast | Canonical presentation, IME, focus, Escape, paired backdrop, hide/reopen, responsive states | Local browser only; AI disconnected |
| Operations | Scoped Monitoring and log metadata readers for three verified projects, no raw log reading | Administrator reads verified historically; runtime owner read NOT_TESTED |
| Incidents/inbox | Transactional workflows, deduplication, owner-private read state | Release in progress; automatic ingestion/delivery unavailable |
| Finance/analytics/billing | Explicit unavailable/partial states; no invented totals or manual CSV | Official source descriptors/authority missing; BLOCKED |
| Automatic worker/reports/email/AI | Local collector foundation only | Not enabled or deployed; outside release009 |

Stable local checks all PASSED: 64 unit, 41 Rules/API, 8 browser, 7 approval regression; typecheck, lint, build, approval, secret scan and doctor. Exact commands and candidate binding: evidence/checks.json. Emulator identities and fixtures are not production acceptance.

Functions production archive has its own npm-generated lockfile and existing security overrides; isolated audit reports zero vulnerabilities. Development tooling retains nine advisories (seven high, two moderate), unresolved. Runtime audit is not a general security certification. Build identity retains existing Editor under explicit release009 approval; runtime identity stays manager-api with narrow grants. Budget is an alert, not a spend cap.

Repository intelligence READY at release preflight. Independent bounded source review v2 PASS; full master final review remains BLOCKED by live acceptance and missing end-to-end sources/workers. Native governance runtime ledger unavailable; reports are manual, no native receipt claimed. Token usage and actual billed cost Unavailable. Memory candidates: None.
