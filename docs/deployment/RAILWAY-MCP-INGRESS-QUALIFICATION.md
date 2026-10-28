<!--
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.HOSTING.RAILWAY
TAG: LEEWAY.PUBLIC_MCP_MANAGED_INGRESS_RUNBOOK.V1
5WH: WHAT=Operate canonical public MCP gateway on managed Node hosting; WHY=No Vercel or owner PC dependency; WHO=LeeWay Industries owner; WHERE=docs/deployment/RAILWAY-MCP-INGRESS-QUALIFICATION.md; WHEN=2026-10-28; HOW=GitHub source, explicit HTTPS resources, original handlers and independent verification.
AUTHORITY: Candidate deployment runbook only; no production admission.
LICENSE: MIT
-->
# Railway public MCP ingress: deployment and evidence contract

**STATUS: SOURCE CANDIDATE ONLY.** No Railway project, deployment, owner Pocket ID enrollment, real Continuum readback or device execution is certified by this source.

## Deployment boundary
- Canonical source remains GitHub repository 4citeB4U/LEEWAY-DEVICE-BRIDGE. Do not transfer repos or use the owner's PC as an always-on service.
- The managed Node listener is operator/hosting/start-public-mcp-ingress.mjs, started by npm run start:public-mcp. Node 22+ is required. Railway injects PORT; the service listens on all interfaces inside managed hosting, not on the owner's Windows machine.
- The start script invokes the **existing** api/mcp.mjs and api/oauth-protected-resource.mjs transports. It does not create a local Bridge controller or host any database.
- Railway terminates external HTTPS and routes it to the service internal HTTP port. Generate an approved Railway domain; never claim an endpoint before deployment and independent HTTPS verification.
- GET /healthz returns process-only health, explicitly labels all live providers NOT_PROBED, and does not grant production admission. POST /mcp and GET /.well-known/oauth-protected-resource/mcp preserve the existing authenticated proxy contract. All other paths are denied.
- No Dockerfile, Docker Compose, or owner-local Docker dependency is introduced. **Railway itself uses internally managed container images**; this should not be misrepresented as a container-free infrastructure.
- New Railway projects should use supported Infrastructure as Code (.railway/railway.ts) or service settings rather than legacy railway.json / railway.toml, deprecated for new projects in October 2026.

## Managed-service configuration (secrets in Railway, never GitHub)
| Variable | Binding |
| --- | --- |
| PORT | Injected listener port |
| LEEWAY_MCP_AUTH_ISSUER | Exact HTTPS issuer of a single independently deployed and enrolled Pocket ID authority |
| LEEWAY_MCP_AUDIENCE | Exact public Railway HTTPS domain with path /mcp |
| LEEWAY_MCP_UPSTREAM | Exact independent Runtime Fabric HTTPS /mcp resource |

The ingress is stateless transport, **not a token verifier**. Runtime Fabric validates the Pocket ID JWT signature, issuer, owner, resource, expiry and scope. Do not store OAuth identity signing keys or database credentials in this gateway.

## Mandatory provider boundaries
1. Pocket ID must run once on qualified persistent hosting with durable, backed-up database and separate signing-key custody. It must not be instantiated by each device. Its identity DB is distinct from the canonical Continuum databases.
2. Runtime Fabric must expose a separately qualified authenticated MCP endpoint and bind native Device Bridge read-only tools. Runtime Fabric PR #117 adds a candidate adapter but is not live evidence.
3. Continuum keeps canonical owner-scoped data via its original service: SQLite, optional DuckDB/PouchDB/Electric+PostgreSQL, VRAM checkpoint handoff, encrypted storage compartments and exact readback. Continuum PR #6 is source-contract candidate only. Never create substitute empty databases or put owner data in ephemeral service files.
4. Device Bridge PR #79 adds MCP discovery and actual owner-scoped record qualification checks, not authorization to execute commands on Windows.
5. Every production mutation requires Formula, independent Veritas PRE/POST, Receipt Authority and Learning Ledger qualification, owner consent and durable receipts. A deployed ingress or HTTP 200 health does not qualify production.
6. The owner's Windows PC requires its own explicitly authorized native Device Bridge agent only when that physical PC is to be operated. Central services remain independent of it.

## Required 10-phase engineering loop
1. Investigate: pin GitHub revisions, confirm original provider IDs and Railway account project/service inventory.
2. Diagnose: enumerate missing auth issuer, gateway, Runtime Fabric, Continuum, database and device relay bindings.
3. Plan: exact domains, scopes, key custody, persistent volumes, rollback and failure paths.
4. Implement: connect existing GitHub source, deploy stateless gateway and independently approved runtime and identity services.
5. Test: source CI, bounded transport and negative-token tests, health and OAuth metadata.
6. Validate: live Pocket ID login, owner token, protected resource, authenticated tools/list, Device Bridge discovery, original Continuum readback.
7. Repair: correct failures without bypassing Veritas, token checks or consent.
8. Retest: replay negative paths, restart recovery, and physical device disconnect/reconnect.
9. Verify: independent Formula/Veritas gates, real receipts, Learning Ledger and rollback.
10. Evidence: exact commits, Railway deployment IDs, URLs, configuration fingerprint without secrets, record hashes, independent receipt IDs and recovery evidence.

Reference: https://docs.railway.com/networking/public-networking ; https://docs.railway.com/volumes ; https://docs.railway.com/infrastructure-as-code/reference
