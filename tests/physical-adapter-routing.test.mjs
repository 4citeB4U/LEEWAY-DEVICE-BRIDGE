import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parseAndroidUiSnapshot } from "../operator/physical-adapters.mjs";

const snapshot = parseAndroidUiSnapshot('<hierarchy><node class="android.widget.EditText" resource-id="com.google:id/search" text="Search" content-desc="" clickable="true" editable="true" focused="true" bounds="[10,20][400,80]"/></hierarchy>');
assert.equal(snapshot.ok, true);
assert.deepEqual(snapshot.nodes, [{ className: "android.widget.EditText", resourceId: "com.google:id/search", label: "Search", clickable: true, editable: true, focused: true, bounds: [10, 20, 400, 80] }]);
const android = await readFile(new URL("../operator/physical-adapters.mjs", import.meta.url), "utf8");
assert.match(android, /device\.ui\.snapshot/);
assert.match(android, /uiautomator/, "Android USB adapter must expose native semantic snapshots");
assert.match(android, /--udid/, "Apple controller calls must bind the enrolled UDID");
const apple = await readFile(new URL("../operator/apple-device-controller.py", import.meta.url), "utf8");
assert.match(apple, /TARGET_UDID/);
assert.match(apple, /--udid/);
console.log("PASS physical adapter semantic routing contract");
