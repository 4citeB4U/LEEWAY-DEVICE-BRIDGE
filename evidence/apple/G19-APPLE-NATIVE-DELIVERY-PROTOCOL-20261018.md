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
