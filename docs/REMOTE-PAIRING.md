# LeeWay Device Bridge Remote Pairing

GitHub Pages remains the canonical discovery, configuration and package authority.
The permanent online relay is transport-only and has no device execution authority.

## Phone

1. Install the current Android package from the Pages package manifest.
2. Open **LeeWay Device Bridge**.
3. Tap **ENABLE LOCAL AGENT SESSION**.
4. Tap **ENABLE ALWAYS-ON REMOTE BRIDGE**.
5. Tap **SHOW PAIRING TOKEN** only when pairing a trusted client.
6. Keep the foreground-service notification enabled for persistent reachability.

The phone reconnects automatically and restarts the remote messaging service after reboot
when the owner has left the remote bridge enabled.

## Client / LLM

A trusted client needs two owner-provided values:
- the phone's LeeWay Device ID
- the owner pairing token

These values are not published by GitHub Pages.
Connect to the relay URL from `remote-relay.json` and send:

```json
{"type":"hello","role":"client","deviceId":"<device-id>","token":"<owner-token>"}
```

After `hello-ack`, send a normalized capability:

```json
{"type":"command","id":"cmd-1","capability":"device.health","arguments":{}}
```

The relay only routes messages. The phone checks local Agent access and the
RemoteCommandRouter capability allow-list before execution.

## Current remote capability set

Read/inference capabilities are qualified first:
`device.health`, `device.info`, `device.capabilities`,
`device.bluetooth.list-bonded`, `device.network.discover`,
`device.receipts`, `model.status`, and `model.inference`.
