# G19 — Codespaces shared workstation attachment

**Date:** 2026-10-18  
**Repository:** `4citeB4U/LEEWAY-DEVICE-BRIDGE`  
**Codespace:** `supreme-umbrella-pjj9jvv6qxr5fv7q`  
**Scope:** authenticated developer-workstation connection; no native iOS claim

## Observed evidence

- GitHub authentication on the controlling workstation completed with the `codespace` scope.
- The existing Codespace is `Available`, uses `.devcontainer/devcontainer.json`, is on `main`, and reports no uncommitted or unpushed Git changes.
- GitHub reports browser workspace URL `https://supreme-umbrella-pjj9jvv6qxr5fv7q.github.dev`.
- The first authorized `gh codespace ssh` attempt did not enter the container because its existing devcontainer image lacks an SSH server.

## Repair

The canonical devcontainer now declares `ghcr.io/devcontainers/features/sshd:1`. After this change reaches the Codespace and the container rebuilds, the authorized workstation can use `gh codespace ssh` to inspect and work in the same environment that the iPhone opens through the LeeWay PWA.

## Acceptance gate

The attachment is qualified only after:

1. GitHub completes the Codespace rebuild using the revised devcontainer.
2. `gh codespace ssh -c supreme-umbrella-pjj9jvv6qxr5fv7q` succeeds.
3. The terminal confirms the canonical repository, branch, and clean or explicitly reported working state.

This evidence does not claim native iOS execution, direct Metal access, Formula evaluation, Veritas approval, or a receipt.
