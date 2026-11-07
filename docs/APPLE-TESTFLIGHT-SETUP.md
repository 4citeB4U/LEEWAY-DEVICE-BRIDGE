# LeeWay Device Bridge Apple TestFlight setup

This setup delivers the existing `apps/apple` iOS Device Bridge adapter. It does not create another Apple app authority and does not use MLC Chat.

## Account gate

The Apple account has a free Apple Developer profile. TestFlight delivery requires enrollment in the Apple Developer Program. Enrollment, any payment, and agreements must be completed by the account owner directly in Apple Developer because they create a paid account commitment.

After enrollment, use the Apple Developer and App Store Connect pages to complete these one-time items:

1. Register the iOS App ID `industries.leeway.devicebridge` under the LeeWay Apple developer team.
2. Create an App Store Connect app record named **LeeWay Device Bridge** using that App ID. Choose a unique SKU that contains no password, token, or personal identifier.
3. Create an Apple Distribution certificate and an App Store provisioning profile for that App ID.
4. Create a narrowly scoped App Store Connect API key authorized only to upload builds for the LeeWay Device Bridge app.

## GitHub secret contract

Add these values as **Actions secrets** in `4citeB4U/LEEWAY-DEVICE-BRIDGE`, ideally protected by the `apple-testflight` environment:

| Secret | Source | Handling |
| --- | --- | --- |
| `APPLE_TEAM_ID` | Apple Developer team | Plain team identifier. |
| `APPLE_DISTRIBUTION_CERTIFICATE_BASE64` | Exported Apple Distribution `.p12` | Base64 text, never committed. |
| `APPLE_DISTRIBUTION_CERTIFICATE_PASSWORD` | Chosen during `.p12` export | Secret. |
| `APPLE_PROVISIONING_PROFILE_BASE64` | App Store provisioning profile | Base64 text, never committed. |
| `KEYCHAIN_PASSWORD` | New random CI-only value | Secret used only on the transient runner. |
| `APPSTORE_CONNECT_ISSUER_ID` | App Store Connect API key page | Identifier, stored as secret. |
| `APPSTORE_CONNECT_KEY_ID` | App Store Connect API key page | Identifier, stored as secret. |
| `APPSTORE_CONNECT_PRIVATE_KEY_BASE64` | Downloaded API `.p8` key | Base64 text, never committed. |

Do not paste any of these values into chat, source files, issues, pull requests, build logs, or command history. Enter them directly into GitHub's secret form while signed into the repository owner account.

## Delivery workflow

`.github/workflows/apple-device-bridge-testflight.yml` is manual-only. Once the account and secrets exist, choose the workflow in GitHub Actions, provide a release version and unique positive build number, then run it. It archives `LeeWayDeviceBridgeApple`, uploads the `.ipa` to App Store Connect, and preserves only the sanitized archive log as an Actions artifact.

The initial run must still be checked in App Store Connect before inviting testers. A successful upload does not prove TestFlight processing, installation, iPhone execution, Formula authorization, model execution, or independent receipt verification.

## Customer App Store edition and Sign in with Apple (2026-11-07)

The manual workflow now selects the `appstore` in-app update channel instead of developer IPA updates. It rejects an unbound `LEEWAY_APPLE_IDENTITY_EXCHANGE_ENDPOINT` configuration; the GitHub Actions environment variable must be an owner-approved HTTPS identity service endpoint ending with `/v1/device-bridge/apple/session`. That endpoint must validate Apple's JWT signature, issuer, audience and nonce against Apple's keys, reject replay and untrusted tokens, and issue a canonical LeeWay Runtime session—not a client-side self-asserted login.

Enable **Sign in with Apple** for the existing `industries.leeway.devicebridge` App ID, then regenerate the distribution profile to include the entitlement declared in `apps/apple/LeeWayDeviceBridge.entitlements`. Do not create a second LeeWay native App ID or change a working installation's bundle identity.

The same App Store Connect upload can be admitted for TestFlight processing and eventually submitted to App Review. Until the owner has an enrolled Developer Program account, required distribution secrets, an approved App Store listing ID and actual Apple review, there is no customer App Store package to promote. Only after publication should the canonical package manifest mark `consumerDistribution.state=PUBLISHED` and bind its exact `apps.apple.com` URL. No fake App Store ID or token belongs in source control.

An App Store build must receive separate physical device, native Metal, identity/registration, Formula, Veritas and receipt custody qualification. The developer IPA/iLoader route is independent. See [Apple consumer distribution](APPLE-CONSUMER-DISTRIBUTION-20261107.md).
