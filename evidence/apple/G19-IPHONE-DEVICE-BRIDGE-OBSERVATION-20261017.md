# G19 iPhone Device Bridge observation

**Recorded:** 2026-10-17  
**Repository:** `4citeB4U/LEEWAY-DEVICE-BRIDGE`  
**State:** physical-device observation only

## Observed through the trusted USB connection

| Item | Observation |
| --- | --- |
| Device family | iPhone 11 (`iPhone12,1`) |
| Connection | USB, trusted host attached |
| iOS | 27.0.1, build 24A446 |
| Apple Developer app | Installed as user app `developer.apple.wwdc-Release` |
| Apple Developer app version | 11.1 (build 1110.5.3) |
| Apple Developer app signing | `Apple iPhone OS Application Signing` |
| LeeWay Device Bridge iOS app | Not installed |

The device’s name and unique hardware identifier are deliberately omitted from this evidence.

## Actual available capability

The trusted Windows connection can perform bounded device identity and installed-app inventory observation. That establishes a physical Device Bridge target and no more.

The installed Apple Developer app provides an official Apple account and developer-information surface on the phone. Its presence does not create a LeeWay signing team, App Store Connect record, TestFlight build, Device Bridge installation, model runtime, Formula authorization, or Metal-execution receipt.

## Development boundary

The available iOS developer tooling requires both Developer Mode and a mounted Developer Disk Image before developer services such as process control, diagnostics, screenshot tooling, or WebDriverAgent can be used. Neither prerequisite was enabled or mounted in this checkpoint. The Lockdown response did not expose a Developer Mode field, so its state is not claimed.

No app was opened, installed, removed, launched, or modified. No phone-private app storage was accessed. No developer image, tunnel, location simulation, screen capture, process control, UI control, Metal dispatch, model inference, Formula evaluation, or receipt verification was attempted.

## Next gate

The Device Bridge iOS target must first be delivered through the protected TestFlight workflow after Apple Developer Program enrollment and App Store Connect setup. After the owner installs that signed Device Bridge build, the app itself can collect its public-Metal probe evidence under the Device Bridge contract. Developer Mode is a separate local-debugging route and is not required for a TestFlight installation.
