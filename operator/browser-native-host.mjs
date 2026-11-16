/* LEEWAY HEADER — DO NOT REMOVE | REGION: LEEWAY.DEVICE.BRIDGE.BROWSER_NATIVE_HOST | TAG: LEEWAY.BROWSER.NATIVE_HOST.V1 | WHO: LeeWay Industries | WHAT: Native Messaging session courier | WHY: Keep browser session authority behind the local enrolled host | WHERE: operator/browser-native-host.mjs | WHEN: 2026-11-16 | HOW: length-prefixed JSON and authenticated loopback broker | LICENSE: MIT */
const MAX_BYTES = 64 * 1024;
let buffer = Buffer.alloc(0);

function writeMessage(message) {
  const payload = Buffer.from(JSON.stringify(message), 'utf8');
  const header = Buffer.alloc(4); header.writeUInt32LE(payload.length, 0);
  process.stdout.write(Buffer.concat([header, payload]));
}

async function handle(message) {
  if (message?.type !== 'LEEWAY_BROWSER_SESSION_REQUEST' || typeof message.extensionId !== 'string') return writeMessage({ type: 'LEEWAY_BROWSER_ERROR', error: 'SESSION_REQUEST_INVALID' });
  const secret = process.env.LEEWAY_BROWSER_GATEWAY_SECRET;
  if (typeof secret !== 'string' || secret.length < 32) return writeMessage({ type: 'LEEWAY_BROWSER_ERROR', error: 'BROWSER_GATEWAY_SECRET_REQUIRED' });
  try {
    const response = await fetch(process.env.LEEWAY_BROWSER_GATEWAY_SESSION_URL || 'http://127.0.0.1:4280/native/session', {
      method: 'POST', headers: { authorization: `Bearer ${secret}`, 'content-type': 'application/json' },
      body: JSON.stringify({ extensionId: message.extensionId }),
    });
    const result = await response.json();
    writeMessage(response.ok ? result : { type: 'LEEWAY_BROWSER_ERROR', error: result.error || 'SESSION_BROKER_REJECTED' });
  } catch { writeMessage({ type: 'LEEWAY_BROWSER_ERROR', error: 'LOCAL_GATEWAY_OFFLINE' }); }
}

process.stdin.on('data', chunk => {
  buffer = Buffer.concat([buffer, chunk]);
  while (buffer.length >= 4) {
    const length = buffer.readUInt32LE(0);
    if (length < 2 || length > MAX_BYTES) { writeMessage({ type: 'LEEWAY_BROWSER_ERROR', error: 'NATIVE_MESSAGE_TOO_LARGE' }); process.exitCode = 1; return; }
    if (buffer.length < length + 4) return;
    const payload = buffer.subarray(4, length + 4); buffer = buffer.subarray(length + 4);
    try { void handle(JSON.parse(payload.toString('utf8'))); }
    catch { writeMessage({ type: 'LEEWAY_BROWSER_ERROR', error: 'NATIVE_MESSAGE_INVALID' }); }
  }
});
