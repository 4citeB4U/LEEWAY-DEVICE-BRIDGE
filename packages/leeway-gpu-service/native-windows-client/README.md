# LeeWay Edge GPU — Windows application SDK

LEEWAY HEADER — DO NOT REMOVE

This is the **explicit application integration** lane. Windows applications can link to the first-party `leeway_gpu_winclient.dll` C ABI, or Node/Electron applications can use `runLeeWaySoftwareGraphicsDiagnostic` in the existing service client. The API calls LeeWay at **127.0.0.1 only**, never a remote service and never a vendor GPU.

The native WinHTTP SDK provides `LeeWayGpuClientAbiVersion`, `LeeWayGpuQueryStatus`, and `LeeWayGpuRunSoftwareDiagnostic`. Each call receives its JSON result in caller-owned UTF-8 memory and reports insufficient buffer capacity without overrunning the caller. The diagnostic method obtains the existing local service CSRF control token, invokes the first-party software-graphics command test through the existing LeeWay service, and refuses responses that claim production authority or Windows GPU registration.

Build:

```powershell
cmake -S packages/leeway-gpu-service/native-windows-client -B build/winclient -G "Visual Studio 17 2022" -A x64
cmake --build build/winclient --config Release
```

The test program `leeway_gpu_winclient_test.exe` calls the actual client DLL and checks the service result. Its default endpoint is `127.0.0.1:4180`, running the original GPU lab DLL installed under the LeeWay application directory on Agent-Lee. The GitHub Windows workflow builds the same reviewed GPU source and runs an independently hosted full DLL → HTTP → native software engine roundtrip.

For Node/Electron consumers, the existing `client.mjs` now exports `runLeeWaySoftwareGraphicsDiagnostic({endpoint})` with the same fail-closed receipt and identity rules. Existing `executeLeeWayGpu` continues to represent the canonical production route and **must remain blocked** until Runtime/Formula/LDWMD/Continuum/independent Veritas and ledgers qualify a real request.

**Limitations:** This SDK proves explicit application communication with LeeWay software graphics. The diagnostic is a fixed 16-pixel first-party software rendering workload, not arbitrary application shaders, full model inference, OS driver enumeration, or a general-purpose replacement for Direct3D/Vulkan. The full application workload API is a separate qualified implementation; WDDM KMD/UMD and signed device installation are still required for OS-level selection.

On Agent-Lee, a newly built unsigned native Windows test executable was blocked by local Windows Application Control; no security controls were disabled or bypassed. The hosted CI runner executes the native SDK test independently. Production deployment must use an appropriately trusted/signed binary under the owner's existing policy.
