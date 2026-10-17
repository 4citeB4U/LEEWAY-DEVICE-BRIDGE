# LeeWay Device Bridge — Apple adapter

This is the iOS implementation path of the canonical LeeWay Device Bridge, not a separate Apple product or bridge authority. It uses the registered adapter ID `leeway.operator.ios` and the Apple bundle identity `industries.leeway.devicebridge`.

The source currently provides a direct Metal device probe with deterministic command/readback evidence. It has no third-party model runtime dependency and no MLC Chat code, binary, model, branding, entitlement, or application-data dependency.

The model-runtime interface rejects requests until a LeeWay Formula grant verifier, a Device Bridge-owned local model runtime, and independent receipt verification are connected. A passing Metal readback remains local observation only.

`project.yml` is an XcodeGen specification used only to create the Xcode project during development and in GitHub Actions. It is not part of the iPhone runtime. The GitHub qualification workflow builds unsigned source to prove Apple toolchain compatibility. It does not install an app or create a TestFlight build.
