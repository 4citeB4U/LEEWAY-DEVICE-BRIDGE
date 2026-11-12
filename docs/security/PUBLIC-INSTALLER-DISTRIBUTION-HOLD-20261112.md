<!--
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE_BRIDGE.PRODUCT.RELEASE_HOLD
TAG: LEEWAY.DEVICE_BRIDGE.PUBLIC_INSTALLER_QUARANTINE.20261112.V1
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
5WH:
WHAT = Hold public Android and unsigned Apple installation distribution until exact approved release.
WHY = Prevent debug downloads, self-re-signed updates, unsafe uninstall and OS-trust false claims.
WHO = Creator/Human Authority, original Device Bridge platform/signing owners, independent Veritas and Production release custodian.
WHERE = docs/security/PUBLIC-INSTALLER-DISTRIBUTION-HOLD-20261112.md.
WHEN = 2026-11-12 after independent review of Android CI and release manifest paths.
HOW = Remove CI-to-Pages publishing, unlink/withdraw public APK files, block app/Termux updater, verify source and then qualify live distribution separately.
LICENSE: Existing repository terms remain unchanged.
-->
# Public installer distribution hold — source gate and real release authority

**State:** `SOURCE_HOLD_QUALIFIED_IF_CI_PASSES` (not proof of live Pages/Funnel/CDN cache invalidation). **Original mission:** Plan A. [Signing custody issue #107](https://github.com/4citeB4U/LEEWAY-DEVICE-BRIDGE/issues/107), [independent reconciliation #109](https://github.com/4citeB4U/LEEWAY-DEVICE-BRIDGE/issues/109). Use approved Standards and original Product OS Trust Contract.

## Forensic cause and affected channels
- GitHub Actions `.github/workflows/android-build.yml` built `assembleDebug`, then had `contents: write`, copied `app-debug.apk` to public `docs/downloads`, marked source CI `VERIFIED`, and committed/pushed the APK/metadata to `main` without independent signing/OS/Veritas release approval. Changes under `tests/**` could trigger that publication.
- The public homepage had **two** direct debug APK download anchors, bypassing the relay's protected `/downloads` handler. `docs/package-manifest.json` advertised the debug build and the Android native `GitHubUpdateChecker`, Termux script and phone-workstation updater consumed it.
- Termux `install_latest_bridge` offered an Android uninstall confirmation after an update failed; uninstall could remove locally device-owned Digital Brain and Diagnostics data. That is incompatible with Creator's exclusive hardware sovereignty and update-continuity requirements.
- The phone-workstation loopback updater used `apksigner` to re-sign downloaded debug source with a local keystore, which is not equivalent to a verified approved publisher signature or valid Android update lineage.
- The Apple package entry advertised `AVAILABLE`/`nativeVerification:true` while pointing to an **unsigned IPA**. A published unsigned archive is not an owner-installed native iPhone app.

## Bounded source containment
1. Android build CI keeps source/tests and development Actions artifact, but no longer has repository write permission or a step to publish an APK/manifest into public Pages. The development artifact **must not be called production signed**, no matter its SHA or CI result.
2. Active `docs/downloads/*-latest-{debug,release}.apk` files are withdrawn from the branch/current public tree; historical source SHAs, source run IDs and hashes remain as historical references in the held metadata. Current manifest has `downloadEnabled:false`, `publicReleaseAuthorized:false`, `downloadUrl:null`, `releaseState:SECURITY_HOLD_NOT_QUALIFIED`.
3. `docs/index.html` now reports the hold instead of offering direct debug downloads. Original relay exact-artifact release gate continues independently.
4. Native Android update checker refuses non-`AUTHORIZED_RELEASED` packages and clears old pending install notifications; Termux refuses unsigned/held metadata, no raw GitHub fallback and **no automatic uninstall**; phone-side updater refuses unqualified Device Bridge metadata and may only forward a signed release after checking its expected cert fingerprint, not locally re-sign the candidate.
5. `docs/package-manifest.json` must not describe unsigned Apple IPA as physically qualified, even when an upstream GitHub release link still exists as a source artifact. iOS OS-specific signing, entitlement, provisioning and physical installation remain a separate owner gate.
6. Existing locally installed apps, device-owned Brain/Diagnostics, already written receipts, historical Git commits, owner credentials and other approved flows are untouched.

## Before any new public installer is authorized
**First:** independent review of source and OS capability/permission requirements, original owner identity and signing key custody, old Android installed signer/new signer migration preserving device data; approved source commit, reproducible toolchain, SBOM, signature and exact SHA of *downloaded bytes*.

**Second:** qualified real-device install/update/reboot/uninstall/rollback with user consent, Android Play Protect and Windows/Apple OS warning classification where applicable. For iPhone, require genuinely signed native install with real device readback (not an unsigned IPA + webpage). Include negative tests for stale hold, compromised key, Play Protect warning, mismatched cert, interrupted migration and cache replay.

**Last:** original Formula/Veritas PRE/POST, Receipt Authority, Continuum, Learning/Production authority where applicable, independent approval of one release manifest/asset and a dedicated owner-managed publishing workflow. Then verify actual GitHub Pages, raw GitHub, mirrors/CDNs and Funnel GET/HEAD and native update post-state. **Do not reenable the prior debug autopublisher.**

## Truth boundary
This PR can remove files from the active current Git tree and stop further CI publication; it cannot rewrite Git history, revoke old URLs already cached, confirm installed-device state, rotate previously exposed keys, issue ZITADEL grants or enroll Veritas roots. Record each missing observation as `NOT_VERIFIED`, not `FIXED_IN_PRODUCTION`.
