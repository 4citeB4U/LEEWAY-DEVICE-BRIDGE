/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.SOVEREIGN.CORE.COMPUTE.BACKEND
TAG: LEEWAY.COMPUTE.CPU.REFERENCE.V1
WHO: LeeWay Industries; WHAT: governed 16x16 CPU reference operation and differential evidence.
WHEN: 2026-11-16; WHERE: crates/leeway-core/src/compute_backend.rs.
WHY: Give native D3D12, Vulkan, and Metal adapters one deterministic comparison contract.
HOW: finite 256-cell validation, byte-stable little-endian hashing, and affine lane execution.
AUTHORITY: Candidate execution evidence only; no Formula, Veritas, receipt, or production authority.
LICENSE: MIT
*/
use crate::{SovereignError, MATRIX_CELLS};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

pub const TENSOR_OPERATION_ID: &str = "LEEWAY_TENSOR_AFFINE_16X16_V1";
pub const TENSOR_ABSOLUTE_TOLERANCE: f32 = 1.0e-6;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ComputeExecutionEvidence {
    pub operation_id: String,
    pub backend_id: String,
    pub evidence_state: String,
    pub lane_count: usize,
    pub input_sha256: String,
    pub output_sha256: String,
    pub output: Vec<f32>,
    pub canonical_receipt_issued: bool,
}

pub fn tensor_buffer_sha256(values: &[f32]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(TENSOR_OPERATION_ID.as_bytes());
    hasher.update([0]);
    for value in values {
        hasher.update(value.to_bits().to_le_bytes());
    }
    hex::encode(hasher.finalize())
}

pub fn execute_cpu_reference(values: &[f32]) -> Result<ComputeExecutionEvidence, SovereignError> {
    if values.len() != MATRIX_CELLS
        || values
            .iter()
            .any(|value| !value.is_finite() || !(0.0..=1.0).contains(value))
    {
        return Err(SovereignError::Compute(
            "COMPUTE_TENSOR_16X16_NORMALIZED_FINITE_INPUT_REQUIRED".into(),
        ));
    }
    let output = values
        .iter()
        .enumerate()
        .map(|(lane, value)| value.mul_add(3.0, lane as f32 / 255.0))
        .collect::<Vec<_>>();
    Ok(ComputeExecutionEvidence {
        operation_id: TENSOR_OPERATION_ID.into(),
        backend_id: "CPU_REFERENCE".into(),
        evidence_state: "LOCAL_DIFFERENTIAL_REFERENCE_ONLY".into(),
        lane_count: MATRIX_CELLS,
        input_sha256: tensor_buffer_sha256(values),
        output_sha256: tensor_buffer_sha256(&output),
        output,
        canonical_receipt_issued: false,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn cpu_reference_is_deterministic_for_exactly_256_finite_lanes() {
        let input = (0..MATRIX_CELLS)
            .map(|lane| lane as f32 / 255.0)
            .collect::<Vec<_>>();
        let first = execute_cpu_reference(&input).expect("first");
        let second = execute_cpu_reference(&input).expect("second");
        assert_eq!(first, second);
        assert_eq!(first.lane_count, 256);
        assert_eq!(first.input_sha256.len(), 64);
        assert_eq!(first.output_sha256.len(), 64);
        assert!(!first.canonical_receipt_issued);
    }

    #[test]
    fn cpu_reference_rejects_wrong_shape_and_non_finite_values() {
        assert!(execute_cpu_reference(&[0.0; 255]).is_err());
        let mut non_finite = [0.0_f32; MATRIX_CELLS];
        non_finite[7] = f32::NAN;
        assert!(execute_cpu_reference(&non_finite).is_err());
        let mut out_of_range = [0.0_f32; MATRIX_CELLS];
        out_of_range[9] = 1.01;
        assert!(execute_cpu_reference(&out_of_range).is_err());
    }
}
