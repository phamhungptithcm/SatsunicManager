# SM-UI-008 — exact HunpeoLabs Ask Anything presentation reuse

Status: APPROVED by actual human reply `Approve SM-UI-008 local`. Human steering verified in coordination chat: “ask anything cần làm giống 100% HunpeoLabs đã làm”. Existing Manager disabled rectangular composer is materially different; SM-LOCAL-004 preserves existing composer, so this concrete interaction delta requires approval before protected edits.

## Verified reference and source impact

Reference: current HunpeoLabs components/ask-hunpeolabs.tsx + module CSS mounted by AskSite. Hash-bound mapping: docs/team/composer-reference-v1.json. Lead alone changes Manager shell/composer/styles; do not change HunpeoLabs source or add redundant UI framework/dependencies.

Reuse exact presentation geometry/tokens/icons/motion/state transitions through one Manager-local adapted component: desktop fixed centered capsule max960px/calc100%-40px, radius50px,border2px#6378ff,min-height76px,input18px,send50px; 600px mobile boundary,width100%-28px,min-height64px,input16px,controls44px,safe-area positioning. Modal max760px/viewport-32px,radius24px; source focus/button/entry timings160/140/180ms, expand360ms, collapse/hide320ms, reveal200ms and source cubic-bezier. Preserve reduced motion and cancellation/cleanup. Record code/CSS provenance and reference hash.

State machine: idle/focus, modal open/closing, hide/launcher/reopen, resume, Escape and paired backdrop interaction, focus restoration, body scroll lock, IME-safe Enter. Scope remains explicit outside the canonical capsule; Manager sidebar is hosting context, not a reason to invent a different capsule. Shared chrome/toast continue unchanged.

## Domain and authorization boundary

Do NOT import HunpeoLabs public FAQ retrieval, marketing suggestions, knowledge data, public routes/contact/privacy claims, API /api/ask, credentials or provider/App Check implementation. Manager keeps two owners, own auth/App Check and server-scoped data. Until real Manager model/tools are connected, show concise vi/en unconnected status and block question transmission. Presentation close/hide/reopen/focus controls remain usable; do not fake pending/retrieval/answers. This plan does not enable AI or authorize provider/cloud access.

## Acceptance / validation

Compare reference and Manager screenshots at same desktop1280/mobile390/600px-boundary viewports for idle/focus/modal/closing/launcher/reopen and reduced motion. Verify geometry/colors/typography/padding/icons/shadows, source timing and interruption, Tab order/focus, Enter/IME, Escape, backdrop down/up/cancel, scroll lock/restoration, unmount cleanup, safe-area/long text, no content occlusion and keyboard reachability. 200% CSS layout simulation is distinct from native browser zoom and screen-reader checks. No 100% parity claim before actual visual/interaction evidence. Product Language inventory covers all added strings/states/eight principles; domain substitutions are explicit.

Local edit scope: apps/web/src/features/conversation, shell.tsx, styles/source CSS module, tests and docs/provenance/reviews. No new dependency or backend behavior in this delta; no production deploy beyond separately approved SM-LIVE-006. Keep WIP; rollback component rendering without data deletion. Backend pilot bootstrap may continue while UI parity is pending; Hosting release waits for fresh candidate checks/review.
