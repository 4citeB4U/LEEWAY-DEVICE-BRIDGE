# Apple Agent Lee capability route

## Purpose

LeeWay Device Bridge keeps one portable capability contract while selecting the operating-system adapter that can honestly execute it. The iPhone adapter is not a remote-control bypass. The Mac adapter is not a claim that the iPhone app has desktop permissions. Metal remains the native compute provider; Agent Lee is the governed client that requests a specific capability through the Device Bridge.

## Current Apple paths

| LeeWay capability | iPhone/iPad path | macOS path | Current state |
| --- | --- | --- | --- |
| `device.gpu.metal.probe` | Native Metal command/readback | Native Metal command/readback | iPhone local result and hash-bound receipt observed; independent verification pending. |
| `device.apps.leeway.action` | App Intent and App Shortcut invoke a LeeWay-owned action | Same App Intents pattern where packaged | iPhone source implemented; physical Shortcut discovery pending. |
| `device.communications.call` | `tel:` handoff to Phone; user completes or cancels | `tel:`/FaceTime/system-handler handoff as supported | iPhone source implemented; no call has been placed. |
| `device.communications.email` | `mailto:` handoff to configured mail handler; user reviews and sends | `mailto:`/Mail handoff | iPhone source implemented; no email has been sent. |
| `device.ui.pointer.cross-app` | No ordinary-app API | AXUIElement after owner grants Accessibility | iPhone unavailable; macOS adapter not yet implemented. |
| `device.apps.control.cross-app` | No ordinary-app API | NSWorkspace plus owner-approved Accessibility for supported UI | iPhone unavailable; macOS adapter not yet implemented. |
| `device.screen.observe.cross-app` | No implementation in this adapter | ScreenCaptureKit after Screen Recording consent | iPhone unavailable; macOS adapter not yet implemented. |

## Execution discipline

```text
Agent Lee request
  -> Device Bridge capability and owner authorization
  -> Apple adapter
  -> native system action or Metal command
  -> fresh observable result
  -> Veritas post-gate
  -> receipt
```

The metal probe reports only the executed local compute operation. Phone and mail controls are system handoffs, so opening the system handler is not a completed call or delivered message. Each is a separate consequential operation requiring its own authorization, observation, and receipt.

## Apple-native front door

The app includes `RunLeeWayMetalProbeIntent`, discoverable through Siri and Shortcuts once the app is installed and launched. App Intents are Apple’s supported mechanism for publishing an app’s own actions to Siri, Spotlight, and Shortcuts. They do not give LeeWay access to arbitrary third-party app screens or data. [Apple App Intents documentation](https://developer.apple.com/documentation/AppIntents) and [Apple’s verification guidance](https://developer.apple.com/documentation/appintents/verifying-your-app-intents-implementation) describe the platform mechanism and physical-device qualification path.

## GPU integration boundary

The Apple A13 GPU remains the physical Metal provider. LeeWay Device Bridge does not replace it with a fabricated virtual graphics card. LeeWay supplies the governed provider contract, local proof, capability state, and receipt path around real Metal dispatch. An actual LeeWay model workload requires all of the following before it may claim GPU inference:

1. a Device Bridge-owned iOS runtime and model artifact;
2. request-specific Formula authorization;
3. a qualified Metal execution/readback path for that workload;
4. independent Veritas post-gate approval; and
5. an externally accepted receipt.

## Next qualification gates

1. Build the revised unsigned IPA on the GitHub macOS runner.
2. Install it through the existing owner-controlled iPhone route.
3. Launch the app once, then confirm **Run LeeWay Metal Probe** appears in the Shortcuts app and produces a new local receipt.
4. Exercise Phone and Mail only with owner-chosen test destinations, then record the native handoff result without claiming call completion or email delivery from the request alone.
5. Implement the separate macOS Device Bridge adapter with Accessibility and Screen Recording consent checks before claiming Mac control or observation.
