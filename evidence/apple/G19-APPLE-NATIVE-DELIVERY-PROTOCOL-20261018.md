# G19 — LeeWay Apple native delivery protocol

**Date:** 2026-10-18  
**Authority:** LeeWay Device Bridge  
**Scope:** reusable iOS and iPadOS native-package delivery and evidence

## Established LeeWay path

1. The installed Safari PWA is the Apple-facing daily entry and cloud-workstation launcher.
2. The canonical Device Bridge repository contains the native adapter source and Metal service.
3. GitHub-hosted macOS qualification builds the source, packages a standard unsigned IPA, and records its evidence.
4. The build artifact carries an Apple package manifest with the IPA digest, source revision, native-service declaration, and governance states.
5. The owner controls signing and installation through a legitimate Apple route such as SideStore or TestFlight.
6. The installed app performs the physical native Metal probe; independent receipt verification decides whether the result enters verified telemetry.

## Reuse boundary

The protocol is portable across LeeWay Apple packages. Each package supplies its own bundle identifier, adapter ID, runtime declaration, source revision, IPA digest, and physical-device evidence. No package may borrow the Device Bridge Metal result or claim Agent Lee runtime execution before its own runtime, Formula, Veritas, and receipt gates pass.

## Current Device Bridge declaration

- Device Bridge: included.
- Native Metal service: included.
- Agent Lee local model runtime: not installed.
- Formula, Veritas, and receipt: external authority required.

This is a documented capability path, not a claim that the physical iPhone has installed or run the new IPA.

## First manifest-artifact verification and repair

GitHub Actions run `39144035299` successfully generated the IPA and manifest. Independent artifact inspection confirmed that the manifest source revision was `81a14bac8b521b229a758009c42bccd2d62b2429`, its SHA-256 matched the downloaded IPA exactly, and the IPA contained `Payload/LeeWayDeviceBridge.app/`.

The first artifact also included an internal uncompressed staging folder. The source IPA and manifest were correct, but the artifact was not minimal. The workflow now creates that staging folder outside the uploaded package root. The next run must demonstrate a clean artifact containing only the IPA, the manifest, and the build log.

The first cleanup attempt, run `39144244776`, kept the native source compilation green but failed before IPA creation because the new package directory was not created before `zip` wrote into it. The workflow now creates both the package directory and the temporary IPA root before packaging. No artifact from that failed run is accepted.
