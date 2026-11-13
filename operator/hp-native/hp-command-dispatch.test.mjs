import test from "node:test";
import assert from "node:assert/strict";
import { dispatchRemoteCommand } from "./hp-command-dispatch.mjs";

test("remote filesystem write cannot invoke handler", async () => {
  let executed = false;

  const handlers = {
    "device.files.write": async () => {
      executed = true;
    }
  };

  const result = await dispatchRemoteCommand({
    capability: "device.files.write",
    authorized: true,
    identityVerified: true,
    issuerTrusted: true,
    constitutionApproved: true
  }, handlers);

  assert.equal(result.admitted, false);
  assert.equal(executed, false);
});

test("remote read cannot bypass enrollment hold", async () => {
  let executed = false;

  const result = await dispatchRemoteCommand({
    capability: "device.files.read"
  }, {
    "device.files.read": async () => {
      executed = true;
    }
  });

  assert.equal(result.admitted, false);
  assert.equal(executed, false);
});

test("unknown commands deny without effects", async () => {
  let executed = false;

  const result = await dispatchRemoteCommand({
    capability: "device.unknown"
  }, {
    "device.unknown": async () => {
      executed = true;
    }
  });

  assert.equal(result.ok, false);
  assert.equal(executed, false);
});

test("malformed commands fail closed", async () => {
  for (const command of [null, {}, [], undefined]) {
    const result = await dispatchRemoteCommand(command);
    assert.equal(result.admitted, false);
  }
});