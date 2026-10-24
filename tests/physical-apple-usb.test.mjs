/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE
TAG: LEEWAY.C3.EXACT_APPLE_USB_IDENTITY_REGRESSION
WHO: Owner-authorized LeeWay Device Bridge engineering.
WHAT: Prevent PhysicalAppleAdapter reporting success for unrelated/missing devices.
WHEN: 2026-10-23.
WHERE: tests/physical-apple-usb.test.mjs.
WHY: Device Bridge physical identity cannot fall back to a vendor-wide guess.
HOW: Exact PnP serial, manufacturer, USB bus, status and ambiguity checks.
LICENSE: MIT
*/
import test from 'node:test';
import assert from 'node:assert/strict';
import {selectQualifiedAppleUsbDevice} from '../operator/physical-apple-usb.mjs';
const serial='00008030000C718C0E33402E';
const record={Name:'Apple Mobile Device USB Composite Device',
 Manufacturer:'Apple, Inc.',Status:'OK',DeviceID:'USB\\VID_05AC&PID_12A8\\'+serial};
test('exact Apple USB serial qualifies, not generic vendor',()=>{
 assert.equal(selectQualifiedAppleUsbDevice([record],serial),record);
 assert.equal(selectQualifiedAppleUsbDevice([record],'222222222222222222222222'),null);
 assert.equal(selectQualifiedAppleUsbDevice([{...record,DeviceID:'USB\\VID_05AC&PID_12A8\\222222222222222222222222'}],serial),null);
});
test('Bluetooth and non-USB Apple devices are excluded',()=>{
 assert.equal(selectQualifiedAppleUsbDevice([{...record,DeviceID:'BTHLEDEVICE\\VID_05AC\\'+serial}],serial),null);
 assert.equal(selectQualifiedAppleUsbDevice([{...record,DeviceID:'ROOT\\VID_05AC&PID_12A8\\'+serial}],serial),null);
});
test('status, manufacturer, name and duplicate identities fail closed',()=>{
 for(const altered of [
  {...record,Status:'Unknown'},
  {...record,Manufacturer:'Microsoft'},
  {...record,Name:'Generic Bluetooth Device'}
 ])assert.equal(selectQualifiedAppleUsbDevice([altered],serial),null);
 assert.equal(selectQualifiedAppleUsbDevice([record,record],serial),null);
 assert.equal(selectQualifiedAppleUsbDevice(null,serial),null);
});
