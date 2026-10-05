# SM-LIVE-006 — production pilot deployment and read-only source access

Status: APPROVED by actual current user reply `Approve SM-LIVE-006`. Local source implementation is already approved by SM-LOCAL-004; this plan authorizes only the following live changes after current candidate checks pass. Production-only. Billing switch to account01D369-A6379A-DF9192 was separately selected/approved by the user and linked successfully; no source billing changes.

## Exact resource / permission diff

- Target Manager project satsunicmanager /317759361800, us-central1. Deploy reviewed Hosting bundle and compatible Firestore indexes/Rules, plus existing/new callable functions and two Identity Platform blocking functions. No Storage bucket, AI invocation, paid BigQuery query, production finance import, WIF, source app deployment or external email in this pilot.
- Existing runtime principal manager-api@satsunicmanager.iam.gserviceaccount.com retains only own-project datastore.user and custom managerTokenVerifier. Do not grant Owner/Editor or keys.
- Create custom role managerMonitoringRead in each verified source project hunpeolabs-prod, satsunicseoextension, satsunicplan with exactly monitoring.timeSeries.list. Bind that role only to the Manager API principal. Permission applies to project metrics; server queries are fixed to the discovered Cloud Run services listed in functions/src/integrations/resources.ts. No metric/alert/source configuration writes.
- Bind roles/logging.viewAccessor to that same principal on the exact existing _Default log view in each source project: projects/PROJECT/locations/global/buckets/_Default/views/_Default. No private audit-log role. Adapter fetches only timestamp/severity/resource metadata/httpStatus through server-side field projection, not raw text/jsonPayload/headers/URLs/user data. Resource/project/view chosen on server, never browser input.
- Public HTTPS transport required for Firebase client callables: grant roles/run.invoker to allUsers only on the exact newly deployed callable Cloud Run services if Firebase CLI requires it. All business access still requires verified Firebase two-owner identity, active ownerAccess and App Check; CORS restricted to two exact Manager Hosting origins. Identity blocking transport/managed trigger registration follow supported Firebase deployment. Keep end-user signup locked until both blocking trigger URLs read back; then allow Google signup through exact allowlist blocks, preserving self-deletion disabled and all other providers disabled.
- Firebase deploy may provision documented Google-managed service agents. Inspect resulting bindings. Stop for broad unexpected grants or any manual build/deployer role addition; those require a further exact diff. Existing default Compute/App Engine/admin identities must not run business APIs.

## Cost / exposure / rollout

Blaze billing now enabled; no $0 promise. Callables maxInstances2/concurrency8/timeout30s/memory256MiB; identity timeout7s. Durable operations request cap10/minute/owner; readpage limits50; bounded response/deadline; no background polling/collector/scheduler yet. USD10 budget alerts proposed on production project only, alerts-only, no hard cap; exact budget creation request must be previewed/read back. No savings/spend claims without billing source.

Order: validate current source/tests → confirm approved exact candidate → compatible Rules/indexes → backend with closed signup → verify two blocking triggers and deny unauthenticated callables → public config + Hosting → App Check browser check → safely unlock signup only with both allowlist blocks registered → real two-owner sign-in and outsider denial. Owner must complete actual interactive Google login; do not manufacture tokens or bypass blocking/App Check. Rollback keeps signup closed, reverts Hosting release/function code to captured release if available, preserves data/history; first deployment has no previous application revision, so maintenance/closed login is fallback, not fabricated rollback proof.

## Verification and limitations

Read source IAM bindings back; optionally test real adapter using impersonated runtime identity only if current administrator already has impersonation authority (do not grant it automatically). Live API unauthorized401 and missing App Check rejection; Rules anonymous403. Live authorized read requires actual browser owner. Metadata/source read using administrator is preliminary integration evidence, not runtime/production UI acceptance.

SatsunicCode Run metadata is unverified; BeFam project inaccessible/ambiguous; no new source grants there. No billing export datasets found in the five checked projects; absence here does not prove account-wide absence. Finance/GA4/revenue/email sources remain blocked until exact verified configuration. This is a real monitoring pilot, not full master production acceptance.

Pilot function allowlist: beforeCreated, beforeSignedIn, bootstrapOwner, listApps, checkConnection, listIncidents, updateIncident, listNotifications, markNotificationRead, getOperations. Finance endpoints remain local pending their complete UI/review; no automatic production finance writes.
