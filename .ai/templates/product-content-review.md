# Product Content Review — SM-FOUNDATION-001

Reviewed 2026-10-04, Codex. Target: compact internal web application, two Google owners, vi/en. Actual source inventory: apps/web/src/lib/i18n.ts, features/auth.tsx, features/shell.tsx, components/toast.tsx/action-progress.tsx. Branding uses Satsunic contract and user-authorized HunpeoLabs reuse. Apple principles used as human-centered reference; Apple-only UI conventions are not applicable.

Verified behavior: audited checks persist before completion notice; two-owner backend boundary; financial null values remain —; homepage200 does not imply backend readiness404. Assumption: owner can read technical source details in progressive disclosure. Unknown: production OAuth, sources, model and notification service configuration.

## Inventory and states

| Surface | States | Content/action evidence |
|---|---|---|
| Login | missing config, waiting, denied, retry | Setup message and real Google fallback; verify label; outsider browser test |
| Navigation/filter | default, selected, keyboard names | overview/apps/etc, app/env/period/timezone and locale; URL state browser test |
| Registry | loading, empty, retry, not connected, partial, failed, stale | Full localized enum mapping; per-capability public/backend checks; provenance detail |
| Metrics | null, checked coverage | Count reflects checked apps, never health; revenue/cost unavailable without invented currency |
| Toast | pending, saved, error, hover/focus/hidden, dismissal | copied monotonic countdown unit tests; actual backend completion; browser paused focus/hover test |
| AI | disabled | Ask anything… plus persistent accessible label, Chưa kết nối AI./AI is not connected. |
| Footer | default | Product by HunpeoLabs, verified source-domain link |
| Offline/unauthorized | recoverable, private | offline freshness warning; session revocation cache clear; no resource disclosure |
| Destructive/confirmation | not applicable | no destructive UI action shipped |

Duplicate breadcrumb, registry subtitle, intro and sidebar label removed. vi Traffic/Incidents/Settings shortened naturally. Source detail carries missing provider facts instead of redundant overview prose. Authoritative text inventory remains in i18n; static attribution/prompt/toast countdown labels are in components.

## Data semantics

Backend registry is source of truth. null/missing is unavailable, never0. Coverage is attempts with results, not production completeness. Date formatting uses vi/en locale and selected timezone. Partial and stale remain distinct. App/env/date scope shown in fixed composer. Provider revenue unit/currency cannot be shown before source verification. Owner boundary is enforced server-side and Rules, not visible labels.

## Human Interface principles

| Principle | Status | Evidence |
|---|---|---|
| Purpose | PASSED | Registry check has one explicit action and source result |
| Agency | PASSED | Filters, dismissal, hover/focus pause, locale/theme, logout and retry are actual controls |
| Responsibility | PASSED | Honest emulator label, blocked AI, null finance, partial health disclosure |
| Familiarity | PASSED | Native web select/button/link; fixed app navigation and URL history |
| Flexibility | PASSED | vi/en mobile390/desktop1280 tests, wrapping, reduced motion and focus controls |
| Simplicity | PASSED | Duplicate content removed, detail progressively disclosed |
| Craft | PASSED | Source-shared countdown/progress cleanup tests; timestamp formats and no overflow at tested widths |
| Delight | PASSED | Same HunpeoLabs feedback motion, reduced-motion support; no false completion celebration |

## Platform and gate results

Web patterns, visible semantic statuses and accessible icon names reviewed. No Apple-specific patterns copied. In-context screenshots: docs/evidence/shell-desktop.png, shell-mobile.png, shell-mobile-bottom.png; current Playwright scenarios cover actual emulator auth, partial source, filters, theme, mobile and notifications. Keyboard toast focus tested; full screen-reader audit and 200% zoom NOT_RUN. Production One Tap denial/failure screens NOT_TESTED.

Meaning, audience, respectful tone, brevity, state coverage, privacy, vi/en and in-context review: PASSED within tested local scope. Accessibility complete certification: NOT_RUN (screen-reader/200% zoom absent). Product Language Gate: BLOCKED for full acceptance. No string-only or production quality claim is made. Remaining owner action: approve cloud setup then verify actual production auth/source states; complete expanded accessibility checks before release.


## Production-only delta — SM-LOCAL-004

Only visible delta: remove `Staging` environment option; remaining `Production` label matches server literal and current topology. The URL cannot change server environment. Both vi/en native select retain accessible name. Purpose: one actual environment; Agency: app/date/timezone controls retained; Responsibility: no staging data or invented savings; Familiarity: existing web select; Flexibility: existing mobile/keyboard/locale layout; Simplicity: remove unused choice; Craft: backend and cloud helpers agree; Delight: preserved motion/toast. Actual browser in-context evidence is latest evidence/checks.json + shell screenshots. New incident/inbox backend has no shipped UI strings; UI acceptance of that slice remains NOT_RUN, not passed.


## Current operations / incident / inbox / finance-prototype review — SM-LIVE-006

Audience remains two owners; target responsive internal web, vi/en. Reviewed current operations/pages.tsx, finance.tsx, Shell caller and backend contracts. Finance prototype is emulator-only/default disabled and its endpoints are excluded from the pilot. User's auto-sync-only requirement supersedes manual import as a product destination; this is recorded in proposed SM-AUTO-007, not presented as completed.

