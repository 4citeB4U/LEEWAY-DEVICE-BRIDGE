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

## Evidence state

**TIER 1 FAILED; TIER 2 FAILED; INSTALLER IDENTITY REPAIR PENDING.** No Formula evaluation, canonical Veritas decision, Runtime Fabric action, or Learning Ledger update occurred in this recovery record.
