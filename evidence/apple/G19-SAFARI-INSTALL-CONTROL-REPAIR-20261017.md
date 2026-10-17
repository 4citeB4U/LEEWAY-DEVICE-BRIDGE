# G19 Safari install-control repair

**Recorded:** 2026-10-17  
**Repository:** `4citeB4U/LEEWAY-DEVICE-BRIDGE`  
**Trigger:** the installed iPhone PWA showed an Apple installation control that could not install anything.

## Diagnosis

Safari does not expose a web API that lets a page invoke its **Add to Home Screen** control. The prior PWA wording implied that its button could complete that operation. Once launched from the Home Screen, the prior code also disabled the control, leaving the owner without an explanation.

## Repair

The primary Apple card now states that Home Screen presence means installation is complete and that the owner launches LeeWay through the Home Screen icon.

The control is now an active status and help control:

| Context | Label and behavior |
| --- | --- |
| Safari before installation | **SHOW APPLE INSTALL STEPS**; opens the visible Share → Add to Home Screen instructions. |
| Home Screen installed PWA | **LEEWAY APP INSTALLED — SHOW STATUS**; confirms that no further Apple download exists. |

The updated service-worker cache identity forces a fresh application shell on the next online refresh.

## Verification

```text
node --test tests/apple-pwa-source.test.mjs tests/pages-contract.test.mjs
2 passed, 0 failed
```

## Claim boundary

This repair makes the Safari installation state honest and usable. It does not create an IPA, invoke native Metal, or establish a Formula, Veritas, model, or receipt result.
