# C3 Independent Consent Issuer Review — 2026-10-14

## WHO / WHAT / WHERE / WHY / HOW
WHO: Agent Lee independent reviewer. WHAT: Review claim that canonical owner authority already issues request-bound general device-command consent. WHERE: Runtime Fabric and Device Bridge local workspaces. WHY: Avoid promoting authority-framework source into active device consent without proof. HOW: read-only inspection of host-read authority construction, creator authority framework, work-order callers, and MCP admission entrypoint.

## Source evidence
- automation-runtime/governed-host-read-handler.mjs authority(bindingState, subject) constructs allowed:true, revoked:false, scope:'OWNER_LOCAL_HOST_READ', hashes and TTL. This is scoped host-read authority; not generic device consent.
- standards/src/core/security/creator.authority.ts defines CreatorAuthority and authentication contexts; its source explicitly says real keys must be external and signature verification is a framework check. Live key enrollment, authenticated owner session, and integration with Device Bridge were not proven.
- machine-consciousness/capability-work-order-router.mjs executeWorkOrder has approved=false default. Inspected production call sites omit approved; medium/high risk paths return HOLD_APPROVAL when unapproved. The boolean itself is not a verified cryptographic grant.
- machine-consciousness/carrier-server.mjs establishes request context and internally sets committed/authorized flags. Those do not independently prove user authentication or device-specific owner consent.
- Device Bridge apps/desktop/mcp-server.mjs still configures admission: async () => true. Its configured grants and availability checks are additional restrictions but not canonical Formula/Veritas admission.
- No authenticated, request/device/capability/args-bound approval issuance and consumption path was demonstrated by these call sites.

## Verdict
Existing issuer/identity structures OBSERVED; general purpose device-command consent provider NOT VERIFIED. Runtime Fabric as issuer is a PROPOSED boundary pending proof of canonical identity keys/session provenance and a real authenticated approval transaction. Do not label hash-only records as signed.

## Acceptance next
Identify actual live owner-key verifier and owner consent UI/transport; bind issuer identity, request ID, device passport, capability, argument hash, expiry, nonce, revocation and single-use claims. Test forged/wrong-target/replayed and valid approval through production entrypoint and canonical Formula/Veritas. No mutation to working Android code, phone, or credentials during review.

RECEIPT NOT CREATED; LEARNING LEDGER NOT UPDATED.
