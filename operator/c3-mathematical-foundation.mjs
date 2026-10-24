/*
LEEWAY C3 MATHEMATICAL FOUNDATION - CANDIDATE, NON-AUTHORIZING
No replacement for LEEWAY-FORMULA-v1.0 or canonical Runtime Fabric governance.
Defines lossless 7-bit packing of the canonical 16x6 0..69 matrix, codec boundaries,
and an exact integer conjunction over independently VERIFIED gate decisions.
*/
import { createHash } from 'node:crypto';

export const ROWS = 16;
export const COLS = 6;
export const MAX = 69;
export const BITS_PER_CELL = 7;
export const CELL_COUNT = ROWS * COLS;
export const PACKED_BYTES = CELL_COUNT * BITS_PER_CELL / 8; // 84 exactly
export const RADIX64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function validateMatrix(matrix) {
  if (!Array.isArray(matrix) || matrix.length !== ROWS) throw Error('MATH_MATRIX_ROWS_INVALID');
  for (const row of matrix) {
    if (!Array.isArray(row) || row.length !== COLS) throw Error('MATH_MATRIX_COLUMNS_INVALID');
    for (const v of row) {
      if (!Number.isInteger(v) || v < 0 || v > MAX) throw Error('MATH_MATRIX_CELL_INVALID');
    }
  }
  return matrix;
}
export function canonicalMatrixText(matrix) {
  return validateMatrix(matrix).map(row => row.join(',')).join('\n');
}
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

export function packMatrix(matrix) {
  validateMatrix(matrix);
  const output = Buffer.alloc(PACKED_BYTES);
  let bit = 0;
  for (const row of matrix) for (const value of row) {
    for (let n = BITS_PER_CELL - 1; n >= 0; n--) {
      if ((value >>> n) & 1) output[bit >>> 3] |= 1 << (7 - (bit & 7));
      bit++;
    }
  }
  if (bit !== PACKED_BYTES * 8) throw Error('MATH_PACK_INVARIANT_FAILED');
  return output;
}
export function unpackMatrix(bytes) {
  const input = Buffer.from(bytes);
  if (input.length !== PACKED_BYTES) throw Error('MATH_PACK_LENGTH_INVALID');
  const values = [];
  let bit = 0;
  for (let i = 0; i < CELL_COUNT; i++) {
    let value = 0;
    for (let n = 0; n < BITS_PER_CELL; n++) {
      value = (value << 1) | ((input[bit >>> 3] >>> (7 - (bit & 7))) & 1);
      bit++;
    }
    if (value > MAX) throw Error('MATH_PACK_CELL_OUT_OF_RANGE');
    values.push(value);
  }
  const rows = [];
  for (let i = 0; i < ROWS; i++) rows.push(values.slice(i * COLS, (i + 1) * COLS));
  return rows;
}
export function encodeMatrixWire(matrix) {
  const packed = packMatrix(matrix);
  return Object.freeze({
    schema: 'leeway.math.matrix-wire.v1',
    packing: '7BIT_MSB_FIRST_ROW_MAJOR',
    rows: ROWS,
    columns: COLS,
    packedByteLength: packed.length,
    packedBase64: packed.toString('base64'),
    packedSha256: sha256(packed),
    canonicalTextSha256: sha256(Buffer.from(canonicalMatrixText(matrix), 'utf8'))
  });
}
export function decodeMatrixWire(record) {
  if (!record || record.schema !== 'leeway.math.matrix-wire.v1' ||
      record.packing !== '7BIT_MSB_FIRST_ROW_MAJOR' || record.rows !== ROWS ||
      record.columns !== COLS || record.packedByteLength !== PACKED_BYTES ||
      typeof record.packedBase64 !== 'string') throw Error('MATH_WIRE_SCHEMA_INVALID');
  const raw = Buffer.from(record.packedBase64, 'base64');
  if (raw.toString('base64') !== record.packedBase64 || raw.length !== PACKED_BYTES)
    throw Error('MATH_WIRE_NONCANONICAL_BASE64');
  if (sha256(raw) !== record.packedSha256) throw Error('MATH_WIRE_HASH_MISMATCH');
  const matrix = unpackMatrix(raw);
  if (sha256(Buffer.from(canonicalMatrixText(matrix), 'utf8')) !== record.canonicalTextSha256)
    throw Error('MATH_CANONICAL_HASH_MISMATCH');
  return matrix;
}
export function radix64Number(x) {
  if (!Number.isSafeInteger(x) || x < 0) throw Error('MATH_RADIX64_INTEGER_REQUIRED');
  if (x === 0) return 'A';
  let n = x, s = '';
  while (n > 0) { s = RADIX64_ALPHABET[n % 64] + s; n = Math.floor(n / 64); }
  return s;
}
export function decodeRadix64Number(text) {
  if (typeof text !== 'string' || !text.length) throw Error('MATH_RADIX64_TEXT_REQUIRED');
  let n = 0;
  for (const ch of text) {
    const v = RADIX64_ALPHABET.indexOf(ch);
    if (v < 0) throw Error('MATH_RADIX64_CHARACTER_INVALID');
    n = n * 64 + v;
    if (!Number.isSafeInteger(n)) throw Error('MATH_RADIX64_OVERFLOW');
  }
  if (radix64Number(n) !== text) throw Error('MATH_RADIX64_NONCANONICAL');
  return n;
}
// Pure algebraic obligation, NOT a grant. Evidence origins must be authenticated externally.
export function mathematicalEligibility(verifiedGateBits) {
  if (!Array.isArray(verifiedGateBits) || verifiedGateBits.length !== 7 ||
      !verifiedGateBits.every(x => x === 0 || x === 1)) throw Error('MATH_GATE_VECTOR_INVALID');
  return verifiedGateBits.reduce((acc, bit) => acc * bit, 1);
}
