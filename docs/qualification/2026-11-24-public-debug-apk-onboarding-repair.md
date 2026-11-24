<!--
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.PUBLIC.ONBOARDING_REPAIR.EVIDENCE
TAG: LEEWAY.BRIDGE.PUBLIC_DEBUG_APK_RELEASE_HOLD_20261124
5WH:
WHAT = Preserve evidence-backed source fix for the wrong Android debug-APK customer homepage.
WHY = Creator reported an Android browser download warning instead of real Device Bridge onboarding.
WHO = Creator authority, original Device Bridge source, outside GPT-6 support contributor (NOT Agent Lee or independent Veritas).
WHERE = docs/qualification/2026-11-24-public-debug-apk-onboarding-repair.md.
WHEN = 2026-11-24.
HOW = Trace actual GitHub Pages links, remove unsafe public metadata and add negative source tests/CI with physical release HOLD.
LICENSE = Original repository terms.
-->
# Public Device Bridge onboarding / debug APK exposure repair — source checkpoint

## Original mission and trigger

Creator-provided Android browser screenshot showed the live GitHub Pages Device Bridge page under **Workstation Downloads** with **Android Workstation → Download Extension**. Android Chromium offered `leeway-device-bridge-android-latest-debug (4).apk` at about **66.46 MB**, warning that the file *might* be harmful. The browser warning does not establish malware, but the linked file was a **debug** build and did not qualify as the requested signed, identity-bound full Device Bridge and Tablet product.

Existing live target: `https://4citeb4u.github.io/LEEWAY-DEVICE-BRIDGE/docs/`. The source authority is `4citeB4U/LEEWAY-DEVICE-BRIDGE`, not the separate browser-extension repository. Creator and customers must start with one authentic Device Bridge onboarding front door, followed by original Zitadel identity, signed native companion and actual Tablet admission; no second identity/queue/Formula/Veritas/registry.

## INVESTIGATE → DIAGNOSE

**FOR (direct evidence):**
- Original `docs/index.html` on `main` contained two direct `./downloads/leeway-device-bridge-android-latest-debug.apk` anchors and a four-column Workstation Downloads section. The underlying source had no customer account setup before that download.
- `docs/dashboard-ui.js` reconstructed the Android link from the original `docs/package-manifest.json` (old `android.downloadUrl` + SHA + size); `docs/app.js` rendered another download button from the same metadata.
- Original public manifest called the development/debug artifact `QUALIFIED_ARTIFACT_OWNER_INSTALL_REQUIRED` with SHA-256 `f07bf09c9e23fbdf95910e790eb7e9feef8d6a76a23b16fef0def5c2211b396e`, size **66,462,262 bytes**, source GitHub Actions run **45005301699**. This is historical build/hash evidence, not a signed release. Original `.github/workflows/android-build.yml` already had a fixed `if:false` public debug APK publish hold.
- Original `docs/sw.js` cached publicly viewed pages and package URLs; the old `v19` cache could preserve a stale launcher.

**AGAINST / access gaps:**
- A screenshot and SHA/size do NOT prove installed APK behavior, malicious code, phone trust, original Runtime enrollment, browser native host, or physical Tablet connection.
- GitHub Pages is static, so a download URL in source or a compiled APK does not certify OIDC, per-device passports, Formula, independent Veritas or native package signing.
- The historical debug binary may remain reachable by a manually typed or previously bookmarked URL until owner-approved file removal/deployment. Removing HTML links and metadata does not revoke raw static-object access.
- No independent Veritas review, canonical Receipt Authority append/readback, signed release acceptance or real physical Android device test was executed here.

## PLAN → IMPLEMENT → TEST → VALIDATE → REPAIR → RETEST

