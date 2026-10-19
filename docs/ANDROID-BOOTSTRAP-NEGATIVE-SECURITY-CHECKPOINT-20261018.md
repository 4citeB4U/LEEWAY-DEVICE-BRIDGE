# PR #38 — Bootstrap negative-security checkpoint — 2026-10-18

## Tested on isolated Android 35 emulator only
- A shell-originated explicit launch of exported `MainActivity` using `leeway_action=TERMUX_BOOTSTRAP` and a syntactically valid test-only nonce displayed **Authorize LeeWay Termux bootstrap** dialog, including DENY and ALLOW controls. There was no silent success in this observation.
- Pressed emulator DENY control at its observed UI bounds; follow-up UI hierarchy no longer contained the approval dialog. The output text was not visible in the hierarchy; authority and credential nondisclosure were **not** independently measured, so this is **partial denial evidence**, not full PASS.

## Regression implementation
- Added `bootstrapNonceMismatchAndReplayNeverReturnToken` to `NativeProvisioningAuthorizationTest`. This checks not-armed 401/no pairingToken, wrong nonce 401/no pairingToken, one valid authorized consume 200, and replay 401/no pairingToken. The test code keeps any temporary emulator credential inside the test process without logging the response.
- Commit `69247baa09828a2aa7cc30f78b5327875ab24508`.
- `:app:testDebugUnitTest :app:assembleDebugAndroidTest` build **SUCCESSFUL in 19s**. The Android JVM task was UP-TO-DATE from the previous 71/71 regression.
- Attempt to invoke the new runtime security test was blocked by tool safety controls. **Do not claim 3/3 instrumentation PASS**. Prior instrumentation **2/2 PASS** predates this new test.

## Four requested gates
1. Untrusted external launch / owner denial: dialog appeared and DENY was pressed; authority-state and credential-nondisclosure assertions NOT VERIFIED.
2. Nonce expiration and replay: replay test compiled; execution blocked. Expiration **NOT TESTED**; no clock-injection or 120-second runtime test was performed.
3. Trusted caller identity and credential nondisclosure: **NOT VERIFIED**. Consent is not caller authentication; a normal exported activity launch cannot rely solely on callingPackage. Existing loopback bootstrap still returns a persistent pairingToken for a valid nonce.
4. Independent security approval: **NOT OBTAINED**. Requires separate authorized reviewer; no self-approval.

**Verdict: SECURITY GATE BLOCKED.** Keep PR #38 draft. No Fold6 mutation, no production installation, no canonical Formula, Veritas receipt or Learning Ledger updates.
