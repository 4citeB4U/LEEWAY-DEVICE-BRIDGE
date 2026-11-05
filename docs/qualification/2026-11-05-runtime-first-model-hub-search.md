# Runtime-first LeeWay Model Hub search

**Date:** 2026-11-05, America/Chicago  
**Owner lane:** K1 integration and final evidence review  
**Repositories:** `4citeB4U/LEEWAY-DEVICE-BRIDGE` and `4citeB4U/Leeway-Runtime-Fabric`  
**Device Bridge base:** `fa7983b80dc0639f27e0cfde970fb491e1d78434`  
**Runtime Fabric base:** `4c02dc9d27ae12295db96453a59254b3d861ef10`  
**Model Hub source inspected:** `4citeB4U/LeeWay-Model-Hub`, `c6d367155f01f769c44256e13b5f7913b5cc1214`

## Acceptance target

When Runtime searches for a model, it must query the LeeWay Model Hub through the authenticated Device Bridge route. This read-only lookup may report catalog identities. It must not claim that weights are admitted to Continuum, resident in GPU memory, or qualified for inference. Model execution remains subject to the LeeWay GPU, Formula, Continuum, Veritas, and receipt authorities.

## Expected and observed state

Fresh read-only observations on 2026-11-05:

- Model Hub `/health`: HTTP 200, `LEEWAY_MODEL_HUB`, `RUNNING`, no selected model, backend `OLLAMA`.
- Model Hub `/v1/status`: LeeWay GPU `bound=false`, `gpuInferenceQualified=false`.
- Model Hub `/v1/catalog`: five catalog entries.
- Model Hub `/v1/models`: all five entries `UNKNOWN_UPSTREAM_ERROR`.
- Runtime → Device Bridge capability discovery for `pc-primary`: `model.hub.catalog` absent.
- Active shell environment: `LEEWAY_MODEL_HUB_URL` unbound.

The live observations establish a running Hub and an absent Bridge capability. They do not establish weight storage, residency, inference, or production qualification.

## Diagnosis and accepted design

Runtime lacked a Model Hub search tool. Device Bridge's desktop adapter had no Hub catalog binding. The existing Hub exposes `/v1/catalog` separately from `/v1/models`; the catalog read does not need the Ollama inventory path.

The implementation adds a bounded `model.hub.catalog` capability to Device Bridge, configured by `LEEWAY_MODEL_HUB_URL`. The adapter requires an HTTP loopback URL, requests only `/v1/catalog`, bounds and validates the response, filters on an optional query, and returns an allowlisted set of identity fields. It drops external repository/provider fields. The response explicitly separates catalog membership from asset, residency, and inference state.

Runtime adds `bridge_model_hub_catalog`, owner-scoped through its existing authenticated Device Bridge MCP proxy. It checks that the upstream tool is registered, verifies device/capability receipt fields, validates the query and response contract, and returns only allowlisted fields. It does not access host localhost directly.

**Rejected:** direct Runtime-to-localhost access; consumer-side external model search; treating catalog entries or local staging files as admitted assets; Ollama as LeeWay inference; inference or GPU claims from catalog presence.

## Safety, scope, and rollback

- The new operation is read-only and follows the existing Bridge grant, admission, and receipt path.
- No model weights were read, moved, imported, downloaded, or executed.
- No production process, environment, device, credential, or service was changed.
- Continuum and LeeWay GPU were not newly bound or qualified.
- Rollback removes the `model.hub.catalog` schema/adapter/MCP exposure and the matching Runtime proxy/tool. Existing source and other worktree changes remain untouched.

## Engineering loop

| Stage | Status | Evidence |
|---|---|---|
| Investigate | EVIDENCED | Inspected canonical Model Hub source, Runtime MCP proxy, Device Bridge protocol/adapter and contributor rules; queried live Hub health/status/catalog/inventory and live `pc-primary` capabilities. |
| Diagnose | EVIDENCED | Hub runs, but GPU is unbound and Runtime-facing Bridge lacks the Hub catalog capability. |
| Plan | EVIDENCED | Add a narrow read-only query route through Device Bridge and Runtime. |
| Implement | SOURCE COMPLETE | Local candidate changes in both repositories; no production change. |
| Test | PASS, SOURCE ONLY | Device Bridge focused suite 14/14; Runtime focused source suite 2/2 in isolated worktrees. Existing combined Runtime discovery suite 16/16 and Device Bridge related suite 14/14 also passed in the continuing worktrees. |
| Validate | PASS, SOURCE ONLY | Loopback restriction, bounded response, metadata allowlist, query matching, owner scope, device-bound receipt, and state separation covered by source fixtures. Syntax checks and focused `git diff --check` passed. |
| Repair | EVIDENCED | First Runtime fixture run exposed an incorrect query argument mapping; corrected it before the passing rerun. Isolated Device Bridge test run first lacked installed dependencies; `npm ci --ignore-scripts --no-audit --no-fund` installed the locked dependencies, then focused tests passed. |
| Retest | PASS | Re-ran both focused source suites after the fixes. |
| Verify | BLOCKED AT LIVE INTEGRATION | The active `pc-primary` Bridge still does not advertise the capability. No production deployment or service control path was available in the fresh read-only connector. |
| Evidence | LOCAL SOURCE RECORD | Test output and live observations are documented here. This record is not a Veritas decision or canonical execution receipt. |

## Veritas, receipts, and promotion gates

Formula task evaluation: **NOT RUN**. Independent Veritas: **NOT RUN**. Canonical receipt: **NOT CREATED**. Learning Ledger: **NOT UPDATED**. In-memory test receipt sinks are synthetic test fixtures only.

Before runtime acceptance: review and release both source changes; configure the canonical Bridge host's `LEEWAY_MODEL_HUB_URL` to its verified local Hub loopback binding; confirm `bridge_capabilities` lists the capability and execute a real owner-scoped Runtime lookup for `pc-primary`. Separately replace the Hub's current OLLAMA default/fallback with qualified LeeWay GPU execution and establish Continuum-backed model asset admission/residency. Until then, full live Model Hub lookup and inference remain **UNQUALIFIED**.

**Current disposition:** source implementation and focused tests pass; production route is not deployed; live Model Hub-to-Device Bridge lookup is not available yet.

