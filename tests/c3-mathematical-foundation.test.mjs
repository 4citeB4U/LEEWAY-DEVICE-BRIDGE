import assert from 'node:assert/strict';
import {
  packMatrix, unpackMatrix, encodeMatrixWire, decodeMatrixWire,
  radix64Number, decodeRadix64Number, canonicalMatrixText,
  sha256, mathematicalEligibility, PACKED_BYTES
} from '../operator/c3-mathematical-foundation.mjs';

const matrix = [
[5,9,35,54,63,7],[14,20,59,60,61,25],[8,30,41,48,54,4],
[6,17,27,48,50,5],[30,36,40,42,57,2],[6,26,46,58,65,25],
[3,4,24,36,47,17],[4,5,22,50,58,1],[2,9,44,53,59,8],
[9,14,44,50,56,3],[2,7,18,29,38,16],[5,25,36,40,48,3],
[8,10,14,45,59,5],[12,29,37,43,55,18],[17,44,63,66,67,4],
[17,38,46,50,69,20]
];
const decimals = [4,50,63,59,48,69];
const radix64 = ['E','y','/','7','w','BF'];
for (let i=0;i<decimals.length;i++) {
  assert.equal(radix64Number(decimals[i]),radix64[i]);
  assert.equal(decodeRadix64Number(radix64[i]),decimals[i]);
}
const bytes=packMatrix(matrix);
assert.equal(bytes.length,PACKED_BYTES);
assert.deepEqual(unpackMatrix(bytes),matrix);
const wire=encodeMatrixWire(matrix);
assert.deepEqual(decodeMatrixWire(wire),matrix);
assert.equal(wire.packedByteLength,84);
assert.equal(wire.packedBase64.length,112);
assert.equal(wire.canonicalTextSha256,sha256(Buffer.from(canonicalMatrixText(matrix),'utf8')));
for(const changed of [
  {...wire,packedSha256:'0'.repeat(64)},
  {...wire,canonicalTextSha256:'f'.repeat(64)},
  {...wire,packedBase64:wire.packedBase64+'='}
]) assert.throws(()=>decodeMatrixWire(changed));
assert.throws(()=>packMatrix(matrix.map((r,i)=>i===0?[...r.slice(0,5),70]:r)));
assert.throws(()=>unpackMatrix(Buffer.alloc(83)));
assert.throws(()=>decodeRadix64Number('AB'));
assert.equal(mathematicalEligibility([1,1,1,1,1,1,1]),1);
for(let i=0;i<7;i++){const bits=Array(7).fill(1);bits[i]=0;assert.equal(mathematicalEligibility(bits),0);}
assert.throws(()=>mathematicalEligibility([1,1,1,1,1,1,true]));
console.log('PASS Golden Formula radix64 vector; binary packing; wire Base64; integrity; gate algebra');
