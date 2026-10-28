/* LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.DEPLOYMENT.SOURCE_GATE
TAG: LEEWAY.THREE_PART.CONTINUUM_SOURCE_QUALIFIER.V1
WHO: LeeWay Industries / owner-authorized maintainers
WHAT: Inspect canonical GitHub/Vercel routes and external Continuum database/storage inventory without inventing live bindings
WHEN: 2026-10-28
WHERE: operator/identity/qualify-three-part-sources.mjs
WHY: Enforce merged LeeWay Standards PR #58 across the actual multi-database and storage contracts
HOW: Strict JSON inventory + Vercel route validation, preserving UNVERIFIED live states
AUTHORITY: Source-only; never authorizes OAuth, Continuum writes, device commands or production
LICENSE: MIT
*/
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

export const STANDARDS_MERGE_SHA = '6dce9c8a1f30a182b7b149c060e3df5daebe317e';
const REQUIRED_DATABASES = ['sqlite', 'duckdb', 'pouchdb', 'electric_postgresql'];
const REQUIRED_COMPARTMENTS = ['cloudflare-r2', 'oracle-oci-object', 'github-release'];
const REQUIRED_CELLS = ['runtime-state', 'evidence-vault', 'memory', 'learning'];

function requireCondition(condition, code) {
  if (!condition) throw new Error(code);
}
function uniqueIndexed(items, expected, code) {
  requireCondition(Array.isArray(items), code + '_MISSING');
  const keys = items.map(item => item?.id);
  requireCondition(keys.every(id => typeof id === 'string' && id.length > 0), code + '_INVALID');
  requireCondition(new Set(keys).size === keys.length, code + '_DUPLICATE');
  for (const id of expected) requireCondition(keys.includes(id), code + '_REQUIRED_' + id.toUpperCase().replace(/[^A-Z0-9]/g, '_'));
  return new Map(items.map(item => [item.id, item]));
}
function validState(item) {
  return typeof item?.status === 'string' && item.status.length > 0 && item.status.length <= 128;
}
function sourceStatus(item) {
  // A source manifest is not a probe. Its reported status is descriptive only.
  return { id: item.id, role: item.role, sourceReportedState: item.status ?? item.state ?? 'NOT_REPORTED', liveVerified: false };
}

