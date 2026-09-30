# Existing relay adapter

`RelayAdapter` authenticates as an existing `client` with `{type:"hello",role:"client",deviceId,token}`. Only after `hello-ack` does it send `{type:"command",id,capability,arguments}`. It requires a matching command ID and capability, a successful outer result, and no nested explicit failure. Credentials never appear in returned errors or receipts. Connections have finite timeouts, bounded incoming payloads, no redirect following, and require TLS except an explicit loopback-only test option.

Discovery sends `device.capabilities` to the existing Android router and consumes its `remoteQualified` list. A new connection is established per query/command; there is no cached permission claim. This package neither changes nor deploys the relay, adds an operator bypass, or assumes a device is online because a token exists. See the protocol README for owner grants and actual test boundaries.
