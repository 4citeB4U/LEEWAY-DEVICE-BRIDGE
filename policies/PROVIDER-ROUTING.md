# LeeWay Device Provider Routing Policy

## Selection order

1. exact registered device/provider binding;
2. healthy local provider with PHYSICAL_VERIFIED capability;
3. authorized Home Assistant entity/device binding;
4. qualified direct local protocol adapter;
5. approved deterministic workflow for compound automation;
6. qualified remote/provider-specific route;
7. BLOCKED.

## Routing constraints

- Provider selection is evidence-driven.
- Lowest latency does not override authority, safety or verification.
- WebRTC/Edge RTC is an optional transport, not device authority.
- Home Assistant is an aggregator provider, not Device Bridge authority.
- n8n is an automation provider, not Formula authority.
- A vendor SDK/API remains replaceable behind the provider contract.

## Degradation

When a preferred provider becomes DEGRADED, the dispatcher may fail over only to a route already authorized and qualified for the same capability and safety class.

No silent failover may reduce:
- owner-confirmation requirements;
- read-back strength;
- fail-safe coverage;
- cryptographic/replay guarantees;
- Veritas acceptance criteria.
