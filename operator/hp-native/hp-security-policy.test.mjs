import test from "node:test";
import assert from "node:assert/strict";

import {
  DEVICE_ID,
  DENIED_CAPABILITIES,
  evaluateRemoteCommand
} from "./hp-security-policy.mjs";

test("HP identity claim is scoped", () => {
  assert.equal(DEVICE_ID, "pc-hp-secondary");
});

test("all declared remote capabilities deny", () => {
  for (const capability of DENIED_CAPABILITIES) {
    const result = evaluateRemoteCommand({
      capability,
      arguments: { path: "test" }
    });

    assert.equal(result.admitted, false);
    assert.equal(
      result.reason,
      "ENROLLMENT_AND_AUTHORIZATION_REQUIRED"
    );
  }
});

test("malformed commands deny", () => {
  for (const command of [
    null,
    undefined,
    {},
    [],
    { capability: "" },
    { capability: 1 }
  ]) {
    assert.equal(
      evaluateRemoteCommand(command).admitted,
      false
    );
  }
});

test("claimed authorization cannot bypass hold", () => {
  const result = evaluateRemoteCommand({
    capability: "device.files.write",
    authorized: true,
    identityVerified: true,
    issuerTrusted: true,
    constitutionApproved: true,
    arguments: {
      path: "test",
      content: "unauthorized"
    }
  });

  assert.equal(result.admitted, false);
});