export function inspectThreePartSources({ vercel, continuumTopology } = {}) {
  requireCondition(vercel && typeof vercel === 'object' && !Array.isArray(vercel), 'VERCEL_CONFIG_MISSING');
  requireCondition(Array.isArray(vercel.rewrites), 'VERCEL_REWRITES_MISSING');
  const rewrites = new Map();
  for (const item of vercel.rewrites) {
    requireCondition(typeof item?.source === 'string' && typeof item?.destination === 'string', 'VERCEL_REWRITE_INVALID');
    requireCondition(!rewrites.has(item.source), 'VERCEL_REWRITE_DUPLICATE');
    rewrites.set(item.source, item.destination);
  }
  requireCondition(rewrites.get('/mcp') === '/api/mcp', 'VERCEL_MCP_ROUTE_MISSING');
  requireCondition(rewrites.get('/.well-known/oauth-protected-resource/mcp') === '/api/oauth-protected-resource', 'VERCEL_OAUTH_ROUTE_MISSING');
  requireCondition(Number.isInteger(vercel.functions?.['api/mcp.mjs']?.maxDuration)
    && vercel.functions['api/mcp.mjs'].maxDuration >= 30, 'VERCEL_MCP_FUNCTION_BUDGET_INVALID');

  const topology = continuumTopology;
  requireCondition(topology?.schema === 'leeway.continuum.storage-topology.candidate.v1', 'CONTINUUM_TOPOLOGY_SCHEMA_INVALID');
  requireCondition(topology.canonicalAuthority?.component === 'LeeWay Continuum', 'CANONICAL_CONTINUUM_AUTHORITY_MISSING');
  requireCondition(typeof topology.canonicalAuthority.liveBinding === 'string', 'CANONICAL_CONTINUUM_LIVE_STATE_MISSING');
  const databases = uniqueIndexed(topology.databases, REQUIRED_DATABASES, 'CONTINUUM_DATABASE');
  const compartments = uniqueIndexed(topology.storageCompartments, REQUIRED_COMPARTMENTS, 'CONTINUUM_COMPARTMENT');
  const cells = uniqueIndexed(topology.logicalCells, REQUIRED_CELLS, 'CONTINUUM_CELL');

  for (const item of databases.values()) requireCondition(validState(item) && typeof item.role === 'string', 'CONTINUUM_DATABASE_STATUS_INVALID');
  for (const item of compartments.values()) requireCondition(validState(item) && typeof item.role === 'string', 'CONTINUUM_COMPARTMENT_STATUS_INVALID');
  for (const item of cells.values()) requireCondition(typeof item.state === 'string', 'CONTINUUM_CELL_STATUS_INVALID');
  requireCondition(compartments.get('github-release').role === 'RELEASE_PACKAGES_AND_ENCRYPTED_RELEASE_EVIDENCE_ONLY', 'GITHUB_RELEASE_MUST_NOT_BE_PRIMARY_DATABASE');
  requireCondition(typeof topology.capacity?.executionAuthorized === 'boolean', 'CONTINUUM_CAPACITY_AUTHORITY_UNDECLARED');
  if (topology.status === 'CANDIDATE_SOURCE_ONLY') {
    requireCondition(topology.capacity.executionAuthorized === false, 'CANDIDATE_TOPOLOGY_CANNOT_AUTHORIZE_EXECUTION');
  }

  return Object.freeze({
    phase: 'SOURCE_CONTRACT',
    sourceContract: 'PASS',
    liveIntegration: 'UNVERIFIED',
    authenticatedMcp: 'NOT_PROBED',
    deviceExecution: 'NOT_AUTHORIZED_BY_THIS_GATE',
    continuumCanonicalReadback: 'NOT_PROBED',
    veritasReceiptLearning: 'NOT_PROBED',
    standardsMergeSha: STANDARDS_MERGE_SHA,
    sourceReportedContinuumBinding: topology.canonicalAuthority.liveBinding,
    databases: [...databases.values()].map(sourceStatus),
    storageCompartments: [...compartments.values()].map(sourceStatus),
    logicalCells: [...cells.values()].map(item => ({ id: item.id, sourceReportedState: item.state, liveVerified: false })),
    blockers: [
      'PUBLIC_VERCEL_DEPLOYMENT_NOT_PROVEN',
      'POCKET_ID_OWNER_AUTHENTICATION_NOT_PROVEN',
      'QUALIFIED_RUNTIME_FABRIC_UPSTREAM_NOT_PROVEN',
      'ORIGINAL_CONTINUUM_PROVIDER_READBACK_NOT_PROVEN',
      'DATABASE_AND_STORAGE_LIVE_BINDINGS_NOT_PROVEN',
      'VERITAS_RECEIPT_LEARNING_CHAIN_NOT_PROVEN'
    ]
  });
}

async function main() {
  const indexOf = flag => process.argv.indexOf(flag);
  const vercelIndex = indexOf('--vercel');
  const topologyIndex = indexOf('--topology');
  if (vercelIndex < 0 || topologyIndex < 0 || !process.argv[vercelIndex + 1] || !process.argv[topologyIndex + 1]) {
    throw new Error('USAGE_REQUIRED: --vercel <path> --topology <path>');
  }
  const [vercel, continuumTopology] = await Promise.all([
    readFile(process.argv[vercelIndex + 1], 'utf8').then(JSON.parse),
    readFile(process.argv[topologyIndex + 1], 'utf8').then(JSON.parse)
  ]);
  console.log(JSON.stringify(inspectThreePartSources({ vercel, continuumTopology }), null, 2));
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main().catch(error => {
    console.error(JSON.stringify({ phase: 'SOURCE_CONTRACT', sourceContract: 'FAIL', code: error?.message || 'SOURCE_QUALIFICATION_FAILED', liveIntegration: 'UNVERIFIED' }));
    process.exitCode = 1;
  });
}
