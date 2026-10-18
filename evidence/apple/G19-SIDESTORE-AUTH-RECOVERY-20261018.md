# G19 — SideStore Apple-account recovery record

**Date:** 2026-10-18  
**Scope:** recover SideStore authentication on the physical iPhone without deleting the installed LeeWay Device Bridge or its local evidence.  
**Owner:** Device owner performs iPhone and Apple Account interactions; LeeWay records the repair path and preserves the native-package boundary.

## Acceptance gate

SideStore accepts the owner's Apple Account and can refresh **its own** signing record while Wi-Fi and LocalDevVPN are connected. The LeeWay Device Bridge must remain installed and its existing local Metal receipt must remain untouched.

## Observed evidence

| Field | Observation | State |
| --- | --- | --- |
| Physical device | iPhone 11, USB paired through iLoader | OBSERVED |
| SideStore | Version 0.6.4 launches, but account sign-in fails | OBSERVED |
| iLoader | Version 2.3.10, iPhone detected, Apple Account previously accepted by iLoader | OBSERVED |
| LocalDevVPN | Installed and connected (`10.7.1.1/32`) | OBSERVED |
| Failure | `-80045 This action cannot be completed at this time` during SideStore sign-in | OBSERVED |
| LeeWay native app | Installed; Apple A13 Metal probe previously reported 256 lanes and zero mismatches | OBSERVED — outside this repair scope |

## Diagnosis

`-80045` occurs during SideStore's Apple Account sign-in. It is therefore an Apple-authentication / Anisette boundary, not a LeeWay IPA, native Metal, GitHub release, or PWA failure. No credential, verification code, pairing file, or device identifier is stored in this repository.

## Recovery ladder

Perform one tier, then reopen SideStore and retry the normal sign-in. Stop as soon as it succeeds.

### Tier 1 — preserve apps; reset authentication cache

1. Confirm **Wi-Fi** and **LocalDevVPN** are both connected.
2. In **SideStore → Settings**, open the **Servers** or **Anisette Server** area.
3. Select a different built-in server. If **Macley** is offered, select it. Do not enter an untrusted custom URL.
4. In that same area, tap **Reset `adi.pb`**.
5. Force-close SideStore, open it again, and sign in through the ordinary Apple Account flow.

This follows SideStore's documented sequence to change the Anisette server, reset `adi.pb`, and then sign out/sign in. The current LeeWay app is not deleted in this tier.

**Tier 1 result:** **FAILED** — after the built-in Anisette/cache repair, SideStore still did not allow the owner to sign in with the Apple Account. The exact repeat error remains `-80045 This action cannot be completed at this time`. This rules out the first cache-only recovery; it does not diagnose the Apple Account credentials and does not change the LeeWay application evidence.

### Tier 2 — repair the pairing transport

Only if Tier 1 repeats the same failure:

1. In **SideStore → Settings**, tap **Reset Pairing File**.
2. Connect the iPhone by USB and open **iLoader** on Windows.
3. In iLoader, use **Delete Stored Pairing**, then **Refresh**.
4. Pair the detected iPhone again.
5. Use **Manage Pairing File → Place in All Apps** (or place it next to SideStore, if that is the available wording).
6. Return to SideStore and retry the normal sign-in with Wi-Fi and LocalDevVPN connected.

This is SideStore's documented pairing recovery order. It temporarily removes the pairing transport until iLoader replaces it, so it is deliberately after the cache-only repair.

**Tier 2 result:** **FAILED** — after SideStore pairing reset and iLoader replacement, SideStore still did not allow Apple Account sign-in. This excludes the current pairing record as the repair that resolves `-80045`.

## Installer findings

The owner subsequently reported these iLoader installation results while attempting to reinstall SideStore:

| Code | Meaning | Repair relevance |
| --- | --- | --- |
| `0xE8008018` | The identity used to sign the executable is no longer valid. | The iPhone rejected the signing identity iLoader used for the attempted SideStore install. This is a certificate / provisioning identity boundary. |
| `0xE8008023` | An error occurred while communicating with the device agent. | The device-side installation communication also failed; it does not establish a damaged LeeWay IPA. |

iLoader 2.3.10 is installed and running on Windows, and Apple Devices services are running. The native iLoader window was not exposed to the authorized Windows control surface for inspection, so no unseen certificate or installer control was changed.

The next repair must inspect iLoader's **Certificates** state and re-establish a valid signing identity before another SideStore reinstall. A certificate reset can affect every app signed under that development identity; it requires owner-visible confirmation at the iLoader action.

## Root-cause correction — Anisette service outage

The physical iLoader login screen then provided the primary failure record:

| Field | Observed value |
| --- | --- |
| iLoader version | 2.3.10 |
| Active device | Leonard's iPhone, iOS 27.0.1 |
| Login failure | `HTTP status server error (502 Bad Gateway)` |
| Failing endpoint | `https://new.ani.sidestore.io/v3/get_headers` |

This 502 occurs before iLoader can obtain the headers required to begin Apple Account authentication. It is an external Anisette-service outage or availability failure. It does **not** demonstrate a bad Apple Account password, faulty iTunes installation, damaged LeeWay IPA, or a certificate state that should be reset now.

