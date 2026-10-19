# K2 — Apple receipt to canonical Runtime Fabric adapter contract: exact gap mapping

**Engineering classification:** PARTIALLY BUILT / MISSING GLUE. This is a source-backed integration contract gap, not an authorized provider declaration. No new verifier, signer, trust root, or Learning Ledger authority is established by this document.

## Canonical contract discovered

Runtime authority: `4citeB4U/Leeway-Runtime-Fabric/contracts/universal-adapter-contract.v1.json`
- ID `LEEWAY_UNIVERSAL_ADAPTER_CONTRACT_V1`, authority `LeeWay Standards`, runtime owner `4citeB4U/Leeway-Runtime-Fabric`.
- Adapter class `evidence-veritas` is already listed.
- Required sections: `identity` (`id/version/domain/adapterClass`), `capability` (`contracts/operations`), `binding` (`provider/runtimeTarget/bindingMode`), `portability` (`contractPortable/adapterImplemented/platformTested`), `governance` (`authorizationClass/permissions`), `evidence` (`measurementSchema/veritasRequirements`), `lifecycle` (`health/cancel/failure/rollbackOrFallback`).
- Explicit invariants: adapter translates but does not become authority; availability is not authorization; execution is not verification; domain adapters do not invent Formula state.

## Existing evidence and missing provider capabilities

| Contract piece | Existing source evidence | Status |
| --- | --- | --- |
| Local receipt input | `evidence/apple/artifacts/iphone11-metal-receipt-20261018.json` | RECORDED |
| Reproducible integrity | `scripts/apple-acceptance-checkpoint.mjs`; `tests/apple-acceptance-checkpoint.test.mjs` | VERIFIED LOCAL ONLY |
| Governed handoff preflight | `scripts/apple-receipt-handoff-gate.mjs` | BLOCKED intentionally |
| Receipt measurement and hash | Native Apple receipt schema and the exported 256/0 Metal result | RECORDED |
| Canonical adapter class | Runtime Fabric universal contract has `evidence-veritas` | FOUND |
| Actual adapter identity/version/domain | No Apple-specific registered adapter ID proven | NOT_ESTABLISHED |
| Provider registry binding and authentication | No trusted Veritas issuer, pinned identity or live interface proven | NOT_ESTABLISHED |
| Provider operations and request/response | No validated `verify Apple local receipt` operation bound | NOT_ESTABLISHED |
| Authorization, permissions, cancellation, rollback | Must be declared by canonical provider owner, not by Device Bridge | NOT_ESTABLISHED |
| Independent pre/post gate and decision receipt | `LeeWay-Agent-Skills/skills/leeway-veritas/SKILL.md` defines policy, not a verified execution endpoint | NOT_ESTABLISHED |
| Learning Ledger provider | No qualified admission contract/response located | NOT_ESTABLISHED |

## Smallest legitimate next action

**K1 / canonical Runtime Fabric owner:** register or identify an *existing* `evidence-veritas` capability provider complying with `LEEWAY_UNIVERSAL_ADAPTER_CONTRACT_V1`; provide immutable source path, provider ID, trust-root provenance, operations/response schema and test evidence. Identify existing Learning Ledger binding independently. K2 can then implement a **thin translation adapter**, never a second authority.

**Acceptance required before changing the handoff blocker:** two independently registered and authenticated providers (Veritas and Learning Ledger), a replay-resistant receipt identity/hash match, actual pre/post-gate decision, explicit blocked/failure negative cases, and K1 independent review. Synthetic provider objects or local hash replay must not set `READY`.

**Do not** push the existing receipt to `ledger/append.mjs` or `agent-api/server.mjs`: those are not proven Veritas/Apple admission interfaces. No Apple device, signing, or certificate mutation in this work.
