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

**TIER 1 FAILED; TIER 2 FAILED; ANISSETTE ROUTE REPAIR PENDING.** No Formula evaluation, canonical Veritas decision, Runtime Fabric action, or Learning Ledger update occurred in this recovery record.
