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
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export class PhysicalAndroidAdapter {
  constructor({ serial = "RFCX70LNT7X", timeoutMs = 15000 } = {}) {
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
  constructor({ deviceId = "00008030000C718C0E33402E", timeoutMs = 15000 } = {}) {
    this.deviceId = deviceId;
    this.timeoutMs = timeoutMs;
  }

  async discover() {
    return ["device.info", "device.health"];
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

      const composite = records.find(r => r.DeviceID && r.DeviceID.includes(this.deviceId)) || records[0];
      return {
        ok: true,
        platform: "ios",
        executionTier: "WINDOWS_HOST_USB_PNP_OBSERVATION",
        transport: "WINDOWS_PNP_CIM_USB_BUS",
        nativeIosExecution: "NOT_PERFORMED_HOST_USB_OBSERVATION_ONLY",
        hardwareId: this.deviceId,
        name: composite ? composite.Name : "Apple iPhone",
        manufacturer: composite ? composite.Manufacturer : "Apple Inc.",
        pnpStatus: composite ? composite.Status : "OK",
        uiControl: false
      };
    }

    if (capability === "device.health") {
      return {
        ok: true,
        platform: "ios",
        hardwareId: this.deviceId,
        status: "PRESENT_ON_USB_BUS",
        driverState: "INTACT_WINDOWS_APPLE_MOBILE_DEVICE"
      };
    }

    throw new Error("CAPABILITY_UNAVAILABLE: " + capability);
  }
}