The new source branch is `repair/bridge-mobile-onboarding-no-debug-apk-20261124`; draft PR [#140](https://github.com/4citeB4U/LEEWAY-DEVICE-BRIDGE/pull/140).

1. Original `docs/index.html` now leads with account-first **LeeWay Device Bridge setup**: existing or invited account; full vs additional device; Android phone/foldable/tablet, Apple iPhone/iPad/macOS, Windows/Linux desktop; browser preferences; optional GitHub. Developer diagnostics remain available behind a closed disclosure, not the initial install screen.
2. `docs/onboarding.js` and `docs/onboarding.css` provide accessible mobile-first device/browser choices. Client-only device observations never mint identity or download native packages. Signed native installation and real account/session admission remain explicitly blocked.
3. `docs/package-manifest.json` and `docs/downloads/leeway-device-bridge-android-latest.json`: Android `downloadUrl:null`, `customerInstallApproved:false`, `releaseSigning:NOT_VERIFIED`, `DEBUG_ARTIFACT_NOT_APPROVED_FOR_PUBLIC_INSTALL`, state `SOURCE_ONLY`, historical original source run/hash/size retained.
4. `docs/app.js`/ `docs/dashboard-ui.js` no longer recreate unsafe download links from metadata. `docs/sw.js` cache bumped to `v20-account-first-release-hold`, with no native binary caching and network-only critical homepage/manifest. The web manifest title identifies Device Bridge setup rather than a complete workstation.
5. Original `apps/android/app/src/main/java/industries/leeway/devicebridge/GitHubUpdateChecker.kt` now requires original approved stable release metadata, signing and customer install approval, clearing stale pending debug update notifications before version-based promotion.
6. New `tests/public-device-setup-no-debug.test.mjs` and `.github/workflows/public-device-setup.yml` guard the release hold and existing `tests/device-dashboard-ui.test.mjs` and `tests/apple-pwa-source.test.mjs` retain original real browser diagnostics without the obsolete Android workstation claim.

First CI round exposed two test assumptions about legacy Workstation text plus one overbroad link-source match; those were repaired on the same branch. Re-runs demonstrate:
- **PASS:** `LeeWay Device Bridge Public Onboarding Safety`, workflow run [45392169287](https://github.com/4citeB4U/LEEWAY-DEVICE-BRIDGE/actions/runs/45392169287).
- **PASS:** `Device Console UI Acceptance`, workflow run [45392168987](https://github.com/4citeB4U/LEEWAY-DEVICE-BRIDGE/actions/runs/45392168987), including original Apple PWA source.
- **PASS:** `Android Build`, workflow run [45392169459](https://github.com/4citeB4U/LEEWAY-DEVICE-BRIDGE/actions/runs/45392169459). Android debug build/source tests passed; **public debug APK publication was SKIPPED**, not approved.

## VERIFY → EVIDENCE → CHECKPOINT → CONTINUE

**Verified as source only:** no public Android APK hyperlink in the proposed homepage, no Android customer download URL in the proposed manifest, no source JS path re-enables it, public script syntax/Node negative tests pass, original Android build passes and never publishes the debug artifact in this CI.

**NOT_EXECUTED / production HOLD:** PR merge, live Pages update, actual Android Chrome revisit after new service worker activation, deletion of the historical hosted debug APK, signed production Android release, original Runtime/Zitadel signup callback, owner device passport/registry readback, Agent Virtual Tablet session and independent Veritas/Receipt acceptance.

**Controlled next gate:** Owner review/approval for applying the source PR to the GitHub Pages `main` branch. After publication, open the actual public URL on Android; assert account-first UI appears before any packages, no debug warning is triggered, package metadata has `downloadUrl:null`, old cache is purged, and previously installed Bridge data is preserved. Separately remove the historical public debug binary through an owner-authorized Git operation once its exact Git blob identity and dependent development readers are inventoried. A future signed release must have real signer custody and physical continuity/rollback tests.

**Rollback:** No runtime deployment or device changes were made here. Do not revert the public release hold to re-expose the debug link; if an approved future signed release is defective, isolate its distribution and restore the last reviewed safe onboarding surface. Maintain branch/PR source commits as the checkpoint; no fake receipt or learning ledger promotion.

## Creator amendment — Apple interruption: stop GitHub-only customer onboarding

The Creator additionally reported that the Apple route currently does nothing but send the customer to GitHub. This was verified in original source: \`docs/index.html\` included \`OPEN APPLE WORKSTATION\` linked to GitHub Codespaces and \`OPEN APPLE PACKAGE\` linked to the unsigned developer IPA release; original \`AppleDeviceBridgeView.swift\` also foregrounded a GitHub-only update channel. This is an amendment to the same PR #140 and original mission, not a new app or identity service.

### Implemented within same source

- \`docs/index.html\`, \`docs/onboarding.js\`, \`docs/onboarding.css\`: Apple iPhone/iPad/macOS selections activate \`dbAppleSetup\` inside the ORIGINAL Device Bridge page. The **Set up LeeWay on Apple Home Screen** button shows browser-appropriate Safari Share → Add to Home Screen guidance (Mac: Safari File → Add to Dock, when available), while **Check Apple native Bridge requirements** explains the signed native companion/Runtime/Tablet admission gate. Neither public Apple action opens an unrelated GitHub workstation or unsigned IPA.
- The developer-only Apple and iLoader evidence remain under a separate collapsed diagnostics disclosure, preserving existing sources instead of replacing them.
- \`apps/apple/Sources/AppleDeviceBridgeView.swift\` now starts with **LeeWay account and Agent Virtual Tablet** and an action to open the original Device Bridge onboarding page (not github.com). The existing native camera, Metal, App Intent, Safari extension, and receipts code remain in place. Developer iLoader sources stay in an optional DisclosureGroup.
- \`apps/apple/Sources/AppleUpdateCoordinator.swift\` clears any stale unsigned update prompt, requires original manifest status \`SIGNED_CUSTOMER_RELEASE_APPROVED\`, channel \`stable\`, \`releaseSigning:VERIFIED\`, and \`customerInstallApproved:true\` before offering an IPA as an approved update. Missing proof is \`SIGNED_RELEASE_REQUIRED\`, not an Apple device installed or active.
- \`docs/package-manifest.json\` preserves the Apple unsigned development artifact build hash and GitHub release identity for audited developer use, but retracts its **customer** \`downloadUrl\`, marks Apple/iPadOS \`SOURCE_ONLY\` and \`customerInstallApproved:false\`, and explicitly states \`releaseSigning:NOT_VERIFIED\`. The historical unsigned IPA still exists for authorized owner-controlled iLoader development; no existing installed app or credential/pairing was deleted.
- Crucially, original \`.github/workflows/apple-github-iloader-channel.yml\` could previously automatically write an unsigned IPA back to the live manifest under a misleading qualified status after a successful main Apple build. This publication job is now preserved behind \`if:false\` with \`UNSIGNED_APPLE_PUBLICATION_HOLD\`; even its retained disabled manifest writer now records developer source-only and \`downloadUrl:None\`, never approved customer installation.
- Updated original Apple PWA and native update source tests, the historical unsigned publication contract test and the public onboarding negative suite. Original Android and Device Console source are not replaced.

### Verification and remaining blockers

**FOR:** [Public onboarding source CI #45393830331](https://github.com/4citeB4U/LEEWAY-DEVICE-BRIDGE/actions/runs/45393830331) and [Device Console acceptance #45393830316](https://github.com/4citeB4U/LEEWAY-DEVICE-BRIDGE/actions/runs/45393830316) passed for the previous current-head revision with Apple source. [Apple Device Bridge Qualification #45393830599](https://github.com/4citeB4U/LEEWAY-DEVICE-BRIDGE/actions/runs/45393830599) also passed source/macOS build qualification; **that does not certify iOS signing or physical installation**. [Android Build #45393830645](https://github.com/4citeB4U/LEEWAY-DEVICE-BRIDGE/actions/runs/45393830645) remained in progress at this evidence write. GitHub source hashes and workflow runs are the evidence; do not invent independent Veritas or production receipts.

**AGAINST:** the original live public Pages homepage is unmodified until controlled merge and publication. Apple Safari's Add to Home Screen requires user browser interaction and cannot be remotely triggered from a webpage; a PWA does not supply native iOS capabilities. Original Runtime/Zitadel invite-sign-in, approved Apple provisioning/distribution, native Device Bridge passport and physical iPhone/iPad/Mac readback, owner-only Tablet session, and independently verified release are not connected by these static UI changes. Do not assert the Creator's Apple phone has been reinstalled or connected.

**Next acceptance:** owner-reviewed Pages publication of PR #140, browser verification on Android and Apple to confirm no debug/unsigned install and no ordinary GitHub redirection; Home Screen operation verified without implying native bridge; separately qualify original signed native Apple installation via supported distribution, approved account/Runtime/Bridge identity and actual Tablet display. Keep production HOLD until live tests; update source evidence and original Receipt Authority only upon actual eligible execution.
