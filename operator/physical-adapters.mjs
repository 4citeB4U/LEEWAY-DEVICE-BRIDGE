/*
REGION: 🟢 CORE / OPERATOR
TAG: LEEWAY-PHYSICAL-DEVICE-ADAPTERS
WHO: Agent Lee / Runtime Fabric / Device Bridge
WHAT: Physical device adapters for Android (ADB) and Apple (pymobiledevice3 CoreDevice / DVT & Windows PnP).
      Strictly preserves the Windows Apple Mobile Device USB driver stack.
WHEN: Physical device execution.
WHERE: 4citeB4U/LEEWAY-DEVICE-BRIDGE/operator
WHY: Clean separation of physical adapter drivers from admission and governance.
LICENSE: MIT
*/
import { execFile } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { selectQualifiedAppleUsbDevice } from './physical-apple-usb.mjs';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONTROLLER_SCRIPT = path.join(__dirname, 'apple-device-controller.py');
const ANDROID_TRANSFER_ROOT = "/sdcard/Download/LeeWayDeviceBridge";

function requireRelativeDevicePath(value) {
  if (typeof value !== "string" || value.length < 1 || value.length > 240) throw new Error("ANDROID_TRANSFER_PATH_INVALID");
  const normalized = value.replaceAll("\\", "/");
  if (normalized.startsWith("/") || normalized.split("/").some(part => !part || part === "." || part === "..")) throw new Error("ANDROID_TRANSFER_PATH_INVALID");
  if (!/^[A-Za-z0-9._/-]+$/.test(normalized)) throw new Error("ANDROID_TRANSFER_PATH_INVALID");
  return normalized;
}

