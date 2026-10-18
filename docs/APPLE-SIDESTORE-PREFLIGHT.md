# Apple SideStore preflight

Use this check before installing or updating the native LeeWay Device Bridge IPA through SideStore. It prevents the known configuration mix-ups from being treated as a LeeWay GPU or package defect.

## Required state

1. **iLoader account:** the panel says **LOGGED IN AS**.
2. **Physical device:** the intended iPhone is selected and connected by USB.
3. **Anisette route:** use a built-in provider that completed account authentication on this Windows computer. The current observed working selection is **Jkcoxson (Windows)**.
4. **Certificate:** iLoader's Certificates panel lists the existing iOS Development certificate. Do not revoke it merely because an Anisette provider is unavailable.
5. **Installer:** only after the first four checks pass, select **SideStore (Stable)**.

## Keep these routes separate

| Item | Purpose | Must not be used as |
| --- | --- | --- |
| LeeWay `sidestore-source.json` | Native-app update catalog | Anisette Server URL |
| iLoader built-in Anisette provider | Apple-account authentication support | LeeWay update source |
| Existing iOS Development certificate | iLoader signing identity | A cache to revoke after a provider 502 |
| SideStore Stable | iPhone signer and installer | Evidence that a LeeWay Formula, Veritas, or model execution ran |

## Recovery order

1. If an Anisette server returns 502 or another service error, change to another built-in provider and reset Anisette state. Keep the certificate and installed LeeWay app intact.
2. If iLoader authenticates but the install reports `0xE8008018`, inspect the certificate state before any reset or revocation. That code is an install-stage identity rejection, distinct from an Anisette outage.
3. Reinstall SideStore only after the provider, device connection, and certificate state have been examined.

## Boundaries

This guide reduces avoidable routing mistakes. LeeWay cannot read iLoader's private signing state, sign iOS binaries itself, or override Apple’s certificate validation. A passing preflight does not prove SideStore installation, a native Metal result, Formula authorization, Runtime Fabric execution, Veritas approval, or a receipt.

See [LeeWay SideStore update channel](./SIDESTORE-UPDATE-CHANNEL.md) for package publication and update-channel rules.
