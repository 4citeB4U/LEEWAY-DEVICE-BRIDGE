"""
LeeWay Native Apple Device Controller
Communicates with iOS devices via pymobiledevice3 CoreDevice and DVT services.
Supports both USB and Wi-Fi connections with automatic tunnel negotiation.
"""
import sys
import json
import asyncio
import os
import subprocess

def run_cli_cmd(cmd_args):
    result = subprocess.run([sys.executable, "-m", "pymobiledevice3"] + cmd_args, capture_output=True, text=True, check=False)
    return result

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"ok": False, "error": "MISSING_ACTION"}))
        sys.exit(1)

    action = sys.argv[1]

    if action == "info":
        res = run_cli_cmd(["lockdown", "info"])
        if res.returncode == 0:
            try:
                info = json.loads(res.stdout)
                print(json.dumps({
                    "ok": True,
                    "platform": "ios",
                    "udid": info.get("UniqueDeviceID"),
                    "deviceName": info.get("DeviceName"),
                    "productVersion": info.get("ProductVersion"),
                    "buildVersion": info.get("BuildVersion"),
                    "hardwareModel": info.get("HardwareModel"),
                    "cpuArchitecture": info.get("CPUArchitecture"),
                    "uiControl": True,
                    "transport": "USB_OR_WIFI_RSD"
                }))
            except Exception as e:
                print(json.dumps({"ok": False, "error": str(e), "raw": res.stdout}))
        else:
            print(json.dumps({"ok": False, "error": res.stderr.strip() or "LOCKDOWN_INFO_FAILED"}))

    elif action == "screenshot":
        out_path = sys.argv[2] if len(sys.argv) > 2 else "screenshot.png"
        res = run_cli_cmd(["developer", "dvt", "screenshot", out_path])
        if res.returncode == 0 and os.path.exists(out_path):
            print(json.dumps({"ok": True, "path": os.path.abspath(out_path), "bytes": os.path.getsize(out_path)}))
        else:
            print(json.dumps({"ok": False, "error": res.stderr.strip() or "SCREENSHOT_FAILED"}))

    elif action == "tap":
        # x and y can be 0..65535 or pixels (if < 1000 and < 2000, normalize to 828x1792)
        x = float(sys.argv[2])
        y = float(sys.argv[3])
        if x <= 828 and y <= 1792:
            norm_x = int((x / 828.0) * 65535)
            norm_y = int((y / 1792.0) * 65535)
        else:
            norm_x = int(x)
            norm_y = int(y)
        res = run_cli_cmd(["developer", "core-device", "universal-hid-service", "tap", str(norm_x), str(norm_y)])
        print(json.dumps({"ok": res.returncode == 0, "normX": norm_x, "normY": norm_y, "error": res.stderr.strip() if res.returncode != 0 else None}))

    elif action == "drag":
        x1 = float(sys.argv[2])
        y1 = float(sys.argv[3])
        x2 = float(sys.argv[4])
        y2 = float(sys.argv[5])
        if x1 <= 828 and y1 <= 1792 and x2 <= 828 and y2 <= 1792:
            nx1 = int((x1 / 828.0) * 65535)
            ny1 = int((y1 / 1792.0) * 65535)
            nx2 = int((x2 / 828.0) * 65535)
            ny2 = int((y2 / 1792.0) * 65535)
        else:
            nx1, ny1, nx2, ny2 = int(x1), int(y1), int(x2), int(y2)
        res = run_cli_cmd(["developer", "core-device", "universal-hid-service", "drag", str(nx1), str(ny1), str(nx2), str(ny2)])
        print(json.dumps({"ok": res.returncode == 0, "from": [nx1, ny1], "to": [nx2, ny2], "error": res.stderr.strip() if res.returncode != 0 else None}))

    elif action == "type":
        text = sys.argv[2] if len(sys.argv) > 2 else ""
        res = run_cli_cmd(["developer", "core-device", "universal-hid-service", "type", text])
        print(json.dumps({"ok": res.returncode == 0, "typed": text, "error": res.stderr.strip() if res.returncode != 0 else None}))

    elif action == "button":
        btn = sys.argv[2] if len(sys.argv) > 2 else "home"
        res = run_cli_cmd(["developer", "core-device", "hid", "button", btn, "press"])
        print(json.dumps({"ok": res.returncode == 0, "button": btn, "error": res.stderr.strip() if res.returncode != 0 else None}))

    elif action == "clipboard-read":
        res = run_cli_cmd(["developer", "core-device", "paste"])
        print(json.dumps({"ok": res.returncode == 0, "text": res.stdout, "error": res.stderr.strip() if res.returncode != 0 else None}))

    elif action == "clipboard-write":
        text = sys.argv[2] if len(sys.argv) > 2 else ""
        res = run_cli_cmd(["developer", "core-device", "copy", text])
        print(json.dumps({"ok": res.returncode == 0, "text": text, "error": res.stderr.strip() if res.returncode != 0 else None}))

    elif action == "proclist":
        res = run_cli_cmd(["developer", "dvt", "proclist"])
        if res.returncode == 0:
            try:
                # Find JSON array in output
                out = res.stdout.strip()
                start = out.find("[")
                if start >= 0:
                    procs = json.loads(out[start:])
                    print(json.dumps({"ok": True, "count": len(procs), "processes": procs}))
                else:
                    print(json.dumps({"ok": False, "error": "JSON_ARRAY_NOT_FOUND", "raw": out}))
            except Exception as e:
                print(json.dumps({"ok": False, "error": str(e)}))
        else:
            print(json.dumps({"ok": False, "error": res.stderr.strip() or "PROCLIST_FAILED"}))

    else:
        print(json.dumps({"ok": False, "error": "UNKNOWN_ACTION: " + action}))

if __name__ == "__main__":
    main()

