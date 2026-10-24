/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE_BRIDGE.WINDOWS_NATIVE_CLIENT
TAG: LEEWAY_WINDOWS_WINHTTP_LOOPBACK_API_V1
WHO: Owner-authorized LeeWay GPU engineering.
WHAT: Native Windows C ABI client for existing LeeWay service.
WHEN: 2026-10-24. WHERE: packages/leeway-gpu-service/native-windows-client.
WHY: Actual Windows apps can call LeeWay without a fake GPU registration.
HOW: WinHTTP to 127.0.0.1; fixed paths, bounded JSON, same-origin CSRF.
AUTHORITY: Diagnostics never imply canonical GPU execution.
LICENSE: Existing LeeWay repository terms.
*/
#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <winhttp.h>
#include <string>
#include <array>
#include <cstring>
#include <new>
#include "leeway-gpu-client.h"
#pragma comment(lib,"winhttp.lib")

namespace {
struct WinHandle {
 HINTERNET h=nullptr;
 explicit WinHandle(HINTERNET v):h(v){}
 ~WinHandle(){if(h)WinHttpCloseHandle(h);}
 WinHandle(const WinHandle&)=delete;
 WinHandle& operator=(const WinHandle&)=delete;
};
constexpr size_t kMaxResponse=65536;
bool contains(const std::string& s,const char* text){
 return s.find(text)!=std::string::npos;
}
int request(uint16_t port,const wchar_t* verb,const wchar_t* route,
 const std::wstring& headers,std::string& output) {
 if(!port)return LWG_INVALID_ARGUMENT;
 WinHandle session(WinHttpOpen(L"LeeWayGPU-WindowsClient/1.0",
  WINHTTP_ACCESS_TYPE_NO_PROXY,WINHTTP_NO_PROXY_NAME,WINHTTP_NO_PROXY_BYPASS,0));
 if(!session.h)return LWG_NETWORK_FAILED;
 if(!WinHttpSetTimeouts(session.h,2500,2500,5000,5000))return LWG_NETWORK_FAILED;
 WinHandle connection(WinHttpConnect(session.h,L"127.0.0.1",port,0));
 if(!connection.h)return LWG_NETWORK_FAILED;
 WinHandle handle(WinHttpOpenRequest(connection.h,verb,route,nullptr,
   WINHTTP_NO_REFERER,WINHTTP_DEFAULT_ACCEPT_TYPES,0));
 if(!handle.h)return LWG_NETWORK_FAILED;
 if(!WinHttpSendRequest(handle.h,headers.empty()?WINHTTP_NO_ADDITIONAL_HEADERS:headers.c_str(),
  headers.empty()?0:static_cast<DWORD>(headers.size()),WINHTTP_NO_REQUEST_DATA,0,0,0))
  return LWG_NETWORK_FAILED;
 if(!WinHttpReceiveResponse(handle.h,nullptr))return LWG_NETWORK_FAILED;
 DWORD code=0,length=sizeof(code);
 if(!WinHttpQueryHeaders(handle.h,WINHTTP_QUERY_STATUS_CODE|WINHTTP_QUERY_FLAG_NUMBER,
  WINHTTP_HEADER_NAME_BY_INDEX,&code,&length,WINHTTP_NO_HEADER_INDEX))
  return LWG_NETWORK_FAILED;
 output.clear();
 for(;;){
  std::array<char,4096> buffer{};
  DWORD got=0;
  if(!WinHttpReadData(handle.h,buffer.data(),static_cast<DWORD>(buffer.size()),&got))
    return LWG_NETWORK_FAILED;
  if(!got)break;
  if(output.size()+got>kMaxResponse)return LWG_IDENTITY_MISMATCH;
  output.append(buffer.data(),got);
 }
 if(code!=200)return LWG_SERVICE_DENIED;
 if(output.empty())return LWG_IDENTITY_MISMATCH;
 return LWG_OK;
}
int copyJson(const std::string& json,char* dst,size_t cap,size_t* needed){
 if(!needed||!dst)return LWG_INVALID_ARGUMENT;
 *needed=json.size()+1;
 if(cap<json.size()+1)return LWG_BUFFER_TOO_SMALL;
 std::memcpy(dst,json.data(),json.size());
 dst[json.size()]='\0';
 return LWG_OK;
}
bool serviceIdentity(const std::string& response){
 return contains(response,"\"serviceId\":\"leeway.gpu.service\"");
}
bool diagnosticIdentity(const std::string& response){
 return serviceIdentity(response)&&
 contains(response,"\"status\":\"PASS_DIAGNOSTIC_ONLY\"")&&
 contains(response,"\"scope\":\"LAB_ONLY\"")&&
 contains(response,"\"backend\":\"LEEWAY_GPU_SOFTWARE\"")&&
 contains(response,"\"canonicalReceiptIssued\":false")&&
 contains(response,"\"osGpuRegistered\":false")&&
 contains(response,"\"productionReady\":false")&&
 contains(response,"\"dispatchAllowed\":false")&&
 contains(response,"\"completedFence\":1")&&
 contains(response,"\"borrowedPixels\":16");
}
std::string csrfToken(const std::string& data) {
 const std::string start="\"csrfToken\":\"";
 const auto pos=data.find(start);
 if(pos==std::string::npos)return {};
 const auto begin=pos+start.size();
 if(begin+64>=data.size()||data[begin+64]!='"')return {};
 const auto token=data.substr(begin,64);
 for(char c:token)if(!((c>='0'&&c<='9')||(c>='a'&&c<='f')))return {};
 return token;
}
std::wstring makeOrigin(uint16_t port,const std::string& token) {
 std::wstring out=L"Origin: http://127.0.0.1:";
 out+=std::to_wstring(port);
 out+=L"\r\nx-leeway-csrf: ";
 for(char c:token)out.push_back(static_cast<wchar_t>(c));
 out+=L"\r\n";
 return out;
}
}
extern "C" uint32_t __cdecl LeeWayGpuClientAbiVersion(void){return LEEWAY_GPU_CLIENT_ABI_VERSION;}
extern "C" int __cdecl LeeWayGpuQueryStatus(
 uint16_t port,char* utf8Json,size_t capacity,size_t* needed){
 if(needed)*needed=0;
 if(!port||!utf8Json||!needed)return LWG_INVALID_ARGUMENT;
 try {
  std::string response;
  const int r=request(port,L"GET",L"/v1/status",L"",response);
  if(r!=LWG_OK)return r;
  if(!serviceIdentity(response)||
     !contains(response,"\"service\":\"leeway.gpu.service.v1\""))
   return LWG_IDENTITY_MISMATCH;
  return copyJson(response,utf8Json,capacity,needed);
 }catch(const std::bad_alloc&){return LWG_NETWORK_FAILED;}
}
extern "C" int __cdecl LeeWayGpuRunSoftwareDiagnostic(
 uint16_t port,char* utf8Json,size_t capacity,size_t* needed){
 if(needed)*needed=0;
 if(!port||!utf8Json||!needed)return LWG_INVALID_ARGUMENT;
 try{
  std::string control;
  int r=request(port,L"GET",L"/v1/control",L"",control);
  if(r!=LWG_OK)return r;
  if(!serviceIdentity(control))return LWG_IDENTITY_MISMATCH;
  const auto token=csrfToken(control);
  if(token.empty())return LWG_IDENTITY_MISMATCH;
  std::string response;
  r=request(port,L"POST",L"/v1/diagnostics/software-graphics/run",
    makeOrigin(port,token),response);
  if(r!=LWG_OK)return r;
  if(!diagnosticIdentity(response))return LWG_IDENTITY_MISMATCH;
  return copyJson(response,utf8Json,capacity,needed);
 }catch(const std::bad_alloc&){return LWG_NETWORK_FAILED;}
}
