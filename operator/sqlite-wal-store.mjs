/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.GOVERNANCE.SQLITE_WAL_STORE
TAG: LEEWAY.GOVERNANCE.SQLITE_WAL_STORE.V1
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
@LAW_ZERO_BRIEF = Durable SQLite WAL store replacing volatile RAM replay, lease, strike, tablet, and LKG state.
5WH:
WHAT = Persistent SQLite WAL-backed store for operation digests, turn leases, Veritas strikes, Citizen Tablets, LG-08 admissions, and LKG snapshots.
WHY = Satisfy CONTRACT-CTZ-008 and CONTRACT-FF-010: volatile RAM replay/lease/tablet state is forbidden across process restarts.
WHO = Sovereign Bridge & Runtime Supervisor under Creator Tier 0.
WHERE = operator/sqlite-wal-store.mjs.
WHEN = 2026-11-12.
HOW = Native node:sqlite DatabaseSync with PRAGMA journal_mode=WAL and synchronous=NORMAL.
LICENSE: MIT
*/

import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const DEFAULT_GOVERNANCE_DB_PATH = path.resolve(__dirname, '../state/sovereign-governance.sqlite');
export const PERSISTENCE_MODE = 'DURABLE_SQLITE_WAL';

export function openSovereignWalStore(dbPath = DEFAULT_GOVERNANCE_DB_PATH) {
  const resolvedPath = dbPath === ':memory:' ? ':memory:' : path.resolve(String(dbPath));
  if (resolvedPath !== ':memory:') {
    mkdirSync(path.dirname(resolvedPath), { recursive: true });
  }

  const db = new DatabaseSync(resolvedPath);
  if (resolvedPath !== ':memory:') {
    db.exec('PRAGMA journal_mode = WAL;');
  }
  db.exec('PRAGMA synchronous = NORMAL;');
  db.exec('PRAGMA busy_timeout = 5000;');

  db.exec(`
    CREATE TABLE IF NOT EXISTS used_digests (
      replay_key TEXT PRIMARY KEY,
      work_id TEXT NOT NULL,
      worker_id TEXT NOT NULL,
      handler_id TEXT NOT NULL,
      digest TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS turn_leases (
      lease_id TEXT PRIMARY KEY,
      worker_id TEXT NOT NULL,
      work_id TEXT NOT NULL,
      status TEXT NOT NULL,
      issued_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS strike_ledger (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      worker_id TEXT NOT NULL,
      lease_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      matched_patterns_json TEXT NOT NULL,
      timestamp TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS citizen_tablets (
      citizen_id TEXT PRIMARY KEY,
      tablet_id TEXT NOT NULL UNIQUE,
      genesis_seed_hash TEXT NOT NULL,
      caste TEXT NOT NULL,
      home_node_id TEXT NOT NULL,
      platform_capability_class TEXT NOT NULL,
      persistence TEXT NOT NULL,
      tablet_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS learning_admissions (
      replay_key TEXT PRIMARY KEY,
      request_id TEXT NOT NULL,
      outcome_id TEXT NOT NULL,
      receipt_hash TEXT NOT NULL,
      grant_reference TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS lkg_snapshots (
      snapshot_id TEXT PRIMARY KEY,
      target_id TEXT NOT NULL,
      label TEXT NOT NULL,
      file_path TEXT NOT NULL,
      sha256 TEXT NOT NULL,
      state_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  const stmtHasDigest = db.prepare('SELECT 1 AS hit FROM used_digests WHERE replay_key = ?');
  const stmtInsertDigest = db.prepare(
    'INSERT INTO used_digests (replay_key, work_id, worker_id, handler_id, digest, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  );

  const stmtInsertLease = db.prepare(
    'INSERT INTO turn_leases (lease_id, worker_id, work_id, status, issued_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const stmtGetLease = db.prepare('SELECT * FROM turn_leases WHERE lease_id = ?');
  const stmtUpdateLease = db.prepare('UPDATE turn_leases SET status = ?, updated_at = ? WHERE lease_id = ?');

  const stmtInsertStrike = db.prepare(
    'INSERT INTO strike_ledger (worker_id, lease_id, reason, matched_patterns_json, timestamp) VALUES (?, ?, ?, ?, ?)'
  );
  const stmtGetStrikesAll = db.prepare('SELECT * FROM strike_ledger ORDER BY id ASC');
  const stmtGetStrikesWorker = db.prepare('SELECT * FROM strike_ledger WHERE worker_id = ? ORDER BY id ASC');

  const stmtUpsertCitizen = db.prepare(`
    INSERT INTO citizen_tablets (
      citizen_id, tablet_id, genesis_seed_hash, caste, home_node_id,
      platform_capability_class, persistence, tablet_json, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(citizen_id) DO UPDATE SET
      tablet_id = excluded.tablet_id,
      genesis_seed_hash = excluded.genesis_seed_hash,
      caste = excluded.caste,
      home_node_id = excluded.home_node_id,
      platform_capability_class = excluded.platform_capability_class,
      persistence = excluded.persistence,
      tablet_json = excluded.tablet_json,
      updated_at = excluded.updated_at
  `);
  const stmtGetCitizen = db.prepare('SELECT * FROM citizen_tablets WHERE citizen_id = ?');
  const stmtListCitizens = db.prepare('SELECT * FROM citizen_tablets ORDER BY citizen_id ASC');
  const stmtDeleteCitizen = db.prepare('DELETE FROM citizen_tablets WHERE citizen_id = ?');

  const stmtHasLearning = db.prepare('SELECT 1 AS hit FROM learning_admissions WHERE replay_key = ?');
  const stmtInsertLearning = db.prepare(
    'INSERT INTO learning_admissions (replay_key, request_id, outcome_id, receipt_hash, grant_reference, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  );

  const stmtInsertLkg = db.prepare(
    'INSERT OR REPLACE INTO lkg_snapshots (snapshot_id, target_id, label, file_path, sha256, state_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  const stmtLatestLkg = db.prepare(
    'SELECT * FROM lkg_snapshots WHERE target_id = ? ORDER BY created_at DESC LIMIT 1'
  );
  const stmtListLkg = db.prepare(
    'SELECT * FROM lkg_snapshots WHERE target_id = ? ORDER BY created_at DESC'
  );

  return {
    dbPath: resolvedPath,
    persistence: PERSISTENCE_MODE,

    hasUsedDigest(replayKey) {
      return Boolean(stmtHasDigest.get(replayKey));
    },

    recordUsedDigest({ replayKey, workId, workerId, handlerId, digest }) {
      stmtInsertDigest.run(replayKey, workId, workerId, handlerId, digest, new Date().toISOString());
    },

    createTurnLease({ leaseId, workerId, workId, status = 'ACTIVE', issuedAt = new Date().toISOString() }) {
      stmtInsertLease.run(leaseId, workerId, workId, status, issuedAt, issuedAt);
      return { leaseId, workerId, workId, status, issuedAt, updatedAt: issuedAt };
    },

    getTurnLease(leaseId) {
      const row = stmtGetLease.get(leaseId);
      if (!row) return null;
      return {
        leaseId: row.lease_id,
        workerId: row.worker_id,
        workId: row.work_id,
        status: row.status,
        issuedAt: row.issued_at,
        updatedAt: row.updated_at
      };
    },

    updateTurnLeaseStatus(leaseId, status) {
      stmtUpdateLease.run(status, new Date().toISOString(), leaseId);
    },

    appendStrike({ workerId, leaseId, reason, matchedPatterns = [], timestamp = new Date().toISOString() }) {
      stmtInsertStrike.run(workerId, leaseId, reason, JSON.stringify(matchedPatterns), timestamp);
    },

    getStrikes(workerId = null) {
      const rows = workerId ? stmtGetStrikesWorker.all(workerId) : stmtGetStrikesAll.all();
      return rows.map((row) => ({
        id: row.id,
        workerId: row.worker_id,
        leaseId: row.lease_id,
        reason: row.reason,
        matchedPatterns: JSON.parse(row.matched_patterns_json),
        timestamp: row.timestamp
      }));
    },

    saveCitizenTablet(citizen) {
      const now = new Date().toISOString();
      stmtUpsertCitizen.run(
        citizen.citizenId || citizen.agentId,
        citizen.tablet.tabletId,
        citizen.genesisSeedHash,
        citizen.caste,
        citizen.homeNodeId,
        citizen.platformCapabilityClass,
        citizen.tablet.persistence,
        JSON.stringify(citizen),
        now
      );
    },

    getCitizenTablet(citizenId) {
      const row = stmtGetCitizen.get(citizenId);
      return row ? JSON.parse(row.tablet_json) : null;
    },

    listCitizenTablets() {
      return stmtListCitizens.all().map((row) => JSON.parse(row.tablet_json));
    },

    deleteCitizenTablet(citizenId) {
      return stmtDeleteCitizen.run(citizenId).changes;
    },

    hasLearningAdmission(replayKey) {
      return Boolean(stmtHasLearning.get(replayKey));
    },

    recordLearningAdmission({ replayKey, requestId, outcomeId, receiptHash, grantReference }) {
      stmtInsertLearning.run(replayKey, requestId, outcomeId, receiptHash, grantReference, new Date().toISOString());
    },

    saveLkgSnapshot({ snapshotId, targetId, label, filePath, sha256, state }) {
      const createdAt = new Date().toISOString();
      stmtInsertLkg.run(snapshotId, targetId, label, filePath, sha256, JSON.stringify(state), createdAt);
      return { snapshotId, targetId, label, filePath, sha256, createdAt };
    },

    getLatestLkgSnapshot(targetId) {
      const row = stmtLatestLkg.get(targetId);
      if (!row) return null;
      return {
        snapshotId: row.snapshot_id,
        targetId: row.target_id,
        label: row.label,
        filePath: row.file_path,
        sha256: row.sha256,
        state: JSON.parse(row.state_json),
        createdAt: row.created_at
      };
    },

    listLkgSnapshots(targetId) {
      return stmtListLkg.all(targetId).map((row) => ({
        snapshotId: row.snapshot_id,
        targetId: row.target_id,
        label: row.label,
        filePath: row.file_path,
        sha256: row.sha256,
        state: JSON.parse(row.state_json),
        createdAt: row.created_at
      }));
    },

    close() {
      db.close();
    }
  };
}
