# LeeWay Universal Device Harness

## Authority

Canonical public authority: `4citeB4U/LEEWAY-DEVICE-BRIDGE`.

GitHub/Pages publishes discovery, contracts and packages. The installed device runtime executes locally. Docker remains development/qualification only.

## Purpose

Expose one governed device/capability fabric to any authorized model or agent, independent of model vendor or parameter count.

```
LLM / Agent
  -> LeeWay Device Bridge
  -> Formula + authority funnel
  -> Provider Registry
     -> Phone native adapter
     -> Home Assistant
     -> n8n automation
     -> Matter / Thread
     -> Zigbee / Z-Wave
     -> MQTT
     -> Bluetooth
     -> USB / Serial / HID
     -> SSDP/UPnP / mDNS / SNMP / WSD
     -> CEC
     -> Modbus / CAN / NMEA
     -> IR / RF proxy
  -> physical execution
  -> observed post-state
  -> receipt
```

## Provider law

A provider is a capability donor, never a higher authority.

Home Assistant is the preferred aggregation provider for devices it owns. n8n is the deterministic workflow/orchestration provider. Direct protocol providers remain available where Home Assistant is absent, inappropriate, or unable to expose the required capability.

## Device identity

Every discovered device SHALL resolve to a durable LeeWay device record:

- `deviceId`
- manufacturer/model when observable
- aliases/human name
- provider binding
- transport
- capabilities
- supported / available / authorized / active / healthy / verified state
- network/radio identity only where authorized
- last observed state
- desired state
- trust/revocation state
- receipts

Discovery never equals authorization.

## Formula automation gate

Canonical F8 structure:

```
Fire_a(t) = T_a(t) G_a(t) product_j C_a,j(t)
q_A(t) = 69 Fire_a(t)
69 -> EXECUTE
0  -> HOLD
```

The canonical Formula corpus currently records an unresolved empty-condition policy. Device Bridge therefore SHALL NOT infer that a zero-condition action is safe. Such execution remains BLOCKED until the canonical Formula policy explicitly closes the gap.

## Physical verification

An action is not complete because an API returned 200.

Where a device exposes readable state, acceptance requires:

request -> authority gate -> actuation -> fresh state observation -> expected/observed comparison -> receipt.

For devices with no return channel (for example some IR-only appliances), the receipt must state that physical post-state is UNVERIFIED unless another sensor establishes it.

## Model-independence

The LLM sends normalized intent, not vendor commands. Example:

```json
{
  "capability": "device.climate.set-temperature",
  "target": "living-room-thermostat",
  "arguments": {"temperatureF": 72}
}
```

The Device Bridge resolves the provider and transport. A 1B model and a frontier model receive the same capability contract and are subject to the same authority and verification gates.

## Provider priority

Provider selection is evidence-driven, not hard-coded globally:

1. exact registered device/provider binding
2. healthy local provider with verified capability
3. Home Assistant entity/device binding
4. direct local protocol adapter
5. approved n8n workflow for compound automation
6. remote/provider-specific route
7. BLOCKED when no authorized verified route exists

## Legacy remote devices

IR/RF control requires an authorized physical emitter/receiver or proxy. HDMI-CEC requires CEC-capable hardware/path. The Device Bridge may represent these devices, but software presence alone never proves physical control capability.
