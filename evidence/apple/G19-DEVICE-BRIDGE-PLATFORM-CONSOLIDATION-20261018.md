# G19 Device Bridge platform consolidation — 2026-10-18

## Objective

Make the daily Device Bridge surface usable across Apple, Android, Windows, and Linux without representing unqualified native capabilities as available.

## Implemented source changes

- Rebuilt the main GitHub Pages screen around four matching platform lanes.
- Added equivalent workstation actions for Apple, Android, Windows, and Linux.
- Kept Apple Home Screen PWA use and native IPA delivery separate.
- Kept Android package controls inside the Android lane.
- Moved raw browser profiles and JSON behind expandable technical-evidence controls.
- Added a persisted iLoader setup guide and cached it for the PWA update path.
- Advanced the service-worker cache identifier so an installed PWA can receive the new interface after a refresh.

## Qualified and unqualified states

| Lane | State represented in the interface |
| --- | --- |
| Apple browser PWA | Daily front door; browser observation can be collected locally. |
| Apple native IPA | Direct iLoader update path; native Metal evidence remains platform-specific and receipt verification remains separate. |
| Android | Published Android package route is shown only in the Android lane. |
| Windows | Workstation is available; a native Device Bridge adapter is not claimed by this screen. |
| Linux | Workstation is available; native Device Bridge support is planned and unqualified. |

## iLoader persistence finding

iLoader can retain its selected server and saved credentials through its supported local preferences and Windows Credential Manager. Preserve the active certificate and pairing record for ordinary updates. Apple session renewal, trust changes, and upstream SideStore failures remain external conditions and are not fixed by erasing iLoader state.

## Acceptance boundary

This record establishes a source-level UI and delivery-path repair. Deployment and visual inspection must verify the published Pages version. It does not claim that every native platform adapter, Formula execution, Veritas decision, or receipt verification has completed.
