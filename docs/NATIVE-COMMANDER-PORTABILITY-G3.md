# G3 — Native Commander portability qualification

## Canonical owner and scope

The deployed provider is `LEEWAY_NATIVE_HOST_COMMANDER`, owned by `4citeB4U/LEEWAY-DEVICE-BRIDGE`. Its active PC loader verifies the native server and command-policy SHA-256 values before import. The Runtime Fabric `standards/adapters/mcp/desktop-commander-agent-mcp` refactor is a separate historical adapter candidate, not the deployed native executor. It was not substituted for the live provider.

This branch repairs the exact native implementation identified by that binding. The original bound server and policy were uncommitted in their owner worktree; the lineage receipt records that fact rather than presenting them as committed source. Neither the live files nor the pinned startup binding were changed. No new provider identity, public listener, remote grant authority, or service registry was introduced.

Baseline source identity:

- Server: `aacd3fee1626a25ec2a7adeba38b4797b8297428933f6096e07a8ffc53f53d79`.
- Command policy: `091b09323077f09b3168f2d9401d632542313ce0b8be04d218c5fa69fb0c6649` (retained unchanged).

## Changes implemented

The native service now starts with no filesystem root or body identifier. Host information uses portable Node host APIs instead of requiring a particular drive or Windows inventory command. Storage remains a separately bound capability: absent storage binding blocks file and terminal operations, not startup or host information.

The public file request can name a logical scope and resource, for example `scope=workspace` and `resource=proof.txt`. The target runtime resolves those identifiers to its authorized storage. The same request was executed against two different temporary roots without editing source. Existing explicit in-scope path requests remain compatible; a named but unknown scope never falls back to a physical path.

Hard-coded application installation paths were removed. App identities resolve only through host-supplied application bindings. Startup does not require an application binding. Spawn acknowledgement is explicitly not GUI verification.

The repair also adds bounded native output/timeouts, regular-file and single-link checks, bounded reads, actual child-launch error handling, native child test-context isolation, and explicit unsigned receipt status. The existing narrow command grammar remains unchanged. No arbitrary shell command profile was added.

Windows-specific process/service/display handlers are separated and marked platform-specific. On an unqualified platform those capabilities return a blocked result; their presence is not represented as cross-platform execution proof. A healthy listener is not evidence that every listed capability has been tested.

## Executed qualification

On the authorized Windows workstation, two complete runs passed 30/30 Node test cases each with no failures, cancellations, skips or TODOs. Source-before and source-after hashes matched.

The cases exercised real loopback servers, root-free startup, root-free host information, logical resource relocation, different runtime body identifiers, independent file hashing, legacy path compatibility, out-of-scope and malformed selectors, hard-link denial, origin/Host-header rejection, content-type/body-size limits, narrow terminal policy, a real scoped child execution with file read-back, and host-bound app launch. Temporary processes were closed by the tests.

The local test's original assumption that a nested Node test invocation would always emit a standalone reporter summary failed. It was replaced by direct execution/read-back evidence. The native subprocess also stops inheriting Node's parent test-runner channel. The failed logs remain in the isolated working evidence; they were not relabeled PASS.

Windows gate receipt retained on the host: `receipts/native-commander/portability-2f84517c6ac3402a9755df6384706257/receipt.json`.
Its original byte hash is `a10c5823757e7433c4c10904fa2c8811b3e3840ecd26564664371393ac649865`.
Published summary: `receipts/native-commander/g3-portability-windows.json`.

## Claim boundaries

**VERIFIED:** native implementation executed locally; 30/30 cases per Windows round; no fixed storage path/device identifier required for startup; logical resource relocation; unchanged tested source bytes.

**NOT CLAIMED:** every OS-specific capability works on every platform, an authenticated public remote endpoint exists, arbitrary external applications were qualified, the live service was replaced, the full C3 chain was requalified, or Formula/learning admission occurred.

The current chat still reaches the PC using an authorized Remote Desktop Commander bootstrap before calling the native loopback service. That proves native host execution, not an independent ChatGPT-to-host network route during an external connector outage. The existing Device Bridge pairing/transport work must supply that independently qualified connection; another executor should not be created for it.

Receipts provide SHA-256 content integrity only, not authenticated signing. Formula: `NOT_EXECUTED`. Learning Ledger: `NOT_UPDATED`. Live deployment: `NOT_PERFORMED`.

## Next gate

Reconcile/admit the native-owner branch and its transport binding, then qualify creative applications through the existing application fabric. Keep path resolution behind the target's authorized resource bindings. Do not hard-code a drive, account home, computer name, or device identifier into application/provider contracts.
