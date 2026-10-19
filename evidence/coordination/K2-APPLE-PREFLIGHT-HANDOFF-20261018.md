# K2 Apple preflight — review handoff (2026-10-18)

**Authority:** Issue #37 and CONTRIBUTORS.md. K2-only review branch. K1 owns integration, shared documents, and final gate acknowledgments.

**Files:** operator/k2-apple-preflight.mjs and tests/k2-apple-preflight.test.mjs. This validator accepts nine typed non-secret observations and one exact target, bundle, version, build and IPA digest; stale, missing, duplicate, contradicted, wrong-source or wrong-release observations block. Even nine PASS assertions return EVIDENCE_SHAPE_QUALIFIED_ONLY with ready=false and installationAuthorized=false.

**Evidence:** Isolated original candidate passed 16 assertions and node syntax check in this session, SHA-256 cccac9d3d04c828bf77826f53aa9c9d3fed1bf15288a5c87dfaac98aa5f35d0d. Repository test import path differs from original standalone test so run the published test separately after checkout: node --check operator/k2-apple-preflight.mjs && node tests/k2-apple-preflight.test.mjs. GitHub branch source needs independent K1 execution; publishing is not execution.

**Known limits:** Field source labels, timestamps, target tokens and PASS claims are untrusted unless an independently verified non-secret provider supplies authenticated provenance. No Apple authorization, pairing, provisioning, certificate, or iPhone installation was observed. Current main observer wrongly uses generic Apple USB markers for transport and HEALTHY for local iLoader state. Do not promote to planner's provider.authorized/HEALTHY.

**Request to K1:** Independently verify source content and fixture tests; review schema and exact-target/release conditions; identify supported Apple provider evidence and provenance without reading credentials or pairing records; preserve executeInstallation/verifyInstallation/rollbackInstallation non-executing. Do not merge until review.

**Receipt:** RECEIPT NOT CREATED; LEARNING LEDGER NOT UPDATED.
