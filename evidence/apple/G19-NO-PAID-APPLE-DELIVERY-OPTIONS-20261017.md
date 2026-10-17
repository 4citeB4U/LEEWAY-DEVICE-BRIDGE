# G19 no-paid Apple delivery options

**Recorded:** 2026-10-17  
**Repository:** `4citeB4U/LEEWAY-DEVICE-BRIDGE`  
**Purpose:** distinguish usable no-fee iPhone routes from paid Apple distribution.

## Verified Apple boundary

Apple states that a free developer account can test apps directly on the account holder’s own devices with Xcode. Apple also states that uploading beta builds to App Store Connect for TestFlight requires Apple Developer Program membership. A Personal Team cannot sign an app for App Store submission.

The paid Apple Developer Program and its TestFlight path are therefore not available without membership. This is a distribution boundary, not a prohibition on all LeeWay execution on the iPhone.

## Route A — Safari installed web application

The Device Bridge can provide a portable web application hosted through an ordinary HTTPS host, such as GitHub Pages. On the iPhone, the owner opens it in Safari and uses Add to Home Screen. Apple documents that web applications can supply a manifest, icon, and standalone presentation metadata.

This route needs no Apple Developer Program membership, TestFlight, certificate, provisioning profile, App Store Connect record, or device-side installation through Apple’s distribution service.

It is the preferred no-fee route for LeeWay’s first usable iPhone experience because it preserves LeeWay ownership of the application and can integrate its Formula request boundary and evidence UI. It must identify itself honestly as a web adapter. Direct native Metal, native model-runtime, and signed-app claims remain unverified until a separately qualified native route exists. Browser GPU capability must be probed at runtime and fail closed when unavailable.

## Route B — free Personal Team testing through Xcode

Apple’s free account permits direct testing on the owner’s devices through Xcode. This route requires a Mac running Xcode with the physical iPhone available to that Mac. It is appropriate for a personal development build, not for TestFlight, App Store, or broadly shareable delivery.

This workstation and GitHub-hosted macOS runners can build the source, but a hosted runner cannot physically attach the iPhone for the Xcode device deployment step. The current Windows host does not provide Xcode.

## Route C — community sideloading

AltStore documents a community route that uses a regular Apple account for sideloaded apps. Its documentation states that free-account sideloaded apps expire after seven days and that Apple limits the device to three sideloaded apps. This route is not TestFlight or an Apple-supported distribution channel. It requires regular refresh and a careful local signing setup.

The project may later produce an unsigned IPA artifact for owner-controlled sideload testing, but that is not implemented or qualified in this checkpoint.

### SideStore assessment

SideStore is a viable candidate for the owner-controlled sideload route. Its repository identifies it as an AGPL-3.0 licensed AltStore fork that resigns apps with a personal development certificate and refreshes the ordinary seven-day development period. Its current documentation supports an initial install from Windows and requires an Apple Account, a trusted USB-connected iPhone, Wi-Fi, LocalDevVPN, iTunes or Apple Devices, and the `iloader` installer.

For the current iOS generation, SideStore’s installation instructions require the owner to trust the developer app, enable Developer Mode, accept a restart, and then connect LocalDevVPN before using SideStore. The VPN must be active to install, update, or refresh apps. These are device-security and account-signing decisions for the owner to make on the device; they have not been performed.

LeeWay must not copy, modify, or bundle SideStore into `LEEWAY-DEVICE-BRIDGE`. Its AGPL-3.0 license requires a separate license review before any derivative distribution. The approved architecture is narrower: LeeWay builds an independently owned IPA; the owner uses an unmodified SideStore release as an external installation and seven-day-refresh transport. Formula, runtime, verification, receipts, model execution, and device identity remain LeeWay-owned concerns.

## Alternative comparison for the physical iPhone

