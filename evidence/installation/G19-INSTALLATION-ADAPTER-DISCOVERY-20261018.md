# G19 Installation Adapter discovery and dry-run contract — 2026-10-18

## Discovery

- The existing Android `PackageInstallBroker` downloads an HTTPS APK, checks its SHA-256, then opens Android’s authorized package installer. It does not claim silent installation.
- The existing Apple direct-delivery document records a Windows USB iLoader route. SideStore account sign-in remains a distinct phone-side dependency.
- `operator/adapter-registry.json` supplies the existing cross-platform platform-adapter identity and capability boundary. The installation adapter consumes that registry; it does not create another authority registry.

## Implemented increment

Added `operator/installation-adapter.mjs` and a deterministic fixture test. The module accepts only caller-supplied observations and produces one of these non-mutating results: unsupported target, missing package integrity, transport failure, missing provider, Apple preflight finding, owner approval required, or dry-run ready.

## Safety boundary

No physical device, Apple account, certificate, profile, pairing record, package, installer, or operating-system setting was read or changed by this increment. `executeInstallation`, verification, and rollback are explicit stubs to prevent the dry-run planner from being mistaken for an installer.

## Acceptance performed

The fixture test proves deterministic classification for iOS/iLoader, Android package installer, Windows, macOS, Linux, profile mismatch, unknown target, and non-executing lifecycle methods. It does not prove an installation on a physical device.
