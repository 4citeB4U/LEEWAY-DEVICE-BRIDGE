# LeeWay Apple native delivery protocol

## Scope

This protocol is the reusable LeeWay path for an iOS or iPadOS package that needs native Apple capabilities. It keeps the portable Device Bridge authority intact while making the Apple-specific work explicit: macOS compilation, IPA layout, owner-controlled signing, physical execution, and independent evidence.

The Safari PWA remains the daily front door and cloud-workstation launcher. A PWA cannot create `MTLDevice` or issue a Metal command buffer. A native adapter owns that work.

## Required package contents

Every Apple-native LeeWay package must provide:

1. A canonical adapter ID and bundle identifier.
2. A macOS source-qualification workflow that builds without production signing credentials.
3. A standard `.ipa` with exactly one application under `Payload/`.
4. `LEEWAY-APPLE-PACKAGE-MANIFEST.json` beside the IPA, derived from `contracts/apple-native-package.schema.json`.
5. A SHA-256 digest of the IPA and the source revision that produced it.
6. Explicit component states for Device Bridge, native Metal, Agent Lee runtime, Formula, Veritas, and receipt authority.
7. An evidence campaign that distinguishes build success, signing and installation, physical native execution, and receipt admission.

## Agent Lee package rule

An Apple package may include Agent Lee only when it declares the actual local runtime identity and its Formula and Veritas bindings. The current Device Bridge package declares `RUNTIME_NOT_INSTALLED`; it includes the native Device Bridge and Metal service but does not misrepresent that as local Agent Lee model inference.

When a future Agent Lee runtime is added, its package manifest must change the runtime state to `INCLUDED` and add the runtime digest, Formula-grant verifier, and receipt verifier evidence before it can report an inference result.

## Delivery sequence

1. Build the native target in the GitHub macOS qualification workflow.
2. Package the unsigned IPA and generated manifest as one workflow artifact.
3. Verify the manifest digest against the downloaded IPA.
4. Sign and install through the owner-controlled Apple route. SideStore is one supported route for a free Apple Account; TestFlight is the signed program-member route.
5. Run the native adapter’s physical Metal probe.
6. Submit the observation to independent receipt verification before it reaches LeeWay verified telemetry.

## Claim boundary

An unsigned IPA is a delivery artifact, not an installed app. SideStore signing is an owner-controlled distribution action, not a LeeWay verification result. A successful Metal readback is a local native observation, not Formula authorization, Agent Lee inference, or a Veritas receipt.
