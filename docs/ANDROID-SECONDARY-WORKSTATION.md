# Android Secondary Workstation

Turn a supported Android phone into a governed, Internet-reachable secondary development workstation for an authorized online LLM/agent.

## What this provides

After qualification, the phone can provide an independent execution node with:
- Termux shell execution
- Node.js/npm
- Git
- curl
- ripgrep-backed file/content search
- OpenSSH tools
- Desktop Commander Remote MCP
- persistent remote identity
- boot-time reconnect supervision
- direct file read/write inside the Termux-accessible workspace
- direct Git/GitHub network operations

The Windows PC and USB cable are setup conveniences only. They are not required in the accepted runtime path.

## What this does not provide

This does not make Android root-equivalent and does not bypass Android security.

Desktop Commander running in Termux is bounded by the Termux app UID and Android permissions. It does not automatically gain:
- root
- protected system-service access
- another app's private storage
- passwords, MFA codes or account secrets
- arbitrary screen/UI control
- privileged camera, notification, Bluetooth or hardware control

Those capabilities require separate authorized Android providers such as LeeWay Device Bridge and their own permission/verification gates.

## Reference implementation

Qualified reference:
- Android 16
- arm64
- Termux
- Node.js 26.3.1
- Desktop Commander 0.2.52
- Git 2.54.0
- ripgrep 15.1.0

Other Android versions and vendor builds are candidates until they pass the same acceptance campaign.

## Install

From Termux:

```bash
curl -fsSL https://raw.githubusercontent.com/4citeB4U/LEEWAY-DEVICE-BRIDGE/main/clients/phone-workstation/bootstrap-desktop-commander.sh -o ~/bootstrap-desktop-commander.sh
bash ~/bootstrap-desktop-commander.sh
```

Then run:

```bash
desktop-commander remote
```

Complete the provider's owner-controlled authentication flow. Never paste passwords, MFA codes, access tokens or refresh tokens into chat.

The bootstrap installs the boot supervisor at:

```text
~/.termux/boot/01-desktop-commander-remote
```

Boot behavior varies by Termux distribution. Do not claim cold-boot persistence until a real power-cycle qualification passes.

## Required acceptance campaign

A workstation reaches VERIFIED only after all applicable checks pass:

1. **Direct registration** — the phone appears as its own remote device.
2. **Direct ping** — the agent can ping the phone node without routing through a PC.
3. **Shell execution** — a fresh command executes on Android/arm64.
4. **Filesystem** — remote read and write both pass in authorized phone storage.
5. **Search** — remote content search passes.
6. **Git toolchain** — Git is executable locally.
7. **GitHub reachability** — the phone can reach a repository independently.
8. **Local Git mutation** — init/add/commit succeeds locally.
9. **USB independence** — the USB cable is physically removed and execution still passes.
10. **PC independence** — the primary workstation remote node is unavailable and phone execution still passes.
11. **Session recovery** — deliberately terminate the remote session; phone-local supervision restores it.
12. **Cold boot** — power the phone off and on without opening Termux manually; remote registration and fresh execution return automatically.
13. **Receipt** — preserve observable results, versions and unresolved limitations.

## LeeWay proof law

```text
installed != running
running != remotely reachable
remotely reachable != executable
executable != PC-independent
PC-independent != cold-boot persistent
first success != completion
```

## Device Manager connection

Register the remote workstation as a provider-bound node, not as unrestricted phone authority.

Recommended logical capabilities:
- `workstation.remote.ping`
- `workstation.shell.execute`
- `workstation.files.read`
- `workstation.files.write`
- `workstation.search`
- `workstation.git.local`
- `workstation.github.network`
- `workstation.session.recover`
- `workstation.boot.reconnect`

Security boundary:

```text
TERMUX_APP_UID_NON_ROOT
```

Higher-privilege phone capabilities must be routed through a separately authorized provider such as LeeWay Device Bridge.

## Portability rule

The technique is reusable; the proof is not transferable. Every new phone must earn its own receipt through the acceptance campaign.
