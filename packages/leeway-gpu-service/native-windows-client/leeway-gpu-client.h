/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE_BRIDGE.WINDOWS_NATIVE_CLIENT
TAG: LEEWAY_WINDOWS_APPLICATION_C_API_V1
WHO: Creator-authorized LeeWay GPU engineering.
WHAT: Stable C ABI for Windows applications to communicate with LeeWay GPU.
WHEN: 2026-10-24. WHERE: packages/leeway-gpu-service/native-windows-client.
WHY: Allow explicit Windows app use without waiting for OS WDDM registration.
HOW: Loopback WinHTTP API client; no GPU vendor, API tokens, or kernel changes.
AUTHORITY: Service dictates authorization; diagnostic is unadmitted.
LICENSE: Existing LeeWay repository terms.
*/
#pragma once
#include <stdint.h>
#include <stddef.h>
#ifdef _WIN32
# ifdef LWG_CLIENT_EXPORTS
#  define LWG_API __declspec(dllexport)
# else
#  define LWG_API __declspec(dllimport)
# endif
#else
# define LWG_API
#endif
#ifdef __cplusplus
extern "C" {
#endif

enum LeeWayGpuClientResult {
 LWG_OK=0,
 LWG_INVALID_ARGUMENT=1,
 LWG_NETWORK_FAILED=2,
 LWG_SERVICE_DENIED=3,
 LWG_IDENTITY_MISMATCH=4,
 LWG_BUFFER_TOO_SMALL=5
};
#define LEEWAY_GPU_CLIENT_ABI_VERSION 1u

// A local application chooses the port of its authorized LeeWay GPU service.
// No caller-controlled hostname, executable path or arbitrary HTTP route.
LWG_API uint32_t __cdecl LeeWayGpuClientAbiVersion(void);
LWG_API int __cdecl LeeWayGpuQueryStatus(
 uint16_t port,char* utf8Json,size_t capacity,size_t* needed);
// This executes ONLY the local lab software-renderer diagnostic. It does not
// authorize model work, install a WDDM driver or issue a Veritas receipt.
LWG_API int __cdecl LeeWayGpuRunSoftwareDiagnostic(
 uint16_t port,char* utf8Json,size_t capacity,size_t* needed);

#ifdef __cplusplus
}
#endif