| Alternative | Current suitability | Decision | Evidence boundary |
| --- | --- | --- | --- |
| Safari installed web application | Works without native signing or paid membership; can remain the always-available LeeWay front door. | **Primary immediate route** | Web adapter only. Browser compute must be measured and cannot claim native Metal. |
| SideStore direct IPA | Windows-capable initial setup and direct native-app installation; can refresh without a computer after setup. Its own FAQ identifies free-account limits of three active apps and ten App IDs per week, and labels the project public beta. | **Native qualification route** | Requires owner-approved Apple-account sign-in, LocalDevVPN, device trust, Developer Mode, restart, and an actual compatibility test on iOS 27.0.1. |
| Sideloadly direct IPA | Windows-capable USB and Wi-Fi installer with a desktop refresh daemon. Its FAQ states that free-account apps last seven days and supports three active apps. | **Fallback only** | Closed external installer; depends on a reachable Windows host or USB for refresh. It should not be embedded in LeeWay or used as an authority. |
| LiveContainer | It can avoid the three-app count by launching guest apps inside one host application. Its documentation says guest entitlements are not applied, guest containers are not isolated from one another, app extensions and remote push are unsupported, and it is AGPL-3.0. | **Rejected for Device Bridge** | Those limitations undermine the native Device Bridge’s direct-app identity, entitlement, data-isolation, and evidence model. It may be useful for unrelated disposable apps, not this provider. |
| TrollStore | The official project supports iOS 14.0 beta 2 through 16.6.1, 16.7 RC, and 17.0, and says 17.0.1 and later will never be supported without another CoreTrust flaw. The observed phone is on iOS 27.0.1. | **Unavailable and rejected** | An exploit path is neither available on this device nor an acceptable foundation for a governed production adapter. |
| Free Xcode Personal Team | Apple permits testing on the owner’s own device using Xcode. | **Not immediate** | Requires a physical Mac with Xcode and does not supply TestFlight or general distribution. |
| Apple fee waiver | Available only to eligible legal nonprofits, accredited educational institutions, and government entities. | **Conditional later route** | Apple must approve; no eligibility or waiver is claimed. |

## Selected architecture

Use two independent delivery lanes instead of making all LeeWay capability depend on one sideloading tool:

```text
Safari PWA on iPhone
  └─ permanent, no-fee LeeWay front door
       └─ Formula request / Diagnostics / evidence UI

Direct LeeWay Device Bridge IPA via SideStore
  └─ optional native-device qualification lane
       └─ public Metal probe / native adapter evidence
```

The PWA carries the durable user experience. SideStore is confined to the optional native laboratory where a direct iOS app is necessary. If SideStore fails or expires, the PWA remains usable; if browser compute is unavailable, it must report that condition rather than borrow a native-Metal claim.

This design avoids MLC Chat dependence and avoids granting SideStore authority over Formula, inference, verification, or LeeWay identity.

## Potential membership exception

Apple offers a fee waiver to eligible legal nonprofit organizations, accredited educational institutions, and government entities. Individuals and sole proprietors are excluded. Eligibility and approval are Apple’s decision; no waiver is claimed here.

## Recommended next implementation

Build the Safari installed web application inside `LEEWAY-DEVICE-BRIDGE` now. Keep the existing iOS native source as a future adapter and keep its claims separate. The web application should:

1. expose Device Bridge identity and honest adapter state;
2. keep Formula authorization external and fail closed without a verified receipt;
3. probe optional browser compute without presenting it as native Metal;
4. record the physical iPhone as unqualified until a real in-browser test returns evidence;
5. provide an iPhone Safari installation guide.

## Sources

- Apple Developer Program overview: <https://developer.apple.com/programs>
- Apple app-distribution tutorial: <https://developer.apple.com/tutorials/develop-in-swift/welcome-to-app-distribution>
- Apple Personal Team signing boundary: <https://developer.apple.com/library/archive/qa/qa1915/>
- Apple Program enrollment and fee-waiver information: <https://developer.apple.com/help/account/membership/program-enrollment/>
- Apple Safari web-application metadata: <https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html>
- AltStore documentation: <https://github.com/altstoreio/FAQ/blob/main/altstore-world/your-altstore.md>
- SideStore source: <https://github.com/SideStore/SideStore>
- SideStore prerequisites: <https://docs.sidestore.io/docs/installation/prerequisites>
- SideStore installation: <https://docs.sidestore.io/docs/installation/install>
- SideStore FAQ and limits: <https://docs.sidestore.io/docs/faq>
- LiveContainer source and limitations: <https://github.com/LiveContainer/LiveContainer>
- TrollStore supported-version boundary: <https://github.com/opa334/TrollStore>
- Sideloadly FAQ: <https://sideloadly.io/faq>

## Claim boundary

No route in this record establishes iPhone model inference, native Metal execution, Formula authorization, Veritas validation, signed installation, or TestFlight delivery. This is research and architecture evidence only.
