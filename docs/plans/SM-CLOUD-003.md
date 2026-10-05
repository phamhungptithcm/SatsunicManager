# SM-CLOUD-003 v1 — next resource and cost approval

Status: APPROVED. The human approved this exact v1 plan with “Approved” in the current conversation. Resource existence must still be verified.

Observed: satsunicmanager ACTIVE, Firestore us-central1, Google provider configured but signup disabled, no bucket, no application deployment, no staging project verified. Billing is disabled. Account `01428C-358437-2361F8` (Firebase Payment) is OPEN and is the actual account linked to hunpeolabs-prod. Its permission to link Manager has not been tested by mutation. Manager contains only the managed firebase-adminsdk service account; a dedicated API identity is still required. Parent is absent in current Manager metadata; no organization is invented.

## Proposed resource diff

| Resource | Current | Proposed |
|---|---|---|
| satsunicmanager billing | No account | Link billingAccounts/01428C-358437-2361F8 |
| staging project | Unresolved | Create `satsunicmanager-staging` under the same no-parent setup and link the same billing account; proposed ID availability NOT_VERIFIED, stop on conflict |
| staging foundation | Absent | Add Firebase/web app, Google-only Auth with signup locked, default native Firestore us-central1 + delete protection + tested Rules |
| Auth subtype | FIREBASE_AUTH | Upgrade both Manager environments to Firebase Authentication with Identity Platform; keep signup/deletion locked until blocking acceptance |
| runtime identity | Managed admin identity only | Create `manager-api` service account in each Manager project; no key files |
| runtime Firestore grant | None for new identity | roles/datastore.user scoped only to its own dedicated Manager project |
| runtime token verification grant | None | Custom project role `managerTokenVerifier` containing only firebaseauth.users.get; bind only its own manager-api identity |
| paid runtime/build APIs | Not all enabled | Enable cloudfunctions.googleapis.com, run.googleapis.com, cloudbuild.googleapis.com, artifactregistry.googleapis.com, recaptchaenterprise.googleapis.com in Manager projects |
| monthly budget alert | None | Proposed USD10/month total filtered to the two Manager projects, thresholds50%/90%/100%; existing billing administrators receive standard notices |
| Storage | No bucket | Create Firebase default bucket only after exact location and managed-service IAM preview, then release tested private-report Rules |
| App Check | Not configured | Register only actual Manager web app IDs; Enterprise score keys limited to verified Manager Hosting domains, no wildcard/all-domain keys |

USD10 is a proposed alert threshold, not observed spend or a hard spending cap. No minimum-cost claim is made. Existing Functions runtime caps remain maxInstances2/concurrency8/30s/256MiB; blocking maxInstances2/7s. No paid PITR, backup schedule, BigQuery export, Vertex invocation, email channel or source-project grants in this plan.

## IAM/deployment boundary

No owner/editor roles, service-account keys or customer-project access. Do not grant broad access to the existing firebase-adminsdk identity. Human CLI identity remains the currently authenticated administrator. Build/deploy identities, automatic service-agent bindings and each actual service-invoker diff must be inspected after API provisioning and shown before grants. They are not authorized by an unspecified blanket role list.

This approval covers resource/cost setup and the explicit runtime grants above. Hosting/Functions staging deployment, build/invoker IAM changes, WIF and production promotion need their exact candidate/resource diff before execution. No repository remote is verified, so no GitHub WIF principal or repository is invented. No production app deployment is authorized here.

## Validation and rollback

Read back every resource, provider, disabled signup, region, role binding, budget filter and account. Verify no additional source-project writes. Keep signup closed if blocking functions are absent. Do not delete projects/data, detach billing or revoke existing roles automatically. A creation conflict or unexpected paid requirement stops that part; complete independent authorized work first.

Next executable acceptance after this setup: deploy reviewed staging backend with App Check/blocking triggers, validate both real Google owners and rejected outsider, live revocation and real source capabilities, then present production promotion evidence and rollback target.
