# Manager UI reuse

The human approved reuse of HunpeoLabs navbar motion, global feedback and animations in the current chat on 2026-10-04. This is an additional design direction within approved local SM-FOUNDATION-001 scope. No source application was changed.

Canonical visual authority: sibling Satsunic `docs/design/satsunic-ui-contract-v1.md`: white/gray, royal blue #163cff, navy #111c35, thin borders, compact web controls. No green legacy prototype was used.

| Source in ../HunpeoLabs | Manager adaptation |
|---|---|
| lib/ui/action-progress.ts | Exact source copy; concurrent requests release tokens in finally |
| lib/ui/toast-countdown.ts | Exact source copy; pending/hover/focus/hidden holds and monotonic five-second budget |
| components/action-progress.tsx | Imports and vi/en accessible label; callable requests drive real progress |
| components/blog-admin/toast.tsx | Imports and Lucide icon adapter; portal, pending handling, countdown, focus and hover preserved |
| styles/blog-design.css toast styles | Same toast entry animation, progress track, semantic colors, reduced-motion rules |
| components/site-header.tsx scroll loop | ReactRouter-compatible effect with rAF, passive scroll, cleanup, reduced motion, menu stability; fixed Manager header retains 64px footprint |
| styles/globals.css action progress | Copied animation and reduced-motion variant |
| styles/globals.css reveal curve | Same 720ms easing adapted to route registry mount; no hidden content depending on observer |

Source hashes for unmodified modules: evidence/ui-reuse.json. Marketing-specific diagrams, carousels and product illustrations are outside the Manager shell; this is not a claim that every animation in the entire HunpeoLabs site was copied. The footer uses the exact requested attribution. Ask anything remains disabled with an honest AI connection status.

Copy inventory: apps/web/src/lib/i18n.ts contains the complete vi/en surface inventory, including auth/default/loading/disabled/partial/stale/error/offline and missing-source states. Scope and detailed sources are retained; duplicate breadcrumb, intro block, registry subtitle and sidebar marketing label were removed. Revenue and cloud cost remain null, never synthetic zero.
