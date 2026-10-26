# LeeWay Mathematical Foundation — C3 Candidate Contract v0.1 (2026-10-15)

## Classification / authority
CANDIDATE / NON-AUTHORIZING / NOT FROZEN. This document adds a binary wire and evidence model around the existing, frozen Golden Formula. It does not replace Golden Formula v1.0, reinterpret scores as consent, or certify an owner key, native device provenance, Veritas, or Learning Ledger admission.

## Grounded canonical Formula source
Local inspected authority:
- hardening-20261005/formula/runtime/canonical/leeway-formula/v1/leeway-formula-v1.mjs
- base64-codec.mjs, rational.mjs, canonical-input.mjs
- adapters/runtime-state-v1.mjs
- Runtime Fabric machine-consciousness/domain-policy/formula-domain-policy-core.mjs

Formula ID LEEWAY-FORMULA-v1.0; input 16 rows by 6 columns; each integer in [0,69]. Universe U={0,...,69}, 70 candidates. Features ordered F,G,R,P,v,a,D,H,C,Q; exact rational arithmetic with BigInt numerators and denominators. Per-feature min-max normalization, equal weight 1/10, deterministic ranking with tie-breakers by frequency, recency, position then candidate integer. Canonical golden expected decimal state [4,50,63,59,48,69] and RADIX-64 NUMERAL strings [E,y,/,7,w,BF].

Note: the Formula source's base64-codec.mjs is positional radix 64 NUMBER formatting, not RFC 4648 byte Base64. It encodes 69 as BF (=1*64+5) rather than base64-encoding byte 0x45. Do not interchange these encodings.

## 1. Canonical 16x6 input and exact quantization
Let R in R^(16x6) be authenticated, measured runtime observations with dimension ordering (Q,V,H,R,S,L). Ranges per dimension j: [l_j,u_j], u_j>l_j. The existing adapter computes:
q_ij = round(69 * (clamp(R_ij,l_j,u_j)-l_j)/(u_j-l_j)).
Check all values finite; q_ij in {0,...,69}. These six dimensions need separate *trusted sensor/authority mapping contracts*. Raw 16x6 values may not be invented as PASS indicators. JavaScript Math.round behavior at ties must remain a normative part of adapter conformance.

Canonical matrix text C(M) is each row decimal numbers comma-joined and rows joined by LF, no spaces. Canonical input hash H_text = SHA256(UTF8(C(M))). This is the CURRENT Formula input hash representation and must remain unchanged.

## 2. Binary representation
Each canonical cell 0..69 needs ceil(log2(70)) = 7 bits. 96 cells require 96*7 = 672 bits = 84 bytes exactly.
Pack cells row-major, most-significant bit first, no padding. For cell value v, bit k in 6..0:
b_ijk = (v >> k) & 1.
The byte at address floor(t/8) has bit position (7 - t%8). The inverse reconstruction must recover exactly 96 cells, and reject any 7-bit value 70..127.

Wire Base64 B_wire = RFC4648.Base64(84 packed bytes): exactly 112 characters, no '=' padding because 84 divisible by 3. H_wire = SHA256(packed bytes). H_wire and H_text are generally different and serve distinct representations.
The wire envelope includes explicit schema, packing, shape, Base64, H_wire, H_text. Round-trip preservation and canonical decoding are mandatory, no silent coercion.

## 3. Existing Formula scoring mathematics
For candidate x: F=number of matching cells, G=rows since last occurrence, R=last row index / 16, P=max column count / total occurrences, v=last inter-occurrence gap, a=gap acceleration, D=|24x-727|/24, H=(v^2 + D^2)/2, C=count of distinct y repeatedly co-occurring with x in at least two rows, Q=v+a+D+R+G.
Each feature z is min-max normalized over all 70 candidate values:
z_norm(x)=(z(x)-min z)/(max z-min z) when max>min; otherwise zero.
S(x)=(1/10) SUM(z_norm(x)) over the ten ordered features. The engine ranks all x by descending exact rational S, breaking ties by F, R, P and ascending x. The top 6 form decimalState. Radix64 numeral encoding is a presentation of those six integers, not authorization or proof.

## 4. Execution decision as a separate mathematical obligation
Define authenticated verification bits A,D,F,V_pre,E,V_post,R in {0,1}, each issued by its OWN trusted stage:
A owner/session authorization verified; D target/platform capability evidence verified; F canonical Formula evaluation and source hash verified WITH policy interpretation; V_pre device-specific Veritas pre-admission; E native operation proven; V_post independent outcome readback; R receipts/evidence sink verified.
The post-hoc full-chain condition is P_full=A*D*F*V_pre*E*V_post*R. P_full=1 iff all seven independent proofs qualify. PRE-dispatch guard is P_pre=A*D*F*V_pre; if zero, prohibit dispatch. Later stages cannot be used to justify earlier dispatch retroactively.

The product is a truth aggregation, NOT a source of the bits. Never accept booleans, receipt labels, development signing keys, or self-issued interactions as proof of A,D,V_pre,etc. A separate trusted verifier must authenticate each evidence object and bind requestId/deviceId/capability/argsDigest/time/revocation/issuer before emitting a qualifying bit.

## 5. Cryptographic evidence model
H_request = SHA256(domain || canonical(request)); use explicit domain separation and versioned canonical serialization.
Consent signature sigma=Ed25519.Sign(sk_owner, domain || canonical(consent fields)); verification against PINNED authorized owner public key, not arbitrary provided key. Key custody and independent human interaction remain unresolved C3 gates.
MAC=HMAC-SHA256(K_transport, domain || canonical(session challenge fields)); its correctness relies on authenticated key distribution and independent transport proof.
Replay requires atomic transactional consumption of nonce across all workers (linearizable unique claim); a read/append JSONL per process is not such a proof.
Chain h_i=SHA256(domain || canonical(receipt_i without own hash || h_(i-1))). A chained hash alone is not a digital signature or execution proof.
Base64 encodes bytes reversibly; it confers zero authenticity, secrecy or permission.

## 6. Device/system/LLM independence invariant
Agnostic contracts depend on canonical byte schema and mathematical semantics, not OS paths, tools, device names or model providers. Native platform adapters map verified observations into canonical type and timing; verifier must label Windows host PnP Apple observation as HOST_USB_PNP, not NATIVE_IOS_EXECUTION. No LLM may mint governance bits by text generation. All conformance vectors must run without an LLM.

## 7. Candidate code and acceptance boundary
operator/c3-mathematical-foundation.mjs: pure candidate 7-bit codec, Base64 wire, radix64 numeral converter, hash checks and seven-bit obligation product.
tests/c3-mathematical-foundation.test.mjs: canonical 16x6 Golden matrix, Golden numeral vectors, reversible pack/unpack, 84-byte/112-char fixed size, altered hash rejection, invalid-cell denial and every failed verification bit forcing product zero.
These are NOT YET REMOTELY EXECUTED as of creation; explicit tool execution and result receipt are pending.
Do not wire into existing canonical Formula engine or production admission until source identity, independently measured 16x6 states, round-trip vectors, tests and Veritas review qualify. Preserve existing dirty Android and C3 work.

## Engineering loop
Investigate -> Diagnose -> Plan -> Implement candidate -> Test -> Validate -> Repair -> Retest -> Verify -> Evidence. No authority promotion from candidate. Canonical Formula engine and its hashes are unchanged by this task.
