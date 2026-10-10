# LeeWay Device Safety Classification Policy

## LOW

Examples: observational sensors, read-only status, non-critical light control.

Minimum:
- owner authorization;
- provider qualification;
- bounded timeout;
- read-back where available;
- receipt.

## MODERATE

Examples: ordinary appliance control, HVAC comfort settings, non-critical robot functions in controlled space.

Adds:
- explicit actuation policy;
- calibrated timeout;
- verified fail-safe;
- fresh post-state observation.

## HIGH

Examples: locks, powered doors, pumps, valves, machinery movement, robots around people.

Adds:
- each-actuation or tightly bounded policy confirmation;
- dedicated safety envelope;
- independent read-back where practical;
- fail-safe qualification;
- recovery test;
- physical campaign.

## CRITICAL

Examples: vehicle propulsion/steering/braking, aircraft flight control, powertrain, high-energy switching, life-safety systems.

Default state: BLOCKED.

Promotion requires a dedicated domain safety case, independent qualification, bounded authority, physical test campaign and explicit creator approval. Generic provider wrappers are insufficient.

## Law

Safety class is determined by consequence, not protocol name. MQTT, Matter, Bluetooth, CAN, REST or WebRTC may each carry LOW through CRITICAL operations depending on the attached capability.
