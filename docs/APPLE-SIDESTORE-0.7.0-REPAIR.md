# SideStore 0.7.0 version gate and direct-delivery fallback

## Purpose

Diagnose a SideStore phone-side sign-in failure without changing LeeWay source code, the installed LeeWay Device Bridge, its Metal receipt, the iLoader certificate, or the pairing record.

## Evidence-based version gate

The iPhone originally reported **SideStore 0.6.4** and failed Apple Account sign-in. The official SideStore 0.6.4 release warns that sign-in is broken on 0.6.4 and earlier. The official **0.7.0-alpha** release addresses an Apple-side **503** sign-in break.

The approved 0.7.0-alpha IPA was installed. iLoader's direct device inventory confirms the installed bundle version is `0.7.0-20260911.328+6032424a`. Therefore the iPhone is not still executing the former 0.6.4 bundle, even if an earlier screen or remembered label displayed that version.

The iPhone still returns **`-80045`** during SideStore sign-in. This is a distinct failure from the 503 break. An open upstream SideStore report records the same combination: iLoader can authenticate, 0.7.0-alpha installs, and SideStore sign-in then fails with `-80045`. SideJIT Server is unrelated and must not be changed for this issue.

## Approved repair artifact

| Field | Value |
| --- | --- |
| Source | SideStore official GitHub release `0.7.0-alpha` |
| IPA | `SideStore.ipa` |
| Local repair copy | `C:\Users\Leona\Downloads\SideStore-0.7.0-alpha.ipa` |
| Published SHA-256 | `e334f86e6ceeab2e0d886c07611246533f474bb18838cf13ebc09ed1f0d622b5` |
| Local SHA-256 check | Match observed on 2026-10-18 |

The release is labelled `alpha` by SideStore. It is selected because the publisher identifies it as the repair for the specific 0.6.4 sign-in break. Do not substitute an unofficial IPA or a nightly build unless this repair itself fails and new upstream evidence supports that move.

## Current result

| Check | Result |
| --- | --- |
| Approved IPA integrity | Verified publisher SHA-256 match |
| IPA installation | Installed through iLoader |
| Installed bundle version | `0.7.0-20260911.328+6032424a` observed by iLoader |
| SideStore Apple Account sign-in | Failed with `-80045` |
| SideStore upstream state | Open unresolved report for the same failure pattern |

No further SideStore sign-in retries are justified at this point. Repeated attempts can make Apple-side throttling harder to distinguish from the upstream application defect.

## LeeWay direct iLoader delivery

LeeWay does not require a signed-in SideStore to use its native Metal adapter. The computer-side iLoader session already authenticated and installed the LeeWay Device Bridge IPA successfully. Use [Apple direct iLoader delivery](./APPLE-DIRECT-ILOADER-DELIVERY.md) for the immediate native package update route.

SideStore remains an optional future update channel once its upstream `-80045` defect is resolved and then independently verified on this iPhone.

## Historical controlled installation record

1. Keep **iLoader** open, logged in, and connected to the selected iPhone by USB.
2. Keep **Jkcoxson (Windows)** selected in iLoader. It is the observed working computer-side authentication route.
3. Preserve the existing iOS Development certificate and pairing file. Do not revoke, reset, or delete either for this version repair.
4. In iLoader, choose **Import IPA**.
5. Select `C:\Users\Leona\Downloads\SideStore-0.7.0-alpha.ipa`.
6. Let iLoader sign and install the replacement SideStore build.
7. On the iPhone, open SideStore and confirm the iLoader device inventory reports version `0.7.0-20260911.328+6032424a`.
8. The subsequent normal Apple Account sign-in attempt failed with `-80045`; do not repeat it as a repair loop.

## Acceptance gate

| Check | Expected evidence |
| --- | --- |
| Version | iPhone shows SideStore 0.7.0-alpha or its successor, not 0.6.4 |
| Sign-in | SideStore accepts the Apple Account without `-80045` after upstream resolution |
| Refresh | SideStore refreshes its own signing record or shows a renewed expiry after sign-in succeeds |
| LeeWay Device Bridge | The existing LeeWay app still launches; its prior local Metal receipt remains local and unchanged |

## Boundaries

This records an upstream SideStore blocker and a functioning LeeWay delivery fallback. It does not prove the LeeWay native package was updated, Metal model inference occurred, Formula authorized work, Veritas approved execution, or a new Device Bridge receipt exists.

## Sources

- [SideStore 0.6.4 release warning](https://github.com/SideStore/SideStore/releases/tag/0.6.4)
- [SideStore 0.7.0-alpha release and official IPA](https://github.com/SideStore/SideStore/releases/tag/0.7.0-alpha)
- [Upstream SideStore `-80045` report matching this iLoader/0.7.0-alpha pattern](https://github.com/SideStore/SideStore/issues/1652)