**Corrected next repair:** dismiss the error, change iLoader from the failing **SideStore (New)** server to the built-in **SideStore** server (`https://ani.sidestore.io`), choose **Reset Anisette State**, then make one normal login attempt. If that server also returns a service error, change to another built-in endpoint such as **SideStore (.app)**; do not use an arbitrary custom URL.

The earlier certificate inspection remains a later, conditional repair only if iLoader successfully authenticates and then again reports `0xE8008018` during the actual stable SideStore installation.

### Windows provider selection observed

iLoader's physical provider list includes **Jkcoxson (Windows)** and **StikStore (Windows)**, as well as Mac-labelled providers. Because this repair is on Windows, the selected first alternate is **Jkcoxson (Windows)**. **StikStore (Windows)** is the next built-in fallback if that provider fails.

The same provider list also displayed a custom value pointing at LeeWay's `sidestore-source.json`. That URL is the LeeWay native-app update catalog; it is not an Anisette endpoint and must not be selected as a custom Anisette server. The PWA and update-channel documentation now state that boundary explicitly.

## Windows host-readiness probe

A local, read-only probe confirmed the Windows prerequisites presently running:

| Check | Result | Evidence state |
| --- | --- | --- |
| iLoader | `iloader.exe` running | OBSERVED |
| Apple Devices | Apple Devices, Apple Mobile Device Helper, Launcher, and Process running | OBSERVED |
| Current iLoader account state | Not logged in; the visible login failure occurs before Apple authentication | OBSERVED |
| Failed SideStore (New) path | iLoader UI reported `502 Bad Gateway` for its `get_headers` request | OBSERVED |
| StikStore endpoint | `https://ani.stikstore.app` returned HTTP 200 from this Windows host | OBSERVED |
| Jkcoxson endpoint root | Returned HTTP 404 to a read-only root probe; this does not prove its v3 API unusable | OBSERVED |

**Next selected route:** choose **StikStore (Windows)** in iLoader, use **Reset Anisette State**, and make one login attempt. This selection is based on an actual successful endpoint response from this computer, not merely the provider name.

## Authentication recovery outcome

The physical iLoader screen subsequently showed a successful recovery through **Jkcoxson (Windows)**:

| Check | Result | State |
| --- | --- | --- |
| iLoader account | Logged in | OBSERVED |
| Active iPhone | Leonard's iPhone, USB, selected | OBSERVED |
| Anisette provider | Jkcoxson (Windows) | OBSERVED |
| Windows reachability | TCP 443 to `ani.jkcoxson.com` succeeded | VERIFIED — transport only |
| Apple Devices stack | Required Windows processes running | OBSERVED |
| SideStore stable install | Not yet attempted in this authenticated state | PENDING |
| Certificate/provisioning inspection | Not yet observed in this authenticated state | PENDING |

This supersedes the planned StikStore fallback: Jkcoxson (Windows) authenticated successfully and should remain selected. Authentication is not installation proof. Before any stable SideStore reinstall, inspect iLoader's **Certificates** panel without resetting or revoking anything, because the prior `0xE8008018` error was an installation-stage signing-identity rejection.

## Certificate observation

iLoader's Certificates panel shows one existing **iOS Development** certificate associated with iLoader. No revoke, reset, delete, creation, or reinstall action occurred. The visible certificate presence proves that iLoader can enumerate a development identity; it does not independently prove that iOS will accept the next signed SideStore installation. The certificate serial and machine identifier are intentionally omitted from repository evidence.

### Preventive LeeWay change

The Apple PWA now links to an **Apple SideStore Preflight** page. The guide and PWA enforce the operating order in user-visible instructions:

1. account logged in;
2. iPhone selected by USB;
3. proven built-in Anisette provider;
4. certificate inspected and preserved;
5. then, and only then, SideStore Stable installation.

It also explicitly blocks the prior category error: LeeWay's `sidestore-source.json` is an app-update catalog and must never be entered as an Anisette endpoint. This prevents configuration confusion; it cannot override Apple validation or external Anisette outages.

## Stable SideStore installation outcome

iLoader then completed a clean **SideStore (Stable)** installation with three passing steps:

| Stage | Result | State |
| --- | --- | --- |
| Download SideStore | Complete | OBSERVED |
| Sign and install SideStore | Complete | OBSERVED |
| Place pairing file | Complete | OBSERVED |

The next iPhone-only completion step is to open SideStore and refresh SideStore from **My Apps** while Wi-Fi and LocalDevVPN are connected. That refresh must be observed separately. It will prove SideStore's own signing cycle is functional; it does not itself update the LeeWay app, execute LeeWay Metal, authorize Formula, or create a LeeWay receipt.

**Current result:** iLoader authentication and stable SideStore installation are **PASSED**. Phone-side SideStore refresh is **PENDING**.

## Phone-side authentication separation

After the stable installation passed, SideStore on the iPhone still returned the prior Apple Account sign-in failure. This reveals a distinct contract boundary:

| Surface | State |
| --- | --- |
| iLoader on Windows | Logged in; stable SideStore install completed |
| SideStore on iPhone | Apple Account sign-in still failed |

iLoader and SideStore each hold their own Anisette/authentication session. The iLoader session does not automatically create a phone-side SideStore session. The PWA preflight now names this as a mandatory independent gate, preventing the earlier unsupported inference that a successful installer login proves SideStore account readiness.

**Earlier next repair withdrawn:** phone-side selection of a SideJIT or Anisette entry is not justified before correcting the app version. The phone exposes only SideJIT Server, and SideJIT is unrelated to SideStore Apple Account sign-in.

## Root-cause correction — SideStore 0.6.4 is upstream sign-in broken

The physical iPhone reported **SideStore 0.6.4**. SideStore's own 0.6.4 release page warns: sign-in is broken on 0.6.4 and earlier. The official `0.7.0-alpha` release identifies Apple server-side changes behind a **503** condition and provides a repair for that condition.

| Check | Result | State |
| --- | --- | --- |
| iLoader account and certificate | Logged in / certificate observed | OBSERVED |
| iPhone SideStore version | 0.6.4 | OBSERVED |
| Phone-side login failure | `-80045` repeated | OBSERVED |
| SideJIT relevance | Not part of Apple Account authentication | VERIFIED against upstream release diagnosis |
| Official repair artifact | SideStore `0.7.0-alpha` IPA | VERIFIED source identity |
| Local IPA SHA-256 | `e334f86e6ceeab2e0d886c07611246533f474bb18838cf13ebc09ed1f0d622b5` | VERIFIED match to publisher digest |

The verified repair file was imported through the already-authenticated iLoader session with the existing certificate and pairing file preserved. iLoader's direct device inventory subsequently reported `CFBundleShortVersionString: 0.7.0-20260911.328+6032424a` for the installed SideStore bundle. This is direct evidence that the phone is running the repaired 0.7 build rather than 0.6.4.

The `-80045` Apple Account sign-in error still occurred on the 0.7 build. An open upstream SideStore issue reports the same reproducible pattern: iLoader authentication succeeds, 0.7.0-alpha installs, and SideStore then fails Apple Account sign-in with `-80045`. The earlier conclusion that upgrading to 0.7 would resolve this error was too broad; that build addresses 503, not every current Apple Account rejection.

**Current repair boundary:** SideStore's phone-side account client is blocked upstream. Repeated attempts, SideJIT changes, pairing resets, and certificate revocation are not justified repairs. LeeWay native delivery instead uses the already verified iLoader USB route: [Apple direct iLoader delivery](../../docs/APPLE-DIRECT-ILOADER-DELIVERY.md).

### Tier 3 — reinstall only after the two repairs fail

Reinstalling SideStore can affect applications SideStore manages. Do not begin this tier until Tier 1 and Tier 2 results are captured. The LeeWay Device Bridge should not be deleted merely to resolve a SideStore sign-in error.

## Verification checklist

| Check | Expected outcome |
| --- | --- |
| SideStore sign-in | Account shows as signed in without `-80045` |
| SideStore refresh | Its own seven-day signing record refreshes or receives a new expiry date |
| LeeWay app | Still launches; existing local Metal receipt stays local and unchanged |
| Update channel | Added only after SideStore authentication works; it is a later gate |

## Authority and boundaries

- [SideStore common issues](https://docs.sidestore.io/docs/troubleshooting/common-issues) directs users to change the Anisette server, reset `adi.pb`, restart, repair pairing, and reinstall only later.
- [SideStore error codes](https://docs.sidestore.io/docs/troubleshooting/error-codes) documents the pairing-recovery sequence and lists **Macley** as a later Anisette choice.
- [SideStore custom Anisette servers](https://docs.sidestore.io/docs/advanced/anisette) describes Anisette as SideStore authentication infrastructure; this does not grant it Formula, Runtime Fabric, Veritas, or LeeWay identity authority.
- The [iLoader SideStore install guide](https://github.com/SideStore/SideStore-Docs/blob/main/docs/installation/install.mdx) identifies iLoader's stable installer as the supported computer-side setup path.
- The [iOS deployment error mapping](https://github.com/ios-control/ios-deploy/blob/master/src/ios-deploy/errors.h) maps `0xE8008018` to an invalid signing identity and `0xE8008023` to device-agent communication.
- The official [SideStore Anisette server list](https://github.com/SideStore/anisette-servers/blob/main/servers.json) lists both the failed **SideStore (New)** endpoint and the built-in **SideStore** / **SideStore (.app)** alternatives.
- The [SideStore sign-in troubleshooting guide](https://docs.sidestore.io/docs/troubleshooting) identifies temporary Anisette server downtime and switching servers as the first repair.

## Evidence state

**SIDESTORE 0.7 INSTALLED; UPSTREAM `-80045` BLOCKED. LEEWAY DIRECT ILOADER DELIVERY READY.** No Formula evaluation, canonical Veritas decision, Runtime Fabric action, or Learning Ledger update occurred in this recovery record.
