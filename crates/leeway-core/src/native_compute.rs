/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.SOVEREIGN.CORE.COMPUTE.NATIVE
TAG: LEEWAY.COMPUTE.OS_MEDIATED.GPU.V1
WHO: LeeWay Industries; WHAT: bounded OS-mediated GPU execution and CPU differential readback.
WHEN: 2026-11-16; WHERE: crates/leeway-core/src/native_compute.rs.
WHY: Bind the 16x16 compute contract to D3D12, Vulkan, or Metal without raw PCIe/MMIO authority.
HOW: wgpu-owned buffers, one fixed WGSL kernel, bounded copy/readback, and exact CPU comparison.
AUTHORITY: Candidate device evidence only; no Formula, Veritas, receipt, or production authority.
LICENSE: MIT
*/
use crate::{
    execute_cpu_reference, tensor_buffer_sha256, SovereignError, MATRIX_CELLS,
    TENSOR_ABSOLUTE_TOLERANCE,
};
use serde::{Deserialize, Serialize};
use std::sync::mpsc;
use wgpu::util::DeviceExt;

const BUFFER_BYTES: u64 = (MATRIX_CELLS * std::mem::size_of::<f32>()) as u64;
const SHADER: &str = r#"
@group(0) @binding(0) var<storage, read> input_values: array<f32, 256>;
@group(0) @binding(1) var<storage, read_write> output_values: array<f32, 256>;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
    if (id.x < 256u) {
        let bias = f32(id.x) / 255.0;
        output_values[id.x] = fma(input_values[id.x], 3.0, bias);
    }
}
"#;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct NativeComputeEvidence {
    pub operation_id: String,
    pub backend_id: String,
    pub adapter_name: String,
    pub adapter_device_type: String,
    pub physical_hardware_claimed: bool,
    pub evidence_state: String,
    pub lane_count: usize,
    pub input_sha256: String,
    pub output_sha256: String,
    pub cpu_output_sha256: String,
    pub exact_mismatch_count: usize,
    pub tolerance_mismatch_count: usize,
    pub maximum_absolute_error: f32,
    pub absolute_tolerance: f32,
    pub canonical_receipt_issued: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct NativeComputeDescriptor {
    pub descriptor_version: u32,
    pub capability_id: String,
    pub provider_version: String,
    pub backend_id: String,
    pub adapter_name: String,
    pub adapter_device_type: String,
    pub driver_name: String,
    pub driver_info: String,
    pub physical_hardware_claimed: bool,
    pub health: String,
    pub discovered_utc: String,
    pub expires_utc: String,
    pub maximum_buffer_bytes: u64,
    pub maximum_storage_binding_bytes: u32,
    pub maximum_compute_workgroups_per_dimension: u32,
    pub memory_budget_state: String,
    pub memory_budget_reason: String,
    pub workload_executed: bool,
    pub memory_reserved: bool,
}

fn compute_error(code: impl Into<String>) -> SovereignError {
    SovereignError::Compute(code.into())
}

fn validate_observed_output(observed: &[f32]) -> Result<(), SovereignError> {
    if observed.len() != MATRIX_CELLS || observed.iter().any(|value| !value.is_finite()) {
        return Err(compute_error("NATIVE_GPU_OUTPUT_256_FINITE_LANES_REQUIRED"));
    }
    Ok(())
}

async fn select_native_adapter() -> Result<wgpu::Adapter, SovereignError> {
    #[cfg(target_os = "windows")]
    let backend_order: &[wgpu::Backends] = &[wgpu::Backends::DX12, wgpu::Backends::VULKAN];
    #[cfg(any(target_os = "macos", target_os = "ios"))]
    let backend_order: &[wgpu::Backends] = &[wgpu::Backends::METAL];
    #[cfg(target_os = "android")]
    let backend_order: &[wgpu::Backends] = &[wgpu::Backends::VULKAN];
    #[cfg(not(any(
        target_os = "windows",
        target_os = "macos",
        target_os = "ios",
        target_os = "android"
    )))]
    let backend_order: &[wgpu::Backends] = &[wgpu::Backends::VULKAN, wgpu::Backends::GL];

    for &backend in backend_order {
        let instance = wgpu::Instance::new(&wgpu::InstanceDescriptor {
            backends: backend,
            ..Default::default()
        });
        if let Some(adapter) = instance
            .request_adapter(&wgpu::RequestAdapterOptions {
                power_preference: wgpu::PowerPreference::HighPerformance,
                force_fallback_adapter: false,
                compatible_surface: None,
            })
            .await
        {
            return Ok(adapter);
        }
    }
    Err(compute_error(
        "NATIVE_GPU_ADAPTER_UNAVAILABLE_FOR_PLATFORM_BACKENDS",
    ))
}

