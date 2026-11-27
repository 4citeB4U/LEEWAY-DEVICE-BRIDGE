# Existing relay adapter

`RelayAdapter` is a transport client for an explicitly owner-bound WSS deployment. It has no built-in service address. It authenticates with `{type:"hello",role:"client",deviceId,token}`; only after `hello-ack` does it send `{type:"command",id,capability,arguments}`. It requires a matching command ID and capability, a successful outer result, and no nested explicit failure. Credentials never appear in returned errors or receipts. Connections have finite timeouts, bounded incoming payloads, no redirect following, and require TLS except an explicit loopback-only test option.

The public Device Bridge manifest currently has no remote deployment bound. Keep relay devices out of client configuration until an authorized LeeWay service, capability admission and canonical receipt path have been qualified.

Discovery sends `device.capabilities` to the existing Android router and consumes its `remoteQualified` list. A new connection is established per query/command; there is no cached permission claim. This package neither changes nor deploys the relay, adds an operator bypass, or assumes a device is online because a token exists. See the protocol README for owner grants and actual test boundaries.

Compatibility: `remoteQualified` may be a JSON array or the legacy Android `JSONObject.put(List)` string such as `[device.health, model.status]`. The compatibility parser accepts only a bounded bracket-delimited list of simple capability names (at most 256 entries, 128 characters per name, 16 KiB string), rejects malformed lists, and intersects the declared names with the protocol schema registry. It does not infer capability availability from a passport, execute string content, or turn unknown capabilities into granted operations.

<!-- LEEWAY UNIVERSAL FORMULA GOVERNANCE BEGIN -->

# LeeWay Universal Formula Governance

Authority: Creator and LeeWay Standards.
Formula identity: LEEWAY-FORMULA-v1.0.

The canonical LeeWay Formula is mandatory throughout
the entire LeeWay ecosystem.

Every current and future application, capability,
agent, worker, employee, model, provider, adapter,
automation and integration inherits this requirement.

All applicable interactions, responses, decisions,
actions, revisions, executions, computations, model
inferences, resource allocations, information transfers,
memory operations, storage operations and deployments
must consume the canonical Formula through their
authorized and qualified domain contracts.

Formula availability, documentation, configuration,
health and historical results do not constitute actual
Formula consumption for a new operation.

Recover relevant authorized memory before substantive
work. Preserve identity, provenance, Formula integrity,
authorization, original receipts and verified learning.

Never invent observations, adapter mappings, mathematical
results, execution evidence or independent verification.

No application may bypass applicable Formula governance
by dispatching directly to a provider.

Every new application and capability must demonstrate
applicable Formula consumption before production admission.

Preserve the existing authority hierarchy:

Creator > Standards > Root of Trust > Runtime Fabric >
Agent Lee > Harness > Formula > skills/models/tools >
execution > Veritas > Receipt Authority > Learning Ledger.

Execute the complete engineering loop:

INVESTIGATE > DIAGNOSE > PLAN > IMPLEMENT > TEST >
VALIDATE > REPAIR > RETEST > VERIFY > EVIDENCE >
CHECKPOINT > CONTINUE.

Documentation compliance does not establish executable
enforcement or production admission.

<!-- LEEWAY UNIVERSAL FORMULA GOVERNANCE END -->
