# LeeWay Device Bridge — Customer Onboarding UI

LeeWay-owned React/Vite user interface. The first screen is the onboarding gate for Creator, invited users, and existing-user device pairing. The original operational console remains behind a verified server session.

## Build

`npm install && npm run lint && npm run build`

GitHub Pages: deploy `dist/` to `4citeB4U/LEEWAY-DEVICE-BRIDGE` under `/LEEWAY-DEVICE-BRIDGE/`. A workflow is supplied in `.github/workflows/`. Do not replace the existing live page until reviewed and approved.

## Backend requirements

Set the non-secret `VITE_LEEWAY_*_URL` values at build time using real approved LeeWay/Zitadel endpoints. Blank values deliberately block navigation. Only the existing LeeWay Runtime may redeem invitations, register devices, issue authenticated sessions, emit CRM/ERP records, or authorize customer monitoring.

`VITE_LEEWAY_SESSION_URL` must return a no-store JSON response such as `{ "authenticated": true, "role": "creator" }` or `{ "authenticated": true, "role": "customer" }` for a valid server-verified session, with appropriate CORS and credential policy. This is an expected contract, **not** a claim that the endpoint exists. The frontend never grants Creator status from URL parameters or browser-local settings.

Do not expose tokens in GitHub Pages build variables, browser storage, or client code. Service authorization must remain enforced on the server for every customer/CRM/ERP and device request.

## Evidence and limitations

Original 3D bridge, local browser diagnostics, telemetry demo, workstations, and Tablet preview are preserved. Until connected to authoritative Runtime feeds, displayed sample fleet data and control requests are **not live device execution**. No production package or real enrollment is claimed.

No third-party model API keys are required.

## Qualification

Local `npm run lint` and `npm run build` now pass after aligning the esbuild dev dependency with Vite 8. A local, dev-only session stub can be enabled with `LEEWAY_DEV_STUB_SESSION=1` to preview the onboarding UI; it is not part of production builds. See `docs/qualification/ONBOARDING-UI-2026-11-24.md` for the inspected evidence and limits. Do not promote to production without CI and authenticated end-to-end tests against the LeeWay Runtime.
