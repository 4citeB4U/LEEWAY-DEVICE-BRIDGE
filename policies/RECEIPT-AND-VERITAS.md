# LeeWay Device Receipt and Veritas Policy

## Receipt law

A receipt records what was evidenced. It does not convert an unverified event into a verified event.

Every consequential transition receipt SHOULD preserve:
- commandId;
- deviceId;
- capability;
- providerId;
- authority basis;
- Formula decision reference;
- timeout policy reference;
- read-back policy reference;
- fail-safe policy reference;
- dispatch result;
- ACK evidence where applicable;
- observed post-state;
- comparison result;
- elapsed timing;
- fail-safe invocation/result;
- Veritas state;
- evidence hashes;
- receipt hash.

## Veritas states

- ADMITTED — required evidence converged.
- REJECTED — execution or verification failed.
- BLOCKED — a prerequisite was absent or authority denied.
- UNVERIFIED — execution may have occurred but required physical proof is absent.

## No false promotion

The following never equal ADMITTED by themselves:
- HTTP 2xx;
- MQTT publish success or PUBACK;
- WebSocket send success;
- Bluetooth write success;
- CAN transmit success;
- RTC data-channel delivery;
- provider cache mutation;
- model statement;
- generated receipt text.

Where no physical read-back exists, the receipt SHALL say UNVERIFIED unless another qualified sensor establishes state.
