# Apple PWA workstation route

## Real development workplane

The installed LeeWay Safari PWA is the Apple front door for device-aware Diagnostics and browser-safe work. Its **Open Apple Cloud Workstation** button opens the canonical `4citeB4U/LEEWAY-DEVICE-BRIDGE` repository in GitHub Codespaces.

Codespaces is the actual Apple-accessible development workstation. The repository’s `.devcontainer/devcontainer.json` provisions:

- VS Code in the browser
- Linux terminal
- Node 22
- Git and GitHub CLI
- Docker in Docker
- PowerShell and ESLint extensions

The Android launcher uses the same repository and devcontainer. This creates one shared source workplane instead of a separate Apple-only project. Agent Lee works against the canonical repository through its authorized workstation checkout; commits and pulls synchronize the work between the cloud workstation and Agent Lee’s worktree.

## Use from iPhone

1. Open the LeeWay PWA from the iPhone Home Screen.
2. Tap **Open Apple Cloud Workstation**.
3. Sign in to GitHub in Safari if GitHub asks.
4. Create or resume the Codespace for `4citeB4U/LEEWAY-DEVICE-BRIDGE`.
5. Use the browser editor and terminal for development, then commit and push work to the repository.

The Codespace creation screen is a GitHub service. It may show account-specific machine, quota, or billing choices. The PWA does not store GitHub credentials or create a Codespace silently.

## Apple boundary

| Capability | Route |
| --- | --- |
| Daily LeeWay entry and browser diagnostics | Installed Safari PWA |
| Browser WebGPU probe and readback | Installed Safari PWA when Safari exposes WebGPU |
| Editor, terminal, Git, Node, GitHub CLI, Docker | GitHub Codespaces through the Apple launcher |
| Shared Agent Lee source workplane | Canonical Device Bridge repository and Git history |
| Direct native Apple Metal | Separately qualified native iOS adapter |
| Canonical Formula, Veritas, and receipts | Only when an authorized runtime actually executes and returns evidence |

The static PWA does not contain a shell or fabricate remote-runtime authority. Browser WebGPU evidence is separate from direct Metal and model execution.
