/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.SOVEREIGN.CORE.CONTINUUM.MEMORY
TAG: LEEWAY.CONTINUUM.RAM.CACHE.V1
WHO: LeeWay Industries; WHAT: bounded RAM staging and deterministic 16x16 feature projection.
WHEN: 2026-11-16; WHERE: crates/leeway-core/src/continuum_memory.rs.
WHY: Keep active Continuum freight memory-resident without confusing projection with lossless compression.
HOW: SHA-256-bound source custody, 256 deterministic byte-density cells, explicit Continuum pointer state, and LRU capacity enforcement.
AUTHORITY: Staging primitive only; it does not issue Formula, Veritas, receipt, DMA, PCIe, Metal, or execution authority.
LICENSE: MIT
*/
use crate::SovereignError;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::{HashMap, VecDeque};
use std::sync::Arc;

pub const MATRIX_EDGE: usize = 16;
pub const MATRIX_CELLS: usize = MATRIX_EDGE * MATRIX_EDGE;
pub const BLOCK_BYTES: usize = MATRIX_CELLS;

#[derive(Debug, Clone, Serialize, Deserialize, Eq, PartialEq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Block256 {
    pub valid_bytes: u16,
    pub bytes: Vec<u8>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Eq, PartialEq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ReconstructionManifest {
    pub schema: String,
    pub codec: String,
    pub original_bytes: u64,
    pub block_count: u64,
    pub source_sha256: String,
    pub encoded_sha256: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Eq, PartialEq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ReversibleBlockStream {
    pub manifest: ReconstructionManifest,
    pub blocks: Vec<Block256>,
}

impl ReversibleBlockStream {
    pub fn encode(source: &[u8]) -> Self {
        let blocks = source
            .chunks(BLOCK_BYTES)
            .map(|chunk| {
                let mut bytes = vec![0_u8; BLOCK_BYTES];
                bytes[..chunk.len()].copy_from_slice(chunk);
                Block256 {
                    valid_bytes: chunk.len() as u16,
                    bytes,
                }
            })
            .collect::<Vec<_>>();
        let source_sha256 = hex::encode(Sha256::digest(source));
        let encoded_sha256 = encoded_stream_sha256(&blocks);
        Self {
            manifest: ReconstructionManifest {
                schema: "leeway.continuum.reversible-block-stream.v1".into(),
                codec: "IDENTITY_256_V1".into(),
                original_bytes: source.len() as u64,
                block_count: blocks.len() as u64,
                source_sha256,
                encoded_sha256,
            },
            blocks,
        }
    }

    pub fn decode(&self, maximum_output_bytes: u64) -> Result<Vec<u8>, SovereignError> {
        if self.manifest.schema != "leeway.continuum.reversible-block-stream.v1"
            || self.manifest.codec != "IDENTITY_256_V1"
        {
            return Err(SovereignError::ContinuumMemory(
                "CONTINUUM_CODEC_UNSUPPORTED".into(),
            ));
        }
        if self.manifest.original_bytes > maximum_output_bytes
            || self.manifest.block_count != self.blocks.len() as u64
            || self.manifest.encoded_sha256 != encoded_stream_sha256(&self.blocks)
        {
            return Err(SovereignError::ContinuumMemory(
                "CONTINUUM_CODEC_MANIFEST_INVALID".into(),
            ));
        }
        let expected_blocks = if self.manifest.original_bytes == 0 {
            0
        } else {
            self.manifest.original_bytes.div_ceil(BLOCK_BYTES as u64)
        };
        if expected_blocks != self.manifest.block_count {
            return Err(SovereignError::ContinuumMemory(
                "CONTINUUM_CODEC_BLOCK_COUNT_INVALID".into(),
            ));
        }
        let capacity = usize::try_from(self.manifest.original_bytes).map_err(|_| {
            SovereignError::ContinuumMemory("CONTINUUM_CODEC_OUTPUT_LIMIT_EXCEEDED".into())
        })?;
        let mut output = Vec::with_capacity(capacity);
        for (index, block) in self.blocks.iter().enumerate() {
            let valid = usize::from(block.valid_bytes);
            let is_last = index + 1 == self.blocks.len();
            if block.bytes.len() != BLOCK_BYTES
                || valid == 0
                || valid > BLOCK_BYTES
                || (!is_last && valid != BLOCK_BYTES)
            {
                return Err(SovereignError::ContinuumMemory(
                    "CONTINUUM_CODEC_BLOCK_INVALID".into(),
                ));
            }
            output.extend_from_slice(&block.bytes[..valid]);
        }
        if output.len() != capacity
            || hex::encode(Sha256::digest(&output)) != self.manifest.source_sha256
        {
            return Err(SovereignError::ContinuumMemory(
                "CONTINUUM_CODEC_RECONSTRUCTION_MISMATCH".into(),
            ));
        }
        Ok(output)
    }
}

fn encoded_stream_sha256(blocks: &[Block256]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(b"leeway.continuum.reversible-block-stream.v1\0");
    for block in blocks {
        hasher.update(block.valid_bytes.to_le_bytes());
        hasher.update(&block.bytes);
    }
    hex::encode(hasher.finalize())
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TensorProjection16 {
    pub schema: String,
    pub rows: usize,
    pub columns: usize,
    pub encoding: String,
    pub values: Vec<f32>,
    pub occupied_cells: usize,
    pub weight_invariant: f64,
    pub source_bytes: usize,
    pub source_sha256: String,
    pub projection_sha256: String,
    pub lossless_reconstruction: bool,
}

impl TensorProjection16 {
    pub fn project(source: &[u8]) -> Self {
        let source_sha256 = hex::encode(Sha256::digest(source));
        let mut sums = [0_u64; MATRIX_CELLS];
        let mut counts = [0_u64; MATRIX_CELLS];
        if !source.is_empty() {
            for (index, byte) in source.iter().enumerate() {
                let cell = index.saturating_mul(MATRIX_CELLS) / source.len();
                let bounded_cell = cell.min(MATRIX_CELLS - 1);
                sums[bounded_cell] += u64::from(*byte);
                counts[bounded_cell] += 1;
            }
        }
        let values = sums
            .iter()
            .zip(counts.iter())
            .map(|(sum, count)| {
                if *count == 0 {
                    0.0
                } else {
                    (*sum as f64 / *count as f64 / 255.0) as f32
                }
            })
            .collect::<Vec<_>>();
        let occupied_cells = counts.iter().filter(|count| **count > 0).count();
        let weight_invariant = values.iter().map(|value| f64::from(*value)).sum();
        let mut projection_hasher = Sha256::new();
        projection_hasher.update(b"leeway.continuum.tensor-projection.16x16.v1\0");
        projection_hasher.update(source_sha256.as_bytes());
        projection_hasher.update((source.len() as u64).to_le_bytes());
        for value in &values {
            projection_hasher.update(value.to_le_bytes());
        }
        let projection_sha256 = hex::encode(projection_hasher.finalize());
        Self {
            schema: "leeway.continuum.tensor-projection.16x16.v1".into(),
            rows: MATRIX_EDGE,
            columns: MATRIX_EDGE,
            encoding: "DETERMINISTIC_BYTE_DENSITY_V1".into(),
            values,
            occupied_cells,
            weight_invariant,
            source_bytes: source.len(),
            source_sha256,
            projection_sha256,
            lossless_reconstruction: false,
        }
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, Eq, PartialEq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ContinuumPointerState {
    PendingCommit,
    Persisted,
}

#[derive(Debug, Clone, Serialize, Deserialize, Eq, PartialEq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ContinuumPointer {
    pub capsule_id: String,
    pub capsule_sha256: String,
    pub state: ContinuumPointerState,
}

impl ContinuumPointer {
    fn validate(&self) -> Result<(), SovereignError> {
        let id_valid = !self.capsule_id.is_empty()
            && self.capsule_id.len() <= 128
            && self.capsule_id.bytes().all(|byte| {
                byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'_' | b'.' | b':')
            });
        let sha_valid = self.capsule_sha256.len() == 64
            && self
                .capsule_sha256
                .bytes()
                .all(|byte| byte.is_ascii_hexdigit());
        if !id_valid || !sha_valid {
            return Err(SovereignError::ContinuumMemory(
                "CONTINUUM_POINTER_INVALID".into(),
            ));
        }
        Ok(())
    }
}

#[derive(Debug, Clone)]
struct CacheEntry {
    source: Arc<[u8]>,
    projection: TensorProjection16,
    continuum: ContinuumPointer,
}

#[derive(Debug, Clone, Serialize, Deserialize, Eq, PartialEq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CacheStageResult {
    pub entry_id: String,
    pub source_sha256: String,
    pub projection_sha256: String,
    pub source_bytes: usize,
    pub continuum: ContinuumPointer,
    pub evicted_entry_ids: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Eq, PartialEq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ContinuumMemoryStats {
    pub tracked_payload_capacity_bytes: usize,
    pub maximum_entry_bytes: usize,
    pub tracked_resident_payload_bytes: usize,
    pub resident_entries: usize,
    pub tracked_available_payload_bytes: usize,
    pub total_process_memory_bounded: bool,
}

#[derive(Debug)]
pub struct ContinuumMemoryCache {
    capacity_bytes: usize,
    maximum_entry_bytes: usize,
    resident_bytes: usize,
    entries: HashMap<String, CacheEntry>,
    least_recently_used: VecDeque<String>,
}

impl ContinuumMemoryCache {
    pub fn new(capacity_bytes: usize, maximum_entry_bytes: usize) -> Result<Self, SovereignError> {
        if capacity_bytes == 0 || maximum_entry_bytes == 0 || maximum_entry_bytes > capacity_bytes {
            return Err(SovereignError::ContinuumMemory(
                "CONTINUUM_CACHE_LIMITS_INVALID".into(),
            ));
        }
        Ok(Self {
            capacity_bytes,
            maximum_entry_bytes,
            resident_bytes: 0,
            entries: HashMap::new(),
            least_recently_used: VecDeque::new(),
        })
    }

    pub fn stage(
        &mut self,
        source: impl Into<Arc<[u8]>>,
        continuum: ContinuumPointer,
    ) -> Result<CacheStageResult, SovereignError> {
        continuum.validate()?;
        let source = source.into();
        if source.is_empty() {
            return Err(SovereignError::ContinuumMemory(
                "CONTINUUM_CACHE_SOURCE_EMPTY".into(),
            ));
        }
        if source.len() > self.maximum_entry_bytes {
            return Err(SovereignError::ContinuumMemory(
                "CONTINUUM_CACHE_ENTRY_LIMIT_EXCEEDED".into(),
            ));
        }
        let projection = TensorProjection16::project(&source);
        let mut id_hasher = Sha256::new();
        id_hasher.update(b"leeway.continuum.ram-entry.v1\0");
        id_hasher.update(continuum.capsule_id.as_bytes());
        id_hasher.update([0]);
        id_hasher.update(projection.source_sha256.as_bytes());
        let entry_id = format!("ram-{}", hex::encode(id_hasher.finalize()));

        if let Some(replaced) = self.entries.remove(&entry_id) {
            self.resident_bytes = self.resident_bytes.saturating_sub(replaced.source.len());
            self.least_recently_used.retain(|value| value != &entry_id);
        }
        let mut evicted_entry_ids = Vec::new();
        while self.resident_bytes + source.len() > self.capacity_bytes {
            let evicted_id = self.least_recently_used.pop_front().ok_or_else(|| {
                SovereignError::ContinuumMemory("CONTINUUM_CACHE_ACCOUNTING_INVALID".into())
            })?;
            if let Some(evicted) = self.entries.remove(&evicted_id) {
                self.resident_bytes = self.resident_bytes.saturating_sub(evicted.source.len());
                evicted_entry_ids.push(evicted_id);
            }
        }
        self.resident_bytes += source.len();
        self.least_recently_used.push_back(entry_id.clone());
        self.entries.insert(
            entry_id.clone(),
            CacheEntry {
                source,
                projection: projection.clone(),
                continuum: continuum.clone(),
            },
        );
        Ok(CacheStageResult {
            entry_id,
            source_sha256: projection.source_sha256,
            projection_sha256: projection.projection_sha256,
            source_bytes: projection.source_bytes,
            continuum,
            evicted_entry_ids,
        })
    }

    pub fn source(&mut self, entry_id: &str) -> Option<Arc<[u8]>> {
        let entry = self.entries.get(entry_id)?.source.clone();
        self.touch(entry_id);
        Some(entry)
    }

    pub fn projection(&mut self, entry_id: &str) -> Option<TensorProjection16> {
        let projection = self.entries.get(entry_id)?.projection.clone();
        self.touch(entry_id);
        Some(projection)
    }

    pub fn continuum_pointer(&mut self, entry_id: &str) -> Option<ContinuumPointer> {
        let pointer = self.entries.get(entry_id)?.continuum.clone();
        self.touch(entry_id);
        Some(pointer)
    }

    pub fn mark_persisted(
        &mut self,
        entry_id: &str,
        capsule_sha256: &str,
    ) -> Result<(), SovereignError> {
        let entry = self.entries.get_mut(entry_id).ok_or_else(|| {
            SovereignError::ContinuumMemory("CONTINUUM_CACHE_ENTRY_NOT_FOUND".into())
        })?;
        if entry.continuum.capsule_sha256 != capsule_sha256 {
            return Err(SovereignError::ContinuumMemory(
                "CONTINUUM_POINTER_HASH_MISMATCH".into(),
            ));
        }
        entry.continuum.state = ContinuumPointerState::Persisted;
        self.touch(entry_id);
        Ok(())
    }

    pub fn stats(&self) -> ContinuumMemoryStats {
        ContinuumMemoryStats {
            tracked_payload_capacity_bytes: self.capacity_bytes,
            maximum_entry_bytes: self.maximum_entry_bytes,
            tracked_resident_payload_bytes: self.resident_bytes,
            resident_entries: self.entries.len(),
            tracked_available_payload_bytes: self
                .capacity_bytes
                .saturating_sub(self.resident_bytes),
            total_process_memory_bounded: false,
        }
    }

    fn touch(&mut self, entry_id: &str) {
        self.least_recently_used.retain(|value| value != entry_id);
        self.least_recently_used.push_back(entry_id.to_owned());
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn pointer(id: &str) -> ContinuumPointer {
        ContinuumPointer {
            capsule_id: id.into(),
            capsule_sha256: "ab".repeat(32),
            state: ContinuumPointerState::PendingCommit,
        }
    }

    #[test]
    fn projection_is_deterministic_bounded_and_explicitly_not_lossless() {
        let payload = (0_u16..4096)
            .map(|value| (value % 251) as u8)
            .collect::<Vec<_>>();
        let first = TensorProjection16::project(&payload);
        let second = TensorProjection16::project(&payload);
        assert_eq!(first, second);
        assert_eq!(first.values.len(), MATRIX_CELLS);
        assert_eq!(first.rows, 16);
        assert_eq!(first.columns, 16);
        assert_eq!(first.occupied_cells, MATRIX_CELLS);
        assert!(!first.lossless_reconstruction);
        assert_eq!(first.source_sha256.len(), 64);
        assert_eq!(first.projection_sha256.len(), 64);
    }

    #[test]
    fn reversible_blocks_round_trip_exact_bytes_at_boundaries() {
        for length in [0, 1, 255, 256, 257, 4096] {
            let payload = (0..length)
                .map(|value| (value % 251) as u8)
                .collect::<Vec<_>>();
            let encoded = ReversibleBlockStream::encode(&payload);
            let decoded = encoded.decode(4096).expect("decode");
            assert_eq!(decoded, payload);
        }
    }

    #[test]
    fn reversible_blocks_reject_tampering_and_declared_oversize() {
        let mut encoded = ReversibleBlockStream::encode(&vec![7_u8; 257]);
        encoded.blocks[0].bytes[0] ^= 1;
        assert!(encoded.decode(1024).is_err());
        let encoded = ReversibleBlockStream::encode(&vec![7_u8; 257]);
        assert!(encoded.decode(256).is_err());
    }

    #[test]
    fn cache_evicts_lru_without_exceeding_capacity_and_retains_source() {
        let mut cache = ContinuumMemoryCache::new(12, 8).expect("cache");
        let first = cache
            .stage(vec![1_u8; 8], pointer("cap-first"))
            .expect("first");
        assert_eq!(&*cache.source(&first.entry_id).expect("source"), &[1_u8; 8]);
        let second = cache
            .stage(vec![2_u8; 8], pointer("cap-second"))
            .expect("second");
        assert_eq!(second.evicted_entry_ids, vec![first.entry_id]);
        assert_eq!(cache.stats().tracked_resident_payload_bytes, 8);
        assert_eq!(cache.stats().resident_entries, 1);
        assert!(!cache.stats().total_process_memory_bounded);
    }

    #[test]
    fn cache_rejects_oversize_and_pointer_hash_mismatch() {
        let mut cache = ContinuumMemoryCache::new(16, 8).expect("cache");
        assert!(cache.stage(vec![0_u8; 9], pointer("cap-large")).is_err());
        let staged = cache
            .stage(vec![0_u8; 4], pointer("cap-good"))
            .expect("stage");
        assert!(cache
            .mark_persisted(&staged.entry_id, &"cd".repeat(32))
            .is_err());
        cache
            .mark_persisted(&staged.entry_id, &"ab".repeat(32))
            .expect("persisted");
        assert_eq!(
            cache
                .continuum_pointer(&staged.entry_id)
                .expect("pointer")
                .state,
            ContinuumPointerState::Persisted
        );
    }
}
