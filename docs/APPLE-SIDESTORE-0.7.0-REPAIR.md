# SideStore 0.7.0 sign-in repair

## Purpose

Repair a known SideStore phone-side sign-in failure without changing LeeWay source code, the installed LeeWay Device Bridge, its Metal receipt, the iLoader certificate, or the pairing record.

## Evidence-based version gate

The iPhone reported **SideStore 0.6.4** and failed Apple Account sign-in. The official SideStore 0.6.4 release warns that sign-in is broken on 0.6.4 and earlier. The official **0.7.0-alpha** release states that it addresses the Apple server changes that caused that failure.

This makes the SideStore app version the first failed dependency. **SideJIT Server is unrelated** to Apple Account sign-in and must not be changed for this repair.

## Approved repair artifact

| Field | Value |
| --- | --- |
| Source | SideStore official GitHub release `0.7.0-alpha` |
| IPA | `SideStore.ipa` |
| Local repair copy | `C:\Users\Leona\Downloads\SideStore-0.7.0-alpha.ipa` |
| Published SHA-256 | `e334f86e6ceeab2e0d886c07611246533f474bb18838cf13ebc09ed1f0d622b5` |
| Local SHA-256 check | Match observed on 2026-10-18 |

The release is labelled `alpha` by SideStore. It is selected because the publisher identifies it as the repair for the specific 0.6.4 sign-in break. Do not substitute an unofficial IPA or a nightly build unless this repair itself fails and new upstream evidence supports that move.

## Controlled installation steps

1. Keep **iLoader** open, logged in, and connected to the selected iPhone by USB.
2. Keep **Jkcoxson (Windows)** selected in iLoader. It is the observed working computer-side authentication route.
3. Preserve the existing iOS Development certificate and pairing file. Do not revoke, reset, or delete either for this version repair.
4. In iLoader, choose **Import IPA**.
5. Select `C:\Users\Leona\Downloads\SideStore-0.7.0-alpha.ipa`.
6. Let iLoader sign and install the replacement SideStore build.
7. On the iPhone, open SideStore and confirm its displayed version is no longer 0.6.4.
8. Make one normal Apple Account sign-in attempt. If it succeeds, use **My Apps** to refresh SideStore while Wi-Fi and LocalDevVPN are connected.

## Acceptance gate

| Check | Expected evidence |
| --- | --- |
| Version | iPhone shows SideStore 0.7.0-alpha or its successor, not 0.6.4 |
| Sign-in | SideStore accepts the Apple Account without the prior `-80045` failure |
| Refresh | SideStore refreshes its own signing record or shows a renewed expiry |
| LeeWay Device Bridge | The existing LeeWay app still launches; its prior local Metal receipt remains local and unchanged |

## Boundaries

This repairs SideStore's signing client. It does not prove the LeeWay native package was updated, Metal model inference occurred, Formula authorized work, Veritas approved execution, or a new Device Bridge receipt exists.

## Sources

- [SideStore 0.6.4 release warning](https://github.com/SideStore/SideStore/releases/tag/0.6.4)
- [SideStore 0.7.0-alpha release and official IPA](https://github.com/SideStore/SideStore/releases/tag/0.7.0-alpha)
