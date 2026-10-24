/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE_BRIDGE.WINDOWS_NATIVE_CLIENT.TEST
TAG: LEEWAY_REAL_WIN32_APPLIB_NATIVE_LIVE_CONSUMER
WHO: Creator-authorized LeeWay engineering.
WHAT: Compile actual Windows app and call the LeeWay local service C ABI.
WHEN: 2026-10-24. WHERE: native-windows-client.
WHY: Prove third-party Windows apps can integrate explicitly.
HOW: Native SDK exported functions and loopback service.
AUTHORITY: No WDDM, no canonical production admission.
LICENSE: LeeWay.
*/
#include "leeway-gpu-client.h"
#include <iostream>
#include <array>
#include <string>
#include <cstdlib>
int main(int argc,char** argv){
 const int port=argc==2?std::atoi(argv[1]):4180;
 if(port<1||port>65535)return 2;
 std::array<char,65536> response{};
 size_t needed=0;
 if(LeeWayGpuClientAbiVersion()!=LEEWAY_GPU_CLIENT_ABI_VERSION)return 3;
 if(LeeWayGpuQueryStatus(static_cast<uint16_t>(port),
     response.data(),response.size(),&needed)!=LWG_OK)return 4;
 const std::string status=response.data();
 if(status.find("\"serviceId\":\"leeway.gpu.service\"")==std::string::npos)return 5;
 if(LeeWayGpuRunSoftwareDiagnostic(static_cast<uint16_t>(port),
     response.data(),response.size(),&needed)!=LWG_OK)return 6;
 const std::string diag=response.data();
 if(diag.find("\"scope\":\"LAB_ONLY\"")==std::string::npos||
    diag.find("\"osGpuRegistered\":false")==std::string::npos||
    diag.find("\"independentReadback\":true")==std::string::npos)
   return 7;
 std::cout<<"LEEWAY_WINDOWS_APPLICATION_NATIVE_SDK_PASS"
          <<" servicePort="<<port
          <<" nativeEngine=LEEWAY_GPU_SOFTWARE"
          <<" labExecution=true"
          <<" osAdapterRegistered=false"
          <<" fullModelInferenceQualified=false"
          <<" diagnosticJsonBytes="<<needed-1<<"\n";
 return 0;
}
