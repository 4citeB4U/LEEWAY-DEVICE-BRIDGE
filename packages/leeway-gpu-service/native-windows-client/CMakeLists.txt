# LEEWAY HEADER — DO NOT REMOVE
# REGION: LEEWAY.DEVICE_BRIDGE.WINDOWS_NATIVE_CLIENT
# TAG: LEEWAY_NATIVE_WINHTTP_APPLICATION_SDK_BUILD_V1
# WHO: Owner-authorized engineering. WHAT: Build native Windows app SDK.
# WHEN: 2026-10-24. WHERE: Device Bridge GPU native client.
# WHY: Allow explicit app integration without GPU driver substitution.
# HOW: CMake/MSVC/WinHTTP. AUTHORITY: Client only. LICENSE: LeeWay.
cmake_minimum_required(VERSION 3.20)
project(LeeWayGPUWindowsClient LANGUAGES CXX)
if(NOT WIN32)
 message(FATAL_ERROR "LeeWay Windows GPU SDK requires the Windows SDK")
endif()
add_library(leeway_gpu_winclient SHARED leeway-gpu-client.cpp)
target_compile_features(leeway_gpu_winclient PRIVATE cxx_std_17)
target_compile_definitions(leeway_gpu_winclient PRIVATE LWG_CLIENT_EXPORTS)
target_include_directories(leeway_gpu_winclient PUBLIC ${CMAKE_CURRENT_SOURCE_DIR})
target_link_libraries(leeway_gpu_winclient PRIVATE winhttp)
if(MSVC)
 target_compile_options(leeway_gpu_winclient PRIVATE /W4 /WX /permissive-)
endif()
add_executable(leeway_gpu_winclient_test windows-client.test.cpp)
target_compile_features(leeway_gpu_winclient_test PRIVATE cxx_std_17)
target_link_libraries(leeway_gpu_winclient_test PRIVATE leeway_gpu_winclient)
enable_testing()
# The live-service test can run locally or in CI when the real service is present.
add_test(NAME LeeWayGPUWinClientLiveService
 COMMAND leeway_gpu_winclient_test 4180)
set_tests_properties(LeeWayGPUWinClientLiveService PROPERTIES LABELS "requires-live-service")
