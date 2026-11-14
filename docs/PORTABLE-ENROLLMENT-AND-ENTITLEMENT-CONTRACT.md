# Portable enrollment and service-entitlement contract

## Customer journey

1. The customer installs the Device Bridge package for their platform.
2. The package discovers its own platform capabilities through its native adapter; it does not ask the customer to supply paths, relay tokens, device IDs, or registry records.
3. The customer signs in through the configured identity provider. Email is a login handle. The stable issuer-plus-subject identity is the account key.
4. The device creates or loads its device-held key, requests Runtime enrollment, receives owner/account approval, and stores only its local enrollment custody material.
5. Runtime records the device under the account and evaluates the account's service entitlement. The same flow applies to one device or one hundred devices.

## Product and payment boundary

- The Device Bridge never accepts or stores card, bank, or payment-provider credentials.
- A billing/entitlement authority issues a minimal, signed entitlement for `leeway.device-bridge`, bound to the stable account issuer and subject.
- The entitlement carries status, a device limit, and either an expiration or `PERPETUAL` license mode. Payment webhooks belong to the billing authority, not a phone, workstation, relay, or static repository JSON file.
- Enrollment and remote Bridge service require an active or explicitly granted grace entitlement. Limits are account-wide, not tied to hardware names, operating systems, drives, or model providers.

## Customer custody during a payment lapse

If service is past due, canceled, expired, or revoked, the Bridge may suspend remote-control and hosted-service capabilities. It must not delete, encrypt for ransom, confiscate, or make inaccessible the customer's local Digital Brain, Continuum, Diagnostics, or export path. A local stop/control path remains available to the customer.

## Required production bindings

The source evaluator in `operator/entitlement-gate.mjs` is a contract-level gate, not a billing system or live production decision. Production requires:

- verified OIDC login and stable account subject;
- a signed entitlement authority with replay/revocation handling;
- Runtime's authoritative per-account device count and enrollment registry;
- an owner-visible device-management/revocation screen;
- a payment provider selected and operated under applicable legal, tax, privacy, refund, and consumer-protection requirements;
- Formula, Veritas, canonical Receipt Authority, and real-device acceptance evidence.
