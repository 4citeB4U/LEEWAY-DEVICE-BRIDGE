<!--
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.EXTENSION.HANDOFF
TAG: LEEWAY.EXTENSION.V2.HANDOFF
5WH:
WHAT = Document the installable-source extension candidate and repeatable local test/build commands.
WHY = Preserve the Codex mission and explicit source-versus-device execution boundaries.
WHO = Governed outside support contributor under LeeWay Creator authority.
WHERE = README.md in the Extension Manifesto V2 deliverable.
WHEN = 2026-11-16.
HOW = Reproducible Node tests/build and separate browser-native qualification.
LICENSE = Not asserted; original repository terms apply.
-->
# LeeWay Extension Manifesto V2 source candidate

`node --test tests/extension.test.mjs` validates messaging and permission boundaries.

`node scripts/build-extension.mjs` packages three browser-specific unsigned ZIPs and one standalone selection-only userscript in `dist/`, together with `SHA256SUMS.json`.

Import the `apps/extension` and `scripts` and `tests` files into the canonical Device Bridge repository through a reviewed branch; do not overwrite the existing universal-relay/Rust Core worktree. The ZIP artifacts are source packages, not live Native Messaging, store-published/browser-installed or production-admitted extensions. See `docs/integrations/EXTENSION-MANIFESTO-V2.md` for exact remaining dependencies and boundaries.
