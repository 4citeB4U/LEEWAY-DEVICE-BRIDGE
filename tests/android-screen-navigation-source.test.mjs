import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('accessibility screen capture declares Android screenshot capability', () => {
  const xml = fs.readFileSync(new URL('../apps/android/app/src/main/res/xml/leeway_accessibility_service.xml', import.meta.url), 'utf8');
  assert.match(xml, /android:canTakeScreenshot="true"/);
  assert.match(xml, /android:canRetrieveWindowContent="true"/);
  assert.match(xml, /android:canPerformGestures="true"/);
});

test('UI snapshot reports native screen bounds and visibility for grounded navigation', () => {
  const source = fs.readFileSync(new URL('../apps/android/app/src/main/java/industries/leeway/devicebridge/DeviceOperatorAccessibilityService.kt', import.meta.url), 'utf8');
  assert.match(source, /node\.getBoundsInScreen\(bounds\)/);
  assert.match(source, /put\("boundsInScreen", JSONObject\(\)\.apply/);
  for (const edge of ['left', 'top', 'right', 'bottom']) assert.ok(source.includes(`put("${edge}", bounds.${edge})`));
  assert.ok(source.includes('put("visibleToUser", node.isVisibleToUser)'));
  assert.match(source, /current \?: return blocked\("ACCESSIBILITY_SERVICE_NOT_ACTIVE"\)/);
});
