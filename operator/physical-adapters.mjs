/*
REGION: 🟢 CORE / OPERATOR
TAG: LEEWAY-PHYSICAL-DEVICE-ADAPTERS
WHO: Agent Lee / Runtime Fabric / Device Bridge
WHAT: Physical device adapters for Android (ADB) and Apple (Windows PnP).
      Strictly preserves the Windows Apple Mobile Device USB driver stack.
WHEN: Physical device execution.
WHERE: 4citeB4U/LEEWAY-DEVICE-BRIDGE/operator
WHY: Clean separation of physical adapter drivers from admission and governance.
LICENSE: MIT
*/
import { execFile } from "node:child_process";
import net from "node:net";
import { promisify } from "node:util";
import { selectQualifiedAppleUsbDevice } from './physical-apple-usb.mjs';

const execFileAsync = promisify(execFile);

export class PhysicalAndroidAdapter {
  constructor({ serial, timeoutMs = 15000 } = {}) {
    if (typeof serial !== "string" || !/^[A-Za-z0-9._:-]{4,128}$/.test(serial)) {
      throw new Error("ANDROID_USB_SERIAL_REQUIRED");
    }
    this.serial = serial;
    this.timeoutMs = timeoutMs;
  }

  async discover() {
    return ["device.health", "device.info", "device.apps.list"];
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
        uiControl: false
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
  }

  async discover() {
    const capabilities = ["device.info", "device.health"];
    if (this.cameraTransport) {
      capabilities.push("vision.sources.list", "vision.session.start", "vision.frames.observe", "vision.session.stop");
    }
    return capabilities;
  }

  async execute(capability, args = {}) {
    if (capability === "device.info") {
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
        nativeIosExecution: "NOT_PERFORMED_HOST_USB_OBSERVATION_ONLY",
        hardwareId: this.deviceId,
        deviceInstanceId: composite.DeviceID,
        name: composite.Name,
        manufacturer: composite.Manufacturer,
        pnpStatus: composite.Status,
        uiControl: false
      };
    }

    if (capability === "device.health") {
      const identity = await this.execute('device.info', {});
      return {
        ok: true,
        platform: "ios",
        deviceInstanceId: identity.deviceInstanceId,
        hardwareId: this.deviceId,
        status: "PRESENT_ON_USB_BUS",
        driverState: "INTACT_WINDOWS_APPLE_MOBILE_DEVICE"
      };
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

/**
 * Small, owner-bound client for the iOS native camera provider. The endpoint
 * and token are deployment bindings supplied outside the repository; there is
 * no default relay, host, or credential.
 */
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

// Kept as a separate source-bound implementation so the existing Android and
// Apple transports retain their current contracts. Runtime host composition may
// import this adapter after it has injected the owner passport trust registry.
export { WindowsPcPrimaryAdapter } from './windows-pc-primary.mjs';
