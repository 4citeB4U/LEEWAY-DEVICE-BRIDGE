# LeeWay Universal Device Operator

## 5WH identity

**Who:** Agent Lee and other authorized LeeWay clients through the canonical Device Bridge.  
**What:** One governed device-operation contract with replaceable native platform adapters.  
**When:** Any time LeeWay needs device-local observation, files, application interaction, media operations, package/app actions, or automation.  
**Where:** Canonical authority is `4citeB4U/LEEWAY-DEVICE-BRIDGE`; execution lives on the target device, not GitHub Pages.  
**Why:** Eliminate one-off Android/Windows/Apple control paths and recurring adapter/mapper/pipeline failures while preserving owner and OS authority.  
**How:** Portable operator kernel -> capability registry -> authority/consent gate -> platform adapter -> real execution -> fresh observation -> receipt.

License: MIT.

## Canonical topology

```
Authorized LLM / Agent Lee
  -> Device Bridge command contract
  -> Device Operator portable kernel
  -> capability + authority + consent gate
  -> platform adapter
       Android
       iOS / iPadOS
       Windows
       macOS
       Linux
  -> native OS mechanism
  -> observed post-state
  -> Veritas
  -> receipt
```

The Device Operator is **not** a second bridge authority. It is the execution kernel inside the existing LeeWay Device Bridge.

## Core law

- One operator contract; replaceable adapters.
- Available != authorized != active != verified.
- Native platform privilege is never inferred from an APK, executable, script, model, or administrator-sounding label.
- MUTATE and ADMIN operations require explicit owner authorization under LeeWay policy even when the OS would technically permit them.
- Destructive file/media operations SHOULD quarantine when possible before permanent deletion.
- Native stores, entitlements, sandbox rules, UAC, TCC, polkit, SELinux, and device-owner policy remain higher execution boundaries than the adapter.
- A platform adapter reports BLOCKED/UNAVAILABLE rather than simulating success.

## Capability families

```
device.info
device.health
device.files.read
device.files.write
device.screen.observe
device.ui.pointer
device.ui.control
device.apps.list
device.apps.launch
device.apps.install
device.apps.uninstall
device.media.scan
device.media.quarantine
device.media.delete
device.notifications
device.camera
device.location
device.execute
device.receipts
```

Adapters may expose additional capabilities, but must not silently change the meaning of these normalized names.

## Platform adapters

### Android

Reference native runtime: `apps/android`.

Authorized mechanisms include AccessibilityService for owner-enabled UI observation/control, Storage Access Framework and MediaStore for user data, PackageInstaller/install intents for user-authorized package installation, foreground services, and provider bridges such as Termux. Android application UID boundaries remain intact; root/system authority is never implied.

The Accessibility Service added by this operator build provides the native execution surface for UI tree observation, global navigation, gestures and focused-field text entry after the owner explicitly enables it.

### iOS / iPadOS

The adapter is capability-limited by Apple's sandbox. App Intents/Shortcuts expose supported app actions; document/photo pickers expose user-selected data; ScreenCaptureKit provides user-authorized capture where supported. Arbitrary cross-app UI control or silent package installation is not claimed.

### Windows

Use Microsoft UI Automation for cross-process accessible UI, PowerShell/Win32 for host operations, and normal UAC elevation only when an operation actually requires administrator authority.

### macOS

Use AXUIElement for owner-approved Accessibility control, ScreenCaptureKit for screen observation, NSWorkspace for app launching, and security-scoped file access where sandboxed. Accessibility/Screen Recording/TCC consent remains explicit.

### Linux

Use AT-SPI for accessible desktop UI, D-Bus/native app interfaces where available, and XDG Desktop Portal for sandbox-safe file/screen/remote-desktop authorization. Elevated host operations remain subject to polkit/sudo policy.

## Package installation

The operator separates four states:

```
downloaded != staged != installer-authorized != installed
```

Android third-party packages can request package installation and invoke PackageInstaller/system installer flows; this does not grant platform-only silent-install privilege. Windows/macOS/Linux adapters use the platform's authorized package mechanism and elevation policy. iOS/iPadOS distribution remains constrained to Apple-authorized channels and managed-device mechanisms where applicable.

## Media deletion

Deletion is always a consequential operation:

```
discover -> classify -> present/authorize -> quarantine when available -> delete -> re-scan -> receipt
```

Zero-byte size alone may identify an empty file but does not establish that every small file is disposable.

## Formula boundary

The Device Operator follows the Formula Funnel and the runtime/provider-adapter boundary. Platform adapters do not duplicate the Golden Formula kernel. Numeric Formula execution must remain NOT_EXECUTED unless the canonical evaluator actually runs.

## Acceptance gates

A platform adapter is not VERIFIED merely because its manifest exists. Each target must pass:

1. adapter discovery;
2. capability-state truthfulness;
3. owner authorization;
4. native execution;
5. fresh post-state observation;
6. negative/blocked-path test;
7. restart/reconnect test where applicable;
8. receipt integrity.

Android is the current implementation target. Other adapters are registered architecture until their native runtimes and physical qualification pass.
