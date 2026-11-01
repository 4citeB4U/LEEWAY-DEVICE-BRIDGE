# ZITADEL public MCP ingress reconciliation

Status: source-reconciled; production redeploy pending GitHub/Vercel integration.

This commit is based on the verified Device Bridge `origin/main` public ingress source. It preserves the transport-only Vercel gateway and changes only the provider-facing source labels from Pocket ID to provider-neutral ZITADEL OIDC terminology. Runtime authorization remains owned by Runtime Fabric.

Verified bindings outside the repository:

- Issuer: `https://leeway-mcp-d3xoxh.us1.zitadel.cloud`
- Public resource: `https://leeway-device-bridge.vercel.app/mcp`
- ChatGPT callback: `https://chatgpt.com/connector/oauth/a2E7K2Xx5IFX`
- ZITADEL project: `397622361785898800`
- ZITADEL public client: `397629401371514672`

Boundary:

- The public Vercel app is a transport gateway to Runtime Fabric.
- The native Device Bridge remains loopback-only and must be separately bound through an owner-authorized host adapter before physical-device discovery or commands are claimed.
- No public deployment claim is made by this source receipt alone.
