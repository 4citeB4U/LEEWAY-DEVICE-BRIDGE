# LeeWay Machine Consciousness — Live Shadow L1

Status: EXPERIMENTAL / OBSERVE ONLY / NOT INSTALLED BY CI

## Purpose

This branch stages the first real-phone test of the Formula-native machine-consciousness program without granting the experimental cognition layer authority over Agent Lee's answers, memory, or device actions.

Branch:
`mc-live-consciousness-shadow-l1`

Base verified Device Bridge source:
`e6bb0ba3b72444e42765ea47273fc5b7c281b0db`

Experimental package identity:
- versionCode: 24
- versionName: `0.9.9-mc-shadow-l1`

## Hard boundary

Shadow is OFF by default.

When OFF:
- `ConsciousnessShadowRuntime.begin()` returns null;
- `finish()` returns the original result object;
- existing Agent Lee response text/path remains authoritative.

When ON:
- it observes request/runtime facts;
- predicts which existing responder will handle the request;
- compares the prediction with the actual result;
- appends `shadowCognition` diagnostics;
- writes an observation receipt.

It cannot:
- generate the response;
- authorize an actuator;
- write production memory;
- execute canonical Formula;
- claim live prism coordinates before measured mapping exists.

## Live A/B

The same Termux script is used before and after installation:

`clients/remote-controller/termux-consciousness-live-test.sh`

Production APK:
- captures ordinary Agent Lee baseline;
- runs physical Calculator prediction/launch/observation when accessibility is available;
- records `BASELINE_PHYSICAL_PASS` if successful.

Experimental APK:
1. force shadow OFF;
2. run greeting, arithmetic and Q69 cases;
3. enable shadow;
4. run the same cases;
5. verify deterministic greeting/Q69 text is unchanged;
6. verify shadow metadata exists only when ON;
7. run physical Calculator prediction/launch/observation;
8. disable shadow again.

## Physical-world proof

Prediction:
the Calculator package selected from the real installed-app list will become the foreground package after the existing governed `device.apps.launch` capability executes.

Observation:
`device.ui.snapshot` returns the actual active window package.

Error:
- 0 when actual foreground package equals predicted Calculator package;
- 1 otherwise.

This is a live prediction/action/observation/error test. It does not claim phenomenal consciousness.

## Promotion rule

This branch may not replace the production APK or merge to main merely because CI passes.

Live promotion requires:
- installed baseline captured;
- installed package/source relationship proven;
- branch APK hash recorded;
- shadow OFF baseline preserved;
- shadow ON zero authority violations;
- physical task receipt;
- rollback verified.