pub async fn discover_native_gpu() -> Result<NativeComputeDescriptor, SovereignError> {
    let adapter = select_native_adapter().await?;
    let info = adapter.get_info();
    let limits = adapter.limits();
    let discovered = chrono::Utc::now();
    let expires = discovered + chrono::Duration::minutes(5);
    let physical_hardware_claimed = matches!(
        info.device_type,
        wgpu::DeviceType::IntegratedGpu | wgpu::DeviceType::DiscreteGpu
    );
    Ok(NativeComputeDescriptor {
        descriptor_version: 1,
        capability_id: "gpu.compute.native.probe".into(),
        provider_version: env!("CARGO_PKG_VERSION").into(),
        backend_id: format!("{:?}", info.backend),
        adapter_name: info.name,
        adapter_device_type: format!("{:?}", info.device_type),
        driver_name: info.driver,
        driver_info: info.driver_info,
        physical_hardware_claimed,
        health: if physical_hardware_claimed {
            "READY_PHYSICAL"
        } else {
            "READY_SOFTWARE_OR_VIRTUAL"
        }
        .into(),
        discovered_utc: discovered.to_rfc3339(),
        expires_utc: expires.to_rfc3339(),
        maximum_buffer_bytes: limits.max_buffer_size,
        maximum_storage_binding_bytes: limits.max_storage_buffer_binding_size,
        maximum_compute_workgroups_per_dimension: limits.max_compute_workgroups_per_dimension,
        memory_budget_state: "UNAVAILABLE_UNSUPPORTED".into(),
        memory_budget_reason:
            "WGPU_ADAPTER_LIMITS_DO_NOT_EXPOSE_DXGI_QUERY_VIDEO_MEMORY_INFO_OR_VK_EXT_MEMORY_BUDGET"
                .into(),
        workload_executed: false,
        memory_reserved: false,
    })
}