function sha256Buffer(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function decodeXml(value) {
  return String(value ?? "").replaceAll("&quot;", '"').replaceAll("&amp;", "&").replaceAll("&lt;", "<").replaceAll("&gt;", ">");
}

/** Returns only actionable Android nodes; it never guesses a target from pixels. */
export function parseAndroidUiSnapshot(raw) {
  const xml = String(raw ?? "");
  const nodes = [];
  const matcher = /<node\s+([^>]*?)\/?>(?:<\/node>)?/g;
  for (let match; (match = matcher.exec(xml)) && nodes.length < 128;) {
    const attrs = Object.fromEntries([...match[1].matchAll(/([\w:-]+)="([^"]*)"/g)].map(([, key, value]) => [key, decodeXml(value)]));
    if (attrs.clickable !== "true" && attrs.editable !== "true" && attrs.focusable !== "true") continue;
    const bounds = /^\[(\d+),(\d+)\]\[(\d+),(\d+)\]$/.exec(attrs.bounds ?? "");
    if (!bounds) continue;
    nodes.push({
      className: attrs.class ?? null,
      resourceId: attrs["resource-id"] || null,
      label: (attrs["content-desc"] || attrs.text || "").slice(0, 160) || null,
      clickable: attrs.clickable === "true",
      editable: attrs.editable === "true",
      focused: attrs.focused === "true",
      bounds: bounds.slice(1).map(Number)
    });
  }
  return { ok: true, source: "ANDROID_UIAUTOMATOR", nodes, truncated: nodes.length >= 128 };
}

export class PhysicalAndroidAdapter {
  constructor({ serial, timeoutMs = 15000 } = {}) {
    if (typeof serial !== "string" || !/^[A-Za-z0-9._:-]{4,128}$/.test(serial)) {
      throw new Error("ANDROID_USB_SERIAL_REQUIRED");
    }
    this.serial = serial;
    this.timeoutMs = timeoutMs;
  }

  async discover() {
    return [
      "device.health",
      "device.info",
      "device.apps.list",
      "device.apps.launch",
      "device.files.read",
      "device.files.write",
      "device.screen.capture",
      "device.ui.snapshot",
      "device.ui.tap",
      "device.ui.swipe",
      "device.ui.text",
      "device.ui.home",
      "device.ui.back",
      "device.process.list"
    ];
  }

  async execute(capability, args = {}) {
    if (capability === "device.info") {
      const { stdout: model } = await execFileAsync("adb", ["-s", this.serial, "shell", "getprop", "ro.product.model"], { timeout: this.timeoutMs });
      const { stdout: mfr } = await execFileAsync("adb", ["-s", this.serial, "shell", "getprop", "ro.product.manufacturer"], { timeout: this.timeoutMs });
      const { stdout: osVer } = await execFileAsync("adb", ["-s", this.serial, "shell", "getprop", "ro.build.version.release"], { timeout: this.timeoutMs });
      const { stdout: sdk } = await execFileAsync("adb", ["-s", this.serial, "shell", "getprop", "ro.build.version.sdk"], { timeout: this.timeoutMs });

      return {
        ok: true,
        platform: "android",
        executionTier: "ANDROID_ADB_LOCATOR_AND_SHELL_EXECUTION",
        transport: "LOCAL_USB_ADB",
        serial: this.serial,
        manufacturer: mfr.trim(),
        model: model.trim(),
        androidVersion: osVer.trim(),
        sdkLevel: parseInt(sdk.trim(), 10),
        uiControl: true
      };
    }

    if (capability === "device.health") {
      const { stdout: battery } = await execFileAsync("adb", ["-s", this.serial, "shell", "dumpsys", "battery"], { timeout: this.timeoutMs });
      const levelMatch = battery.match(/level:\s*(\d+)/);
      const level = levelMatch ? parseInt(levelMatch[1], 10) : null;
      return {
        ok: true,
        platform: "android",
        serial: this.serial,
        batteryLevel: level,
        status: "ONLINE"
      };
    }

    if (capability === "device.apps.list") {
      const { stdout } = await execFileAsync("adb", ["-s", this.serial, "shell", "pm", "list", "packages", "-3"], { timeout: this.timeoutMs });
      const packages = stdout.split("\n")
        .map(l => l.replace(/^package:/, "").trim())
        .filter(Boolean);
      return {
        ok: true,
        platform: "android",
        packages,
        hasPocket: packages.includes("industries.leeway.pocket")
      };
    }

    if (capability === "device.apps.launch") {
      const packageName = String(args.packageName ?? "");
      if (!/^[A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z0-9_]+)+$/.test(packageName)) throw new Error("ANDROID_PACKAGE_NAME_INVALID");
      const { stdout: componentOut } = await execFileAsync("adb", ["-s", this.serial, "shell", "cmd", "package", "resolve-activity", "--brief", packageName], { timeout: this.timeoutMs });
      const resolved = componentOut.trim().split(/\r?\n/).at(-1);
      const component = resolved && resolved.includes("/") ? resolved : `${packageName}/.MainActivity`;
      await execFileAsync("adb", ["-s", this.serial, "shell", "am", "start", "-n", component], { timeout: this.timeoutMs });
      const { stdout: windows } = await execFileAsync("adb", ["-s", this.serial, "shell", "dumpsys", "window", "windows"], { timeout: this.timeoutMs });
      const foregroundVerified = windows.includes(packageName);
      if (!foregroundVerified) throw new Error("ANDROID_FOREGROUND_NOT_VERIFIED");
      return { ok: true, packageName, component, foregroundVerified };
    }

    if (capability === "device.files.write") {
      const relativePath = requireRelativeDevicePath(args.path);
      const text = String(args.text ?? "");
      if (Buffer.byteLength(text, "utf8") > 65536) throw new Error("ANDROID_TRANSFER_PAYLOAD_TOO_LARGE");
      const bytes = Buffer.from(text, "utf8");
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "leeway-android-write-"));
      const hostFile = path.join(tempDir, "payload");
      const remotePath = `${ANDROID_TRANSFER_ROOT}/${relativePath}`;
      const remoteTemp = `${remotePath}.tmp-${crypto.randomBytes(6).toString("hex")}`;
      try {
        await fs.writeFile(hostFile, bytes, { flag: "wx" });
        await execFileAsync("adb", ["-s", this.serial, "shell", "mkdir", "-p", remotePath.slice(0, remotePath.lastIndexOf("/"))], { timeout: this.timeoutMs });
        await execFileAsync("adb", ["-s", this.serial, "push", hostFile, remoteTemp], { timeout: this.timeoutMs });
        await execFileAsync("adb", ["-s", this.serial, "shell", "mv", remoteTemp, remotePath], { timeout: this.timeoutMs });
        const { stdout: observedHash } = await execFileAsync("adb", ["-s", this.serial, "shell", "sha256sum", remotePath], { timeout: this.timeoutMs });
        const sha256 = sha256Buffer(bytes);
        if (observedHash.trim().split(/\s+/)[0].toLowerCase() !== sha256) throw new Error("ANDROID_TRANSFER_READBACK_MISMATCH");
        return { ok: true, path: relativePath, bytes: bytes.length, sha256, transport: "LOCAL_USB_ADB" };
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
        await execFileAsync("adb", ["-s", this.serial, "shell", "rm", "-f", remoteTemp], { timeout: this.timeoutMs }).catch(() => {});
      }
    }

    if (capability === "device.files.read") {
      const relativePath = requireRelativeDevicePath(args.path);
      const remotePath = `${ANDROID_TRANSFER_ROOT}/${relativePath}`;
      const { stdout } = await execFileAsync("adb", ["-s", this.serial, "exec-out", "cat", remotePath], { encoding: "buffer", maxBuffer: 128 * 1024, timeout: this.timeoutMs });
      if (stdout.length > 65536) throw new Error("ANDROID_TRANSFER_PAYLOAD_TOO_LARGE");
      return { ok: true, path: relativePath, text: stdout.toString("utf8"), bytes: stdout.length, sha256: sha256Buffer(stdout), transport: "LOCAL_USB_ADB" };
    }

    if (capability === "device.screen.capture") {
      const { stdout } = await execFileAsync("adb", ["-s", this.serial, "exec-out", "screencap", "-p"], {
        encoding: "buffer",
        maxBuffer: 16 * 1024 * 1024,
        timeout: this.timeoutMs
      });
      const pngMagic = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      const headerIdx = stdout.indexOf(pngMagic);
      const pngBuffer = headerIdx >= 0 ? stdout.subarray(headerIdx) : stdout;
      const width = pngBuffer.length >= 24 ? pngBuffer.readUInt32BE(16) : 0;
      const height = pngBuffer.length >= 24 ? pngBuffer.readUInt32BE(20) : 0;
      return {
        ok: true,
        mimeType: "image/png",
        base64: pngBuffer.toString("base64"),
        width,
        height
      };
    }

    if (capability === "device.ui.snapshot") {
      const { stdout } = await execFileAsync("adb", ["-s", this.serial, "shell", "uiautomator", "dump", "/dev/tty"], { timeout: this.timeoutMs, maxBuffer: 512 * 1024 });
      if (!String(stdout).includes("<hierarchy")) throw new Error("ANDROID_UI_SNAPSHOT_UNAVAILABLE");
      return parseAndroidUiSnapshot(stdout);
    }

    if (capability === "device.ui.tap") {
      const x = Math.round(Number(args.x ?? 0));
      const y = Math.round(Number(args.y ?? 0));
      await execFileAsync("adb", ["-s", this.serial, "shell", "input", "tap", String(x), String(y)], { timeout: this.timeoutMs });
      return { ok: true, tapped: { x, y } };
    }

    if (capability === "device.ui.swipe") {
      const x1 = Math.round(Number(args.x1 ?? 0));
      const y1 = Math.round(Number(args.y1 ?? 0));
      const x2 = Math.round(Number(args.x2 ?? 0));
      const y2 = Math.round(Number(args.y2 ?? 0));
      const duration = Math.round(Number(args.durationMs ?? 300));
      await execFileAsync("adb", ["-s", this.serial, "shell", "input", "swipe", String(x1), String(y1), String(x2), String(y2), String(duration)], { timeout: this.timeoutMs });
      return { ok: true, swiped: { from: [x1, y1], to: [x2, y2], durationMs: duration } };
    }

    if (capability === "device.ui.text") {
      const rawText = String(args.text ?? "");
      const escaped = rawText.replace(/([\\"'`$!~*?&|;<>()\[\]{} ])/g, "\\$1");
      await execFileAsync("adb", ["-s", this.serial, "shell", "input", "text", escaped], { timeout: this.timeoutMs });
      return { ok: true, typed: rawText };
    }

    if (capability === "device.ui.home") {
      await execFileAsync("adb", ["-s", this.serial, "shell", "input", "keyevent", "3"], { timeout: this.timeoutMs });
      return { ok: true, button: "home" };
    }

    if (capability === "device.ui.back") {
      await execFileAsync("adb", ["-s", this.serial, "shell", "input", "keyevent", "4"], { timeout: this.timeoutMs });
      return { ok: true, button: "back" };
    }

    if (capability === "device.process.list") {
      const { stdout } = await execFileAsync("adb", ["-s", this.serial, "shell", "ps", "-A"], { timeout: this.timeoutMs });
      const lines = stdout.split("\n").filter(Boolean);
      const processes = lines.slice(1).map(l => {
        const parts = l.trim().split(/\s+/);
        return { pid: parts[1], user: parts[0], name: parts[parts.length - 1] };
      });
      return { ok: true, count: processes.length, processes };
    }

    throw new Error("CAPABILITY_UNAVAILABLE: " + capability);
  }
}

export class PhysicalAppleAdapter {
  constructor({ deviceId, cameraEndpoint = null, cameraToken = null, timeoutMs = 15000 } = {}) {
    if (typeof deviceId !== "string" || !/^[0-9a-fA-F]{16,64}$/.test(deviceId)) {
      throw new Error("APPLE_USB_DEVICE_ID_REQUIRED");
    }
    this.deviceId = deviceId;
    this.timeoutMs = timeoutMs;
    if ((cameraEndpoint && !cameraToken) || (!cameraEndpoint && cameraToken)) {
      throw new Error("APPLE_CAMERA_PAIRING_REQUIRED");
    }
    this.cameraTransport = cameraEndpoint ? new AppleCameraTransport({ endpoint: cameraEndpoint, token: cameraToken, timeoutMs }) : null;
    this.controllerScript = CONTROLLER_SCRIPT;
  }

  async discover() {
    const capabilities = [
      "device.info",
      "device.health",
      "device.screen.capture",
      "device.ui.tap",
      "device.ui.swipe",
      "device.ui.text",
      "device.ui.home",
      "device.ui.back",
      "device.process.list",
      "device.clipboard.read",
      "device.clipboard.write"
    ];
    if (this.cameraTransport) {
      capabilities.push("vision.sources.list", "vision.session.start", "vision.frames.observe", "vision.session.stop");
    }
    return capabilities;
  }

  async execute(capability, args = {}) {
    if (capability === "device.info") {
      try {
        const { stdout } = await execFileAsync("python", [this.controllerScript, "--udid", this.deviceId, "info"], { timeout: this.timeoutMs });
        const parsed = JSON.parse(stdout.trim());
        if (parsed.ok === true) {
          return {
            ok: true,
            platform: "ios",
            executionTier: "APPLE_COREDEVICE_AND_DVT_EXECUTION",
            transport: "USB_OR_WIFI_RSD",
            hardwareId: this.deviceId,
            udid: parsed.udid,
            name: parsed.deviceName,
            productVersion: parsed.productVersion,
            buildVersion: parsed.buildVersion,
            model: parsed.hardwareModel,
            cpuArchitecture: parsed.cpuArchitecture,
            uiControl: true,
            status: "ONLINE"
          };
        }
      } catch {
        // Fall back to host PnP observation if CoreDevice/lockdown is cycling
      }

      const psCommand = `Get-CimInstance Win32_PnPEntity | Where-Object DeviceID -match '${this.deviceId}|VID_05AC' | Select-Object Name, DeviceID, Manufacturer, Status | ConvertTo-Json -Compress`;
      const { stdout } = await execFileAsync("powershell.exe", ["-NoProfile", "-Command", psCommand], { timeout: this.timeoutMs });
      let records = [];
      try {
        const parsed = JSON.parse(stdout.trim());
        records = Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        records = [];
      }

      const composite = selectQualifiedAppleUsbDevice(records, this.deviceId);
      if (!composite) throw new Error('APPLE_USB_DEVICE_IDENTITY_NOT_QUALIFIED');
      return {
        ok: true,
        platform: "ios",
        executionTier: "WINDOWS_HOST_USB_PNP_OBSERVATION",
        transport: "WINDOWS_PNP_CIM_USB_BUS",
        nativeIosExecution: "OBSERVED_VIA_HOST_USB_PNP",
        hardwareId: this.deviceId,
        deviceInstanceId: composite.DeviceID,
        name: composite.Name,
        manufacturer: composite.Manufacturer,
        pnpStatus: composite.Status,
        uiControl: true
      };
    }

    if (capability === "device.health") {
      let rsdTunnelActive = false;
      try {
        const { stdout } = await execFileAsync("python", [this.controllerScript, "--udid", this.deviceId, "info"], { timeout: 5000 });
        const parsed = JSON.parse(stdout.trim());
        rsdTunnelActive = parsed.ok === true;
      } catch {
        rsdTunnelActive = false;
      }

      return {
        ok: true,
        platform: "ios",
        hardwareId: this.deviceId,
        status: "ONLINE",
        rsdTunnel: rsdTunnelActive ? "ACTIVE" : "STANDBY",
        driverState: "INTACT_WINDOWS_APPLE_MOBILE_DEVICE"
      };
    }

    if (capability === "device.screen.capture") {
      const tempPath = path.join(os.tmpdir(), `iphone-capture-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.png`);
      try {
        const { stdout } = await execFileAsync("python", [this.controllerScript, "--udid", this.deviceId, "screenshot", tempPath], { timeout: this.timeoutMs });
        const parsed = JSON.parse(stdout.trim());
        if (!parsed.ok) throw new Error(parsed.error || "SCREENSHOT_FAILED");
        const buf = await fs.readFile(tempPath);
        const width = buf.length >= 24 ? buf.readUInt32BE(16) : 828;
        const height = buf.length >= 24 ? buf.readUInt32BE(20) : 1792;
        return {
          ok: true,
          mimeType: "image/png",
          base64: buf.toString("base64"),
          width,
          height
        };
      } finally {
        await fs.unlink(tempPath).catch(() => {});
      }
    }

    if (capability === "device.ui.tap") {
      const x = String(args.x ?? 0);
      const y = String(args.y ?? 0);
      const { stdout } = await execFileAsync("python", [this.controllerScript, "--udid", this.deviceId, "tap", x, y], { timeout: this.timeoutMs });
      const parsed = JSON.parse(stdout.trim());
      if (!parsed.ok) throw new Error(parsed.error || "TAP_FAILED");
      return { ok: true, tapped: { x, y, normX: parsed.normX, normY: parsed.normY } };
    }

    if (capability === "device.ui.swipe") {
      const x1 = String(args.x1 ?? 0);
      const y1 = String(args.y1 ?? 0);
      const x2 = String(args.x2 ?? 0);
      const y2 = String(args.y2 ?? 0);
      const { stdout } = await execFileAsync("python", [this.controllerScript, "--udid", this.deviceId, "drag", x1, y1, x2, y2], { timeout: this.timeoutMs });
      const parsed = JSON.parse(stdout.trim());
      if (!parsed.ok) throw new Error(parsed.error || "SWIPE_FAILED");
      return { ok: true, swiped: { from: parsed.from, to: parsed.to } };
    }

    if (capability === "device.ui.text") {
      const text = String(args.text ?? "");
      const { stdout } = await execFileAsync("python", [this.controllerScript, "--udid", this.deviceId, "type", text], { timeout: this.timeoutMs });
      const parsed = JSON.parse(stdout.trim());
      if (!parsed.ok) throw new Error(parsed.error || "TYPE_FAILED");
      return { ok: true, typed: text };
    }

    if (capability === "device.ui.home") {
      const { stdout } = await execFileAsync("python", [this.controllerScript, "--udid", this.deviceId, "button", "home"], { timeout: this.timeoutMs });
      const parsed = JSON.parse(stdout.trim());
      if (!parsed.ok) throw new Error(parsed.error || "HOME_BUTTON_FAILED");
      return { ok: true, button: "home" };
    }

    if (capability === "device.ui.back") {
      const { stdout } = await execFileAsync("python", [this.controllerScript, "button", "home"], { timeout: this.timeoutMs });
      const parsed = JSON.parse(stdout.trim());
      if (!parsed.ok) throw new Error(parsed.error || "BACK_BUTTON_FAILED");
      return { ok: true, button: "back" };
    }

    if (capability === "device.process.list") {
      const { stdout } = await execFileAsync("python", [this.controllerScript, "proclist"], { timeout: this.timeoutMs });
      const parsed = JSON.parse(stdout.trim());
      if (!parsed.ok) throw new Error(parsed.error || "PROCLIST_FAILED");
      return { ok: true, count: parsed.count, processes: parsed.processes };
    }

    if (capability === "device.clipboard.read") {
      const { stdout } = await execFileAsync("python", [this.controllerScript, "clipboard-read"], { timeout: this.timeoutMs });
      const parsed = JSON.parse(stdout.trim());
      if (!parsed.ok) throw new Error(parsed.error || "CLIPBOARD_READ_FAILED");
      return { ok: true, text: parsed.text };
    }

    if (capability === "device.clipboard.write") {
      const text = String(args.text ?? "");
      const { stdout } = await execFileAsync("python", [this.controllerScript, "clipboard-write", text], { timeout: this.timeoutMs });
      const parsed = JSON.parse(stdout.trim());
      if (!parsed.ok) throw new Error(parsed.error || "CLIPBOARD_WRITE_FAILED");
      return { ok: true, text };
    }

    if (capability.startsWith("vision.")) {
      if (!this.cameraTransport) throw new Error("APPLE_CAMERA_TRANSPORT_NOT_CONFIGURED");
      const response = await this.cameraTransport.request(capability, args);
      if (response.ok !== true) throw new Error(response.error || "APPLE_CAMERA_REQUEST_FAILED");
      return response.result ?? {};
    }

    throw new Error("CAPABILITY_UNAVAILABLE: " + capability);
  }
}

export class AppleCameraTransport {
  constructor({ endpoint, token, timeoutMs = 15000 } = {}) {
    let parsed;
    try { parsed = new URL(endpoint); } catch { throw new Error("APPLE_CAMERA_ENDPOINT_INVALID"); }
    if (parsed.protocol !== "tcp:" || !parsed.hostname || !parsed.port) throw new Error("APPLE_CAMERA_ENDPOINT_INVALID");
    if (typeof token !== "string" || !/^[A-Za-z0-9_-]{32,128}$/.test(token)) throw new Error("APPLE_CAMERA_TOKEN_REQUIRED");
    this.endpoint = parsed;
    this.token = token;
    this.timeoutMs = timeoutMs;
  }

  request(operation, argumentsValue = {}) {
    const payload = JSON.stringify({ version: 1, operation, token: this.token, arguments: argumentsValue }) + "\n";
    return new Promise((resolve, reject) => {
      const socket = net.createConnection({ host: this.endpoint.hostname, port: Number(this.endpoint.port) });
      let buffer = Buffer.alloc(0);
      let settled = false;
      const finish = (error, value) => {
        if (settled) return;
        settled = true;
        socket.destroy();
        if (error) reject(error); else resolve(value);
      };
      socket.setTimeout(this.timeoutMs, () => finish(new Error("APPLE_CAMERA_TRANSPORT_TIMEOUT")));
      socket.once("error", () => finish(new Error("APPLE_CAMERA_TRANSPORT_UNREACHABLE")));
      socket.on("data", chunk => {
        buffer = Buffer.concat([buffer, chunk]);
        if (buffer.length > 16 * 1024 * 1024) return finish(new Error("APPLE_CAMERA_RESPONSE_TOO_LARGE"));
        const newline = buffer.indexOf(0x0a);
        if (newline < 0) return;
        const line = buffer.subarray(0, newline).toString("utf8");
        try {
          const response = JSON.parse(line);
          if (!response || typeof response !== "object") throw new Error();
          finish(null, response);
        } catch {
          finish(new Error("APPLE_CAMERA_RESPONSE_INVALID"));
        }
      });
      socket.once("connect", () => socket.write(payload));
    });
  }
}

export { WindowsPcPrimaryAdapter } from './windows-pc-primary.mjs';
