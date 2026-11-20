# Render cutover checkpoint — 2026-11-19 America/Chicago

## Identity and authority

- Project: `LEEWAY-DEVICE-BRIDGE`, W01 Device Bridge repair.
- Authority: Creator-approved removal of the obsolete Vercel Bridge path; retain the existing Render ingress.
- Canonical source at the cutover: `b2e932abdfeaa1abefcb06f1979264e9e4c6a620` on `main` and `integration/railway-public-mcp-ingress-20261028`.

## Work performed

1. Confirmed that the installed ChatGPT connector still calls `https://leeway-device-bridge.vercel.app/mcp` and receives HTTP 402 `Payment required` before reaching a LeeWay service.
2. Confirmed the existing Render service `leeway-device-bridge-mcp-qual` (`srv-dbh4vv6k1f9s73efipv0`, Ohio, free plan) was running the old ancestor `f2fac5b65da437f56a3ec7ab372e308d28372a94` from the existing integration branch.
3. Fast-forwarded that integration branch to `b2e932a` without overwriting divergent history, then triggered Render deploy `dep-dbvql1d9fdbs73bngq70`.

## Observed evidence

- Deploy `dep-dbvql1d9fdbs73bngq70`: `live` at 2026-11-20T02:04:30Z, source commit `b2e932a`.
- `GET https://leeway-device-bridge-mcp-qual.onrender.com/healthz`: HTTP 200, process `RUNNING`.
- OAuth protected-resource metadata: HTTP 200, resource `https://leeway-device-bridge-mcp-qual.onrender.com/mcp`, ZITADEL issuer advertised.

## Current gate and blockers

- The source and Render deployment are updated; neither proves an authenticated Runtime Fabric path or device command execution.
- The ChatGPT connector setting remains stale and must be changed from the Vercel URL to the Render `/mcp` URL. That persistent connection change has not been made in this checkpoint.
- Device discovery, read/write grants, app control, and physical computer control remain `NOT_EXECUTED` pending an authenticated owner-scoped connector session.
- No unrestricted filesystem authority is authorized. The required end state is explicit per-user, per-device capability grants for list, read, write, application control, and screen/pointer control.

## Next executable action

Update the saved ChatGPT Device Bridge connection to the Render endpoint, authenticate through the advertised issuer, then run owner-scoped discovery followed by a bounded read and a separately approved write test.
