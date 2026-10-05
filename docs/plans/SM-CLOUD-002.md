# SM-CLOUD-002 — proposed cloud setup diff

Status: STEPS 1–2 APPROVED by human reply "Approved" in the current Codex chat, following the explicit request to register web app/configure Auth and create Firestore in us-central1. Billing, IAM, paid Identity Platform changes, Functions/Hosting deployment and steps 3–6 remain unapproved. No mutation executed at approval recording.

Observed 2026-10-04 using authenticated gcloud/Firebase CLI:
- satsunicmanager exists, ACTIVE, name SatsunicManager; user supplied this exact ID.
- Firebase apps:list returns an empty array.
- firestore.googleapis.com is disabled (SERVICE_DISABLED); no database existence claim beyond unavailable readback.
- billing projects describe reports billingEnabled:false, no linked account.
- Region, OAuth public client ID, App Check key, Identity Platform/provider/blocking config and service identities remain unverified.

Proposed staged changes, only after approval:
1. Register one Manager web app in satsunicmanager; enable/configure Google-only Auth, Identity Platform blocking triggers; exact two-owner allowlist enforced server-side. Public SDK configuration may be written only after actual readback. No credential contents in repository.
2. Enable Firestore API and create native Firestore database if absent after readback, proposed us-central1. Deploy deny-by-default Firestore/Storage rules. Location is immutable: approval explicitly includes this proposed region.
3. Create dedicated runtime and deployment service accounts with scoped Firestore/audit access and WIF deploy identity. No owner/editor grants; no customer write access. Show exact IAM binding diff separately before applying.
4. Functions gen2 requires billing. Linking a billing account, enabling paid APIs, Identity Platform charges, budget/alert and maxInstances caps need a separate explicit billing approval. No account is selected from same-name accounts by guess.
5. Separate staging project is required by the specification. Its ID is unresolved; do not treat any proposed or inaccessible ID as an existing verified resource. Confirm creation/organization and billing scope before provisioning.
6. Deploy first to staging; verify live Google login for both owners, rejected outsider, App Check, revoked access, Rules and actual source scopes before production promotion. Each production deploy requires its concrete artifact/source/IAM diff and rollback target.

Rollback: no production deployment exists to restore. New Auth/config resources must be recorded before changes; revert configuration and disable new endpoints if acceptance fails. Do not delete projects, data or billing links automatically.

This plan does not authorize financial corrections, customer data writes, source-app changes or production deployment. Immediate safe next cloud stage can be app registration plus read-only provider configuration discovery; billing/IAM/deploy remain gated.

## Executed result

Steps1–2 approved and executed partially: one verified web app; Firestore API + native default DB us-central1 with delete protection; Firestore Rules deployed/hash-matched and anonymous403; standard Auth initialized, Google-only configured, signup/deletion disabled and localhost removed. Google OAuth client ID came from actual provider readback.

Blocking Functions/Identity Platform remain blocked by paid-resource/IAM/deployment scope. Storage Rules remain NOT_DEPLOYED because no bucket exists and paid provisioning was not authorized. Billing remains false. See evidence/cloud-setup.json, cloud-auth-readback.json, cloud-auth-hardening.json and firebase-google-provider.jpg. Next resource diff: SM-CLOUD-003.