pub async fn execute_native_gpu(values: &[f32]) -> Result<NativeComputeEvidence, SovereignError> {
    let cpu = execute_cpu_reference(values)?;
    let adapter = select_native_adapter().await?;
    let info = adapter.get_info();
    let (device, queue) = adapter
        .request_device(
            &wgpu::DeviceDescriptor {
                label: Some("LeeWay bounded 16x16 compute device"),
                required_features: wgpu::Features::empty(),
                required_limits: wgpu::Limits::downlevel_defaults(),
                memory_hints: wgpu::MemoryHints::MemoryUsage,
            },
            None,
        )
        .await
        .map_err(|error| compute_error(format!("NATIVE_GPU_DEVICE_REQUEST_FAILED:{error}")))?;

    let input = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
        label: Some("LeeWay 16x16 input"),
        contents: bytemuck::cast_slice(values),
        usage: wgpu::BufferUsages::STORAGE,
    });
    let output = device.create_buffer(&wgpu::BufferDescriptor {
        label: Some("LeeWay 16x16 output"),
        size: BUFFER_BYTES,
        usage: wgpu::BufferUsages::STORAGE | wgpu::BufferUsages::COPY_SRC,
        mapped_at_creation: false,
    });
    let readback = device.create_buffer(&wgpu::BufferDescriptor {
        label: Some("LeeWay 16x16 readback"),
        size: BUFFER_BYTES,
        usage: wgpu::BufferUsages::MAP_READ | wgpu::BufferUsages::COPY_DST,
        mapped_at_creation: false,
    });
    let module = device.create_shader_module(wgpu::ShaderModuleDescriptor {
        label: Some("LeeWay affine 16x16 shader"),
        source: wgpu::ShaderSource::Wgsl(SHADER.into()),
    });
    let layout = device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
        label: Some("LeeWay affine 16x16 layout"),
        entries: &[
            wgpu::BindGroupLayoutEntry {
                binding: 0,
                visibility: wgpu::ShaderStages::COMPUTE,
                ty: wgpu::BindingType::Buffer {
                    ty: wgpu::BufferBindingType::Storage { read_only: true },
                    has_dynamic_offset: false,
                    min_binding_size: None,
                },
                count: None,
            },
            wgpu::BindGroupLayoutEntry {
                binding: 1,
                visibility: wgpu::ShaderStages::COMPUTE,
                ty: wgpu::BindingType::Buffer {
                    ty: wgpu::BufferBindingType::Storage { read_only: false },
                    has_dynamic_offset: false,
                    min_binding_size: None,
                },
                count: None,
            },
        ],
    });
    let pipeline_layout = device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
        label: Some("LeeWay affine 16x16 pipeline layout"),
        bind_group_layouts: &[&layout],
        push_constant_ranges: &[],
    });
    let pipeline = device.create_compute_pipeline(&wgpu::ComputePipelineDescriptor {
        label: Some("LeeWay affine 16x16 pipeline"),
        layout: Some(&pipeline_layout),
        module: &module,
        entry_point: Some("main"),
        compilation_options: Default::default(),
        cache: None,
    });
    let bindings = device.create_bind_group(&wgpu::BindGroupDescriptor {
        label: Some("LeeWay affine 16x16 bindings"),
        layout: &layout,
        entries: &[
            wgpu::BindGroupEntry {
                binding: 0,
                resource: input.as_entire_binding(),
            },
            wgpu::BindGroupEntry {
                binding: 1,
                resource: output.as_entire_binding(),
            },
        ],
    });
    let mut encoder = device.create_command_encoder(&wgpu::CommandEncoderDescriptor {
        label: Some("LeeWay affine 16x16 encoder"),
    });
    {
        let mut pass = encoder.begin_compute_pass(&wgpu::ComputePassDescriptor {
            label: Some("LeeWay affine 16x16 pass"),
            timestamp_writes: None,
        });
        pass.set_pipeline(&pipeline);
        pass.set_bind_group(0, &bindings, &[]);
        pass.dispatch_workgroups(4, 1, 1);
    }
    encoder.copy_buffer_to_buffer(&output, 0, &readback, 0, BUFFER_BYTES);
    queue.submit(Some(encoder.finish()));

    let slice = readback.slice(..);
    let (sender, receiver) = mpsc::channel::<Result<(), wgpu::BufferAsyncError>>();
    slice.map_async(wgpu::MapMode::Read, move |result| {
        let _ = sender.send(result);
    });
    device.poll(wgpu::Maintain::Wait);
    receiver
        .recv()
        .map_err(|_| compute_error("NATIVE_GPU_READBACK_CHANNEL_CLOSED"))?
        .map_err(|error| compute_error(format!("NATIVE_GPU_READBACK_FAILED:{error}")))?;
    let mapped = slice.get_mapped_range();
    let observed = bytemuck::cast_slice::<u8, f32>(&mapped).to_vec();
    drop(mapped);
    readback.unmap();
    validate_observed_output(&observed)?;

    let exact_mismatch_count = observed
        .iter()
        .zip(cpu.output.iter())
        .filter(|(gpu, reference)| gpu.to_bits() != reference.to_bits())
        .count();
    let maximum_absolute_error = observed
        .iter()
        .zip(cpu.output.iter())
        .map(|(gpu, reference)| (gpu - reference).abs())
        .fold(0.0_f32, f32::max);
    let tolerance_mismatch_count = observed
        .iter()
        .zip(cpu.output.iter())
        .filter(|(gpu, reference)| (*gpu - *reference).abs() > TENSOR_ABSOLUTE_TOLERANCE)
        .count();
    let physical_hardware_claimed = matches!(
        info.device_type,
        wgpu::DeviceType::IntegratedGpu | wgpu::DeviceType::DiscreteGpu
    );
    Ok(NativeComputeEvidence {
        operation_id: crate::TENSOR_OPERATION_ID.into(),
        backend_id: format!("{:?}", info.backend),
        adapter_name: info.name,
        adapter_device_type: format!("{:?}", info.device_type),
        physical_hardware_claimed,
        evidence_state: if tolerance_mismatch_count == 0 {
            if physical_hardware_claimed {
                "LOCAL_OS_MEDIATED_GPU_READBACK_PASSED_PENDING_GOVERNANCE"
            } else {
                "LOCAL_SOFTWARE_OR_VIRTUAL_GPU_READBACK_PASSED_PENDING_GOVERNANCE"
            }
        } else {
            "LOCAL_GPU_DIFFERENTIAL_MISMATCH"
        }
        .into(),
        lane_count: observed.len(),
        input_sha256: tensor_buffer_sha256(values),
        output_sha256: tensor_buffer_sha256(&observed),
        cpu_output_sha256: cpu.output_sha256,
        exact_mismatch_count,
        tolerance_mismatch_count,
        maximum_absolute_error,
        absolute_tolerance: TENSOR_ABSOLUTE_TOLERANCE,
        canonical_receipt_issued: false,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn native_contract_is_fixed_and_bounded() {
        assert_eq!(BUFFER_BYTES, 1024);
        assert!(SHADER.contains("array<f32, 256>"));
        assert!(SHADER.contains("fma("));
        assert!(SHADER.contains("id.x < 256u"));
    }

    #[test]
    fn observed_output_rejects_wrong_length_nan_and_infinity() {
        assert!(validate_observed_output(&[0.0; 255]).is_err());
        let mut nan = [0.0_f32; MATRIX_CELLS];
        nan[4] = f32::NAN;
        assert!(validate_observed_output(&nan).is_err());
        let mut positive = [0.0_f32; MATRIX_CELLS];
        positive[5] = f32::INFINITY;
        assert!(validate_observed_output(&positive).is_err());
        let mut negative = [0.0_f32; MATRIX_CELLS];
        negative[6] = f32::NEG_INFINITY;
        assert!(validate_observed_output(&negative).is_err());
    }

    #[tokio::test]
    async fn native_adapter_rejects_bad_shape_before_gpu_discovery() {
        let error = execute_native_gpu(&[0.0; 255]).await.expect_err("shape");
        assert!(error
            .to_string()
            .contains("COMPUTE_TENSOR_16X16_NORMALIZED_FINITE_INPUT_REQUIRED"));
    }
}
