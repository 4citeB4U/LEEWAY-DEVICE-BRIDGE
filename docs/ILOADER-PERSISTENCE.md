# iLoader saved setup and update path

## Purpose

Use this guide to keep the Windows iLoader setup ready for LeeWay Device Bridge IPA updates. It describes the supported persistence path; it does not bypass Apple authorization or replace Apple account security.

## Keep this setup between launches

1. In iLoader, select the connected iPhone and leave **Save Credentials** enabled after a successful sign-in.
2. Keep the working Anisette server selected. iLoader stores the selected server in its own local preferences.
3. Preserve the current pairing record and iOS development certificate for routine LeeWay updates.
4. Connect the iPhone by USB, unlock it, and tap **Trust** if iTunes or Windows asks again.
5. For a LeeWay update, choose **Import IPA** and select the release package. iLoader signs and installs the package to the connected phone.

## Do not use these as routine repairs

- Do not reset Anisette state just because iLoader is restarted.
- Do not delete stored pairing data as a normal update step.
- Do not revoke the active certificate to solve a SideStore sign-in problem.

Those actions remove working state and can force a fresh Apple authorization.

## What persists and what can change

iLoader can retain the selected service, saved login through Windows Credential Manager, and pairing information. Apple can still reject or expire an authorization session, and the phone may require a new trust prompt after an operating-system or pairing change. That is an Apple service boundary, not a LeeWay application update.

## SideStore boundary

SideStore sign-in is separate from iLoader. The current LeeWay native Apple update route is direct iLoader IPA import. Do not block a Device Bridge update on SideStore while its upstream session error remains unresolved.

## Evidence basis

This guidance is based on iLoader 2.3.10 source and a local qualified sign-and-install route. The source persists the selected Anisette choice in application preferences and uses the operating-system credential store when saved credentials are enabled. It does not guarantee an Apple session can never expire.

Official references: [iLoader release v2.3.10](https://github.com/nab138/iloader/releases/tag/v2.3.10) and [LeeWay direct iLoader delivery](./APPLE-DIRECT-ILOADER-DELIVERY.md).
