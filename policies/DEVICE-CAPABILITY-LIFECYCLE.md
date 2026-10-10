# LeeWay Device Capability Lifecycle Policy

## Authority

Canonical execution authority: `4citeB4U/LEEWAY-DEVICE-BRIDGE`.

This policy binds the existing device, pairing, provider, capability, command, session and receipt contracts into one governed lifecycle.

## State law

A device or capability moves only through evidenced states:

```text
UNKNOWN
→ DISCOVERED
→ IDENTIFIED
→ REGISTERED
→ PAIRING_REQUIRED
→ PAIRED
→ AUTHORIZED
→ AVAILABLE
→ ACTIVE
→ HEALTHY
→ VERIFIED
```

Failure states are explicit:

```text
DEGRADED
BLOCKED
FAILED
REVOKED
```

No state may be inferred from the existence of source code, a provider package, a network endpoint, or a prior historical receipt.

## Discovery policy

Discovery is observational only.

Discovery MAY:
- observe advertised names, addresses and service metadata where platform policy allows;
- create or update a LeeWay Universal Device candidate record;
- propose provider bindings;
- emit OBSERVED evidence.

Discovery SHALL NOT:
- pair automatically;
- authenticate automatically;
- actuate;
- elevate trust;
- mark a device VERIFIED.

## Pairing policy

Pairing requires device identity plus owner approval. Pairing grants a relationship, not blanket capability authority.

Pairing SHALL NOT imply:
- OPERATE permission;
- ADMIN permission;
- safety-critical capability access;
- Formula admission.

Revocation invalidates future authority while preserving historical evidence and receipts.

## Provider policy

Providers donate capabilities. Providers never become LeeWay authority.

Provider source presence, configuration, network reachability, API success, ACK, and physical verification are distinct states.

## Actuation policy

Consequential actuation requires all applicable gates:

1. device is paired where pairing is required;
2. capability is authorized;
3. command envelope validates;
4. replay protection passes;
5. Formula/authority gate admits execution;
6. calibrated timeout policy resolves;
7. deterministic provider route resolves;
8. command dispatch succeeds;
9. fresh read-back converges;
10. Veritas admits the observed state;
11. receipt is written.

If any required gate is absent, execution is BLOCKED.

## Read-back policy

API success, socket write, MQTT PUBACK, protocol ACK, and local software cache are not physical proof.

Read-back MUST:
- be fresh;
- derive from the device, bus, authoritative provider state, or an independent sensor;
- be independent of the dispatcher's requested-state cache;
- use an authorized comparison policy.

## Timeout policy

There is no universal timeout constant.

Timeout and polling policies are calibrated per:
- provider;
- device class;
- capability;
- transport path.

Uncalibrated values are test parameters only.

## Fail-safe policy

A consequential capability MUST define its fail-safe behavior before physical promotion.

Fail-safe execution does not automatically prove safe state. When observable, the fail-safe result must itself be read back and verified.

## Formula policy

Device actuation numeric Formula evaluation remains NOT EXECUTED until the six-dimension domain adapter is calibrated and authorized.

The six ordered dimensions are:
1. transport_integrity
2. authorization_integrity
3. readback_convergence
4. latency_margin
5. failsafe_readiness
6. provider_health

## Promotion policy

Promotion is monotonic only with evidence:

```text
PROPOSED
→ SOURCE_IMPLEMENTED
→ SOURCE_QUALIFIED
→ LIVE_OBSERVED
→ PHYSICAL_VERIFIED
→ CANONICAL
```

A failed or contradictory campaign may move a capability to BLOCKED or ROLLED_BACK.

First success is not completion.
