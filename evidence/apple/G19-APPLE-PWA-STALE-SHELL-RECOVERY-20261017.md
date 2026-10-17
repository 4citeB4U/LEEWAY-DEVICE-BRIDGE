# G19 Apple PWA stale-shell recovery

**Recorded:** 2026-10-17  
**Repository:** `4citeB4U/LEEWAY-DEVICE-BRIDGE`  
**Trigger:** an installed iPhone PWA continued to show an earlier Device Bridge shell after the current Pages build was live.

## Diagnosis

The live Pages route returned the current Apple-first source after a browser reload, while the installed PWA continued to expose stale controls. This is a PWA service-worker/cache lifecycle condition, not evidence that the current build failed its source gate.

## Recovery route

`docs/refresh.html` provides the owner-controlled recovery action at:

```text
https://4citeb4u.github.io/LEEWAY-DEVICE-BRIDGE/docs/refresh.html
```

The action removes only this origin's service-worker registrations and Cache Storage entries, then returns to the current PWA route with a cache-busting query string. It does not remove the Home Screen icon. It does not remove `localStorage`, which is where the Device Bridge stores its local browser bootstrap profile.

## Verification

```text
node --test tests/apple-pwa-source.test.mjs tests/pages-contract.test.mjs
2 passed, 0 failed
```

## Claim boundary

This route recovers the current PWA web shell. It does not establish an iPhone observation, browser WebGPU result, native Metal execution, Formula authorization, Veritas validation, inference result, or receipt.
