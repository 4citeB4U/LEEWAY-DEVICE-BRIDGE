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

## Claim boundary

No route in this record establishes iPhone model inference, native Metal execution, Formula authorization, Veritas validation, signed installation, or TestFlight delivery. This is research and architecture evidence only.
