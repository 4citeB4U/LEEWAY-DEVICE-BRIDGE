import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../operator/hp-secondary-relay-agent.mjs", import.meta.url), "utf8");

assert.match(source, /WorkstationRelayAgent/);
assert.match(source, /HP_SECONDARY_LEGACY_ENTRYPOINT_RETIRED/);
assert.equal(source.includes("pc-hp-secondary"), false);
assert.equal(source.includes("192.168.1.101"), false);
assert.equal(source.includes("HP Laptop 15-dw0xxx"), false);
assert.equal(source.includes("biosSerialNumber"), false);
console.log("PASS legacy HP relay cannot encode a specific workstation");
