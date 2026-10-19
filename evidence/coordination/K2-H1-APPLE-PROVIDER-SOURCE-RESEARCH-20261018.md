# K2-H1 provider feasibility research — 2026-10-18

## Scope and provenance
Read-only investigation of supported non-secret Apple evidence sources. This is research, not a live host probe or a credential/certificate inventory. K2 owns this report; K1 owns any canonical planner integration.

## Candidate providers
1. **Exact connected device and pairing**: libimobiledevice `idevice_id` for connected device discovery and `ideviceinfo -s -u <selected-UDID> -k <allowlisted-key>` to avoid automatic pairing and narrow the read. `idevicepair -u <selected-UDID> validate` is a narrowly scoped pairing validation, *not* `pair` or `unpair`. Do not log the raw UDID: compute a host-local keyed alias and retain the real identifier only in the runtime's protected memory. A generic Windows PnP VID_05AC indicator is never exact-target proof. Source: https://github.com/libimobiledevice/libimobiledevice/blob/master/docs/ideviceinfo.1 and https://github.com/libimobiledevice/libimobiledevice/blob/master/docs/idevicepair.1 .
2. **Provisioning profile**: Apple's TN3125 explains that profiles bind authorized signing identities, app IDs, allowed devices, expiration and entitlements. An iOS build generally embeds `embedded.mobileprovision` (except App Store distribution). On an authorized macOS inspection host, `security cms -D -i <profile>` can decode profile metadata; handle device IDs, certificate material and team IDs as private data and emit only typed comparisons/expiry result. Apple's technical note cautions that decoded XML is not necessarily modern system's source of truth; avoid claiming profile compatibility from parsed fields alone. Source: https://developer.apple.com/documentation/technotes/tn3125-inside-code-signing-provisioning-profiles .
3. **App entitlements and code signature**: inspect the intended signed artifact using supported Apple tooling and validate against profile allowlist, not against a requester's self-declared flags. An *unsigned* IPA cannot prove a current signing identity/session or signed installability. Source: https://developer.apple.com/documentation/bundleresources/entitlements and TN3125.
4. **iLoader provider session/Apple account authorization**: no verified supported, read-only iLoader API or authoritative session endpoint has yet been identified. Process visibility, selected-server preference and saved account marker are NOT proof of current account authorization or Anisette provider viability. Do not introspect encrypted credential vaults, private iLoader app-state internals, request retries, or modify stored login. State NOT_OBSERVED until an officially or project-supported diagnostic provides non-secret validity proof.

## Required trust boundary
Capture trusted observations directly from a qualified existing host/device adapter with origin, timestamp, exact target binding, package digest, and explicit allowlisted result. The nine-field K2 validator remains *shape-only*. Neither sourceType labels nor redacted target tokens supplied in caller JSON constitute attestation. Any transformation to canonical planner provider readiness must be K1-owned, checked against real trusted source origin, and remain non-executing pending approval.

## Proposed read-only sequence (no host execution performed here)
A. Inventory installed command path, version, provenance for idevice_id/ideviceinfo/idevicepair. Do not download/install utilities for discovery.
B. Confirm exactly one owner-selected physical target; use targeted query; never fall back to first device or generic USB Apple.
C. On already trusted pairing, optionally validate pairing without pairing/unpairing; report NOT_OBSERVED when utility unavailable or user consent required.
D. Identify whether intended IPA is still unsigned, inspect package hash and embedded signing/profile evidence only if available via supported authorized inspection.
E. Determine whether a supported iLoader non-secret account/provider-status interface exists; if not, stop at NOT_OBSERVED.
F. Export privacy-reduced typed findings; K1 reviews before any integration.

## Explicit non-claims
No live iPhone was queried. No certificate validity was established. No exact-device identity or current Apple login is proven. No executable install gate is passed. No Veritas runtime receipt created; Learning Ledger not updated.
