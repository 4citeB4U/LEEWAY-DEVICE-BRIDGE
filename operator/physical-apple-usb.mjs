/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.RUNTIME.FABRIC.C3
TAG: LEEWAY.C3.APPLE_EXACT_USB_IDENTITY_V1
WHAT: Strict physical USB PnP identity selection for owner-qualified iPhone.
WHY: A generic Apple vendor/Bluetooth match must never satisfy target-specific proof.
WHO: Existing Runtime Fabric native read authority.
WHERE: operator/physical-apple-usb.mjs.
WHEN: 2026-10-23.
HOW: Exact USB\\VID_05AC&PID_XXXX\\<qualified-serial> plus real status and manufacturer.
AUTHORITY: READ_ONLY_PNP_IDENTITY; this alone is not native iOS execution admission.
LICENSE: MIT
*/
const expectedId = s => typeof s === 'string' && /^[0-9A-Z]{16,64}$/i.test(s);
export function selectQualifiedAppleUsbDevice(records, hardwareId) {
  if (!expectedId(hardwareId)) return null;
  const candidates = (Array.isArray(records) ? records : [records]).filter(record => {
    if (!record || typeof record !== 'object' || typeof record.DeviceID !== 'string') return false;
    const match = /^USB\\VID_05AC&PID_[0-9A-F]{4}\\([A-Z0-9]{16,64})$/i.exec(record.DeviceID);
    if (!match || match[1].toUpperCase() !== hardwareId.toUpperCase()) return false;
    if (record.Status !== 'OK') return false;
    if (typeof record.Manufacturer !== 'string' || !/^Apple(?:,? Inc\.?)?$/i.test(record.Manufacturer.trim())) return false;
    if (typeof record.Name !== 'string' || !/^(Apple Mobile Device|Apple iPhone)/i.test(record.Name)) return false;
    return true;
  });
  // Neither a guessed first record nor ambiguous multiple exact matches are sufficient.
  return candidates.length === 1 ? candidates[0] : null;
}
