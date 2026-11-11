import assert from 'node:assert/strict';
import fs from 'node:fs';
const source = fs.readFileSync('apps/android/app/src/main/java/industries/leeway/devicebridge/MainActivity.kt', 'utf8');
assert.match(source, /text = "••••••••••••••••"/);
assert.match(source, /contentDescription = "Pairing token hidden"/);
assert.match(source, /text = "SHOW PAIRING TOKEN"/);
assert.match(source, /pairingTokenView\.text = pairingToken/);
console.log('PASS pairing token is hidden until explicit owner reveal');
