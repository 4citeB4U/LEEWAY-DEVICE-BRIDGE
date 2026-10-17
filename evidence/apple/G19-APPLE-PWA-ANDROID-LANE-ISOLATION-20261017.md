# G19 Apple PWA Android-lane isolation

**Recorded:** 2026-10-17  
**Repository:** `4citeB4U/LEEWAY-DEVICE-BRIDGE`  
**Trigger:** an iPhone PWA user reached the Android Secondary Workstation's cloud-workstation link instead of the Apple diagnostics path.

## Diagnosis

The shared Device Bridge page showed Android-only content after the Apple install and first-launch cards. In particular, **Open Phone Cloud Workstation** belonged to the Android Secondary Workstation, not to the iPhone Safari PWA. Its presence created an incorrect next step for an Apple device.

## Repair

At startup, the web app identifies an iPhone or iPad browser from the browser platform information and applies the `apple-pwa` presentation class. In that mode, the following sections are hidden:

- Android Native Capability Package download;
- Native phone runtime package card;
- Android Secondary Workstation, including Open Phone Cloud Workstation.

The Apple first-launch path remains visible: **Check This iPhone Now** → Digital Brain and Diagnostics → optional **Run Browser Compute Probe**.

## Verification

```text
node --test tests/apple-pwa-source.test.mjs tests/pages-contract.test.mjs
2 passed, 0 failed
```

## Claim boundary

This presentation repair prevents route confusion. It does not establish a Safari GPU result, native Metal execution, Formula authorization, Veritas validation, inference, or receipt issuance.
