import test from "node:test";
import assert from "node:assert/strict";
import { attachCommandReceiver } from "./hp-native-command-receiver.mjs";

function makeSocket() {
  const listeners = new Map();
  const sent = [];

  return {
    sent,
    addEventListener(type, fn) { listeners.set(type, fn); },
    send(data) { sent.push(JSON.parse(data)); },
    async receive(msg) {
      const fn = listeners.get("message");
      await fn({ data: typeof msg === "string"
        ? msg : JSON.stringify(msg) });
    }
  };
}

test("actual wire command reaches denial dispatcher", async () => {
  const socket = makeSocket();
  let fileWritten = false;

  attachCommandReceiver(socket, {
    "device.files.write": async () => {
      fileWritten = true;
    }
  });

  await socket.receive({
    type: "command",
    id: "hp-test-001",
    capability: "device.files.write",
    authorized: true,
    identityVerified: true,
    issuerTrusted: true,
    arguments: { path: "forbidden", content: "bad" }
  });

  assert.equal(fileWritten, false);
  assert.equal(socket.sent.length, 1);
  assert.equal(socket.sent[0].type, "result");
  assert.equal(socket.sent[0].id, "hp-test-001");
  assert.equal(socket.sent[0].ok, false);
  assert.equal(socket.sent[0].result.admitted, false);
});

test("read command also denies before handler", async () => {
  const socket = makeSocket();
  let fileRead = false;

  attachCommandReceiver(socket, {
    "device.files.read": async () => {
      fileRead = true;
    }
  });

  await socket.receive({
    type: "command",
    id: "hp-test-002",
    capability: "device.files.read"
  });

  assert.equal(fileRead, false);
  assert.equal(socket.sent[0].ok, false);
});

test("malformed and unrelated frames do not dispatch", async () => {
  const socket = makeSocket();
  attachCommandReceiver(socket);

  await socket.receive("{not-json");
  await socket.receive({ type: "hello-ack" });
  await socket.receive({ type: "result", id: "x" });
  await socket.receive({ type: "command", capability: "device.info" });

  assert.equal(socket.sent.length, 0);
});

test("socket interface is required", () => {
  assert.throws(() => attachCommandReceiver(null));
  assert.throws(() => attachCommandReceiver({ send() {} }));
});