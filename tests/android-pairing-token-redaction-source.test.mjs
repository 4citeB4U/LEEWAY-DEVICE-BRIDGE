import assert from 'node:assert/strict';
import fs from 'node:fs';
const source = fs.readFileSync('apps/android/app/src/main/java/industries/leeway/devicebridge/MainActivity.kt', 'utf8');
assert.match(source, /text = "••••••••••••••••"/);
assert.match(source, /text = "OWNER PAIRING SECRET"/);
assert.match(source, /COPY PAIRING TOKEN/);
assert.match(source, /ReceiptStore\.record\(this@MainActivity, "device\.pairing\.copy", "PASS", "Owner copied pairing token"\)/);
console.log('PASS pairing token is hidden and protected under owner copy receipt');
