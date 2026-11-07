/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.C3
TAG: LEEWAY.C3.PHYSICAL_USB_DEVICE_COMPOSITION_TEST
5WH:
  WHAT = Test canonical enrollment and dispatch bounds for existing Android ADB and Apple USB adapters
  WHY = USB-attached phones must be discoverable as distinct Device Bridge devices, not disguised as pc-primary
  WHO = LeeWay Industries / C3 qualification
  WHERE = tests/mcp/physical-usb-composition.test.mjs
  WHEN = 2026-11-07
  HOW = Real source composition and governed denial with controlled fixture identities, never fake physical success
LICENSE: Internal LeeWay governance.
*/
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createConfiguredBridge } from '../../apps/desktop/mcp-server.mjs';

const galaxy = { id: 'fold6-usb-test', type: 'physical-android', platform: 'android', serial: 'TESTADB1234',
  grants: ['device.health', 'device.info', 'device.apps.list'] };
const iphone = { id: 'iphone-usb-test', type: 'physical-apple', platform: 'ios',
  hardwareId: '00008030000C718C0E33402E', grants: ['device.health', 'device.info'] };

async function withConfig(devices, run) {
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'leeway-physical-usb-'));
  const configPath = path.join(folder, 'device-bridge.config.json');
  try {
    await fs.writeFile(configPath, JSON.stringify({ devices }));
    return await run(configPath);
  } finally {
    await fs.rm(folder, { recursive: true, force: true });
  }
}

test('two physical USB phones are distinct canonical Bridge devices with only supported capabilities', async () => {
  await withConfig([galaxy, iphone], async config => {
    const admissions = [];
    const receipts = [];
    const bridge = await createConfiguredBridge(config, {
      admission: async request => { admissions.push(request); return false; },
      receiptSink: async receipt => { receipts.push(receipt); }
    });
    assert.deepEqual([...bridge.devices.keys()], ['fold6-usb-test', 'iphone-usb-test']);
    const android = await bridge.discover('fold6-usb-test');
    const apple = await bridge.discover('iphone-usb-test');
    assert.deepEqual(android.capabilities.map(x => x.name), ['device.health', 'device.info', 'device.apps.list']);
    assert.deepEqual(apple.capabilities.map(x => x.name), ['device.health', 'device.info']);
    assert.equal(android.capabilities.every(x => x.verified === false), true);
    assert.equal(apple.capabilities.every(x => x.verified === false), true);
    const deniedAndroid = await bridge.call('fold6-usb-test', 'device.info', {});
    const deniedApple = await bridge.call('iphone-usb-test', 'device.info', {});
    assert.equal(deniedAndroid.ok, false);
    assert.equal(deniedAndroid.error, 'ADMISSION_DENIED');
    assert.equal(deniedApple.ok, false);
    assert.equal(deniedApple.error, 'ADMISSION_DENIED');
    assert.equal(admissions.length, 2);
    assert.equal(receipts.length, 2);
    assert.deepEqual(receipts.map(r => r.outcome), ['BLOCKED', 'BLOCKED']);
  });
});

test('USB entries reject missing IDs, swapped platforms and opportunistic substitution', async () => {
  const invalid = [
    { ...galaxy, serial: undefined },
    { ...galaxy, platform: 'ios' },
    { ...galaxy, serial: '../device' },
    { ...iphone, hardwareId: undefined },
    { ...iphone, platform: 'android' },
    { ...iphone, serial: 'TESTADB1234' },
    { ...galaxy, type: 'relay', url: 'https://example.invalid' }
  ];
  for (const device of invalid) {
    await withConfig([device], async config => {
      await assert.rejects(
        createConfiguredBridge(config, { admission: async () => true, receiptSink: async () => {} }),
        /Invalid|custom|identity|USB|ZodError/i
      );
    });
  }
});

test('physical device config can never authorize camera streaming through unrelated metadata capability', async () => {
  await withConfig([galaxy, iphone], async config => {
    const bridge = await createConfiguredBridge(config, {
      admission: async () => true, receiptSink: async () => {}
    });
    for (const id of ['fold6-usb-test', 'iphone-usb-test']) {
      const discovery = await bridge.discover(id);
      assert.equal(discovery.capabilities.some(x => x.name.startsWith('vision.')), false);
    }
    const attempted = await bridge.call('fold6-usb-test', 'vision.session.start', {
      clientId: 'test-model', deviceId: 'fold6-usb-test', physicalSensorId: 'rear'
    });
    assert.equal(attempted.ok, false);
    assert.equal(attempted.error, 'CAPABILITY_NOT_GRANTED');
  });
});
