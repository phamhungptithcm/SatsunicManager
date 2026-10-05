# SatsunicManager

Internal Manager for exactly two Google owners. React/TypeScript, Firebase callable backend, deny-by-default Firestore/Storage Rules. Production project ID supplied and verified: `satsunicmanager`; web app/Auth/Firestore setup exists and Firestore Rules are deployed; application Hosting/Functions are not deployed.

Use Node 22. `npm ci --ignore-scripts`, `npm run typecheck`, `npm run lint`, `npm run build`, `npm test`.

Dedicated local emulator ports avoid other sibling applications: Auth 29099, Firestore 28080, Storage 29199, Functions 25001. Java is required by Firebase emulators. `npm run emulators`; browser tests launch Vite at 25173 with development-only demo configuration. Never use demo config in production.

`node scripts/validate/evidence.mjs --emulators` requires GCLOUD_PROJECT=demo-satsunicmanager and the emulator-host environment variables documented in tests/config. It records current source hashes, timestamps and exit codes. Doctor intentionally blocks deployment until cloud configuration and approval exist.

The HunpeoLabs probe is a real bounded HTTPS request: public homepage reachability and a separate candidate /healthz readiness check. Homepage success does not prove backend readiness. Financial, monitoring, analytics and AI data are not fabricated.

See docs/production-readiness.md, docs/ui-reuse.md and docs/plans/SM-CLOUD-002.md for current scope and blockers.