| Surface/string inventory | Applicable states and meaning | Current evidence |
|---|---|---|
| Operations Requests/HTTP5xx/rate, service/time/severity, source/detail/load more | Loading, failed/retry, not_configured, permission denied, empty/no observations, partial, available; null means missing, never0; rate is weighted by requests | API schema/unit tests and actual administrator Google read; demo rendered unavailable-source test; production browser NOT_TESTED |
| Hourly chart and table | Accessible chart name, equivalent data table; missing hours break line; timezone selected; HTTP5xx count | Source reviewed; actual rendered live chart NOT_TESTED |
| Incident source firing/recovered versus workflow/new/ack/investigating/mitigated/resolved | No acknowledgement falsely marks source recovered; note/save/cancel and conflict require fresh revision | Real emulator workflow API/browser, inbox-workflow screenshot; failed cold-run timeline preserved |
| Inbox read/readDone/View incident | Read is owner-private and distinct from ack; loading/empty/error/retry/next page | Persistence and relogin browser workflow; screenshot reviewed directly |
| Finance currency/net/cost/empty/partial/source/export; prototype CSV preview/save/cancel | Imported-only scope explicitly disclosed in prototype; partial export disabled; exact minor units; production unavailable | Local unit/integration/browser only; finance-import screenshot exists; not a production connector or latest requested product workflow |
| Shared auth/config/offline/AI/toast | Google fallback and One Tap, unauthorized private data denied, offline warning, pending versus saved, disabled AI | Existing source + browser auth/mobile/toast/reduced-motion tests; real production auth NOT_TESTED |

Principles for expanded surface: Purpose BLOCKED for whole product (automatic workers/seven-app onboarding missing); Agency source reviewed/PARTIAL browser evidence (scope remount verified; QA-003 withdrawn); Responsibility PASSED for bounded reviewed meaning (unavailable ≠0, raw logs excluded, workflow separate); Familiarity PASSED (native controls and existing shell); Flexibility NOT_RUN for new operations narrow/zoom/screen-reader/long-content; Simplicity source reviewed with progressive details, new full in-context acceptance NOT_RUN; Craft BLOCKED pending stable full suite/new screenshots/VI Requests and Service terminology review; Delight NOT_RUN for new operation error/pending keyboard interaction, existing shared toast only verified.

Newest Product Language Gate: BLOCKED. This supersedes older foundation-only inventory and does not certify expanded UI or pilot release. Required remaining evidence: current operations default/loading/error/partial states, narrow vi/en and keyboard/zoom, current exact-candidate suite, then real owner/App Check browser acceptance. No string-only pass or complete accessibility claim.


## Superseding local review — SM-UI-008 / SM-AUTO-007

Current changed-string inventory: Ask/Hỏi SatsunicManager; Send/Gửi câu hỏi; Close/Đóng hội thoại; Hide/Ẩn khung hỏi; Continue/Tiếp tục hội thoại; AI-not-connected and local-session notice; Conversation/Hội thoại; canonical Ask anything placeholder/launcher. States: idle, focus, submitted-but-unsent modal, closing, hidden/reopened, resumed, changed scope (question reset). No AI retrieval/loading/answer or delivery is represented.

Registry additions: SatsunicGo and exact SatsunicMec; Add application/Thêm ứng dụng, Application name/Tên ứng dụng, optional Google Cloud project, source verification notice, Add/Thêm, Cancel/Hủy, persisted success and safe retry error. Add-app is emulator-only until its production callable is approved/deployed. Project metadata never authorizes reads. Operations Vietnamese now uses Lượt gọi and Dịch vụ; metadata description specifies only time/severity/HTTP status. Finance shows missing official-source connection, automatic source-sync expectation, currency/verified amounts and bounded export; manual CSV input/preview/confirmation removed. Unknown net settlement and costs omitted, incomplete coverage blocks totals/export.

Purpose: bounded source-backed operations and useful local presentation; whole-product BLOCKED by missing sources. Agency: modal dismissal/hide/reopen and app registration implemented, browser checks pending. Responsibility: unsent questions and unavailable sources explicitly disclosed; no invented money or health. Familiarity: native dialog/form/buttons/selects and reused canonical capsule. Flexibility: vi/en, responsive and reduced-motion source reviewed; current mobile/keyboard browser acceptance pending, native zoom/screen-reader NOT_RUN. Simplicity: one capsule, short labels, no manual money entry. Craft: source geometry/motion provenance recorded, scope reset prevents misleading retained context; reference visual parity NOT_VERIFIED. Delight: canonical reversible animation/hide/reopen, reduced-motion respected; current rendered motion comparison pending.

Gate remains BLOCKED for complete acceptance until current screenshots/interactions, source comparison and real owner/App Check production evidence exist. Earlier prototype screenshots and manual import inventory are historical and do not describe this candidate.


Current in-context evidence: latest stable six browser scenarios cover both demo owners, outsider denial, navigation/theme/mobile, paused toast, incident/inbox persistence, unavailable official finance/operations and composer modal/Escape/focus/hide/reopen/noAI transport. Desktop/mobile and demo modal/hidden screenshots reviewed by lead. Initial capsule inset20px asserted and compared to public reference idle images. Purpose/Agency/Responsibility/Familiarity/Simplicity/Craft/Delight pass only those bounded local workflows; Flexibility partial vi/en/mobile/reduced-motion, full screen-reader/native zoom still NOT_RUN. Full reference parity and production evidence remain BLOCKED.


## Release009 current local evidence
Candidate caa92cba588125ebc70091297ff097b798c39d0e2f10f53f809e9dd5a95a7989: eight browser cases now pass. Add-app is enabled for the approved eleven-function release, with persisted demo onboarding and unverified authority retained after refresh. IME Enter, mobile dialog, paired backdrop, capsule geometry and focus restoration tested. Current desktop screenshot reviewed: explicit unsent AI notice remains legible over content. Purpose, Agency, Responsibility, Familiarity, Simplicity, Craft and Delight pass these bounded local states; Flexibility passes tested vi/en/mobile/keyboard/reduced-motion paths, native zoom and screen reader NOT_TESTED. No new string from CSP/lockfile corrections. Whole-product production language acceptance remains BLOCKED pending live owner session.
