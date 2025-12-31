/**
 * Evidence Store
 *
 * Immutable artifact storage with SHA-256 hashing and mandatory persistence
 */

import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import { EvidenceArtifact, RunManifest, EvidenceStoreConfig } from '../types/evidence';
import { PhaseArtifact } from '../types/phase';
import { DatabaseClient } from '../lib/database';

interface EvidenceArtifactRow {
  artifact_id: string;
  run_id: string;
  tenant_id: string;
  phase: number;
  artifact_type: string;
  storage_path: string;
  hash_sha256: string;
  size_bytes: number;
  created_at: string;
  metadata: Record<string, unknown>;
}

interface RunRow {
  run_id: string;
  tenant_id: string;
  env_id: string;
  started_at: string;
  completed_at: string | null;
  decision: string | null;
}

export class EvidenceStore {
  constructor(
    private config: EvidenceStoreConfig,
    private db: DatabaseClient
  ) {}

  /**
   * Store phase artifact (MANDATORY - run fails if this fails)
   */
  async storeArtifact(
    run_id: string,
    tenant_id: string,
    phase: number,
    artifact: PhaseArtifact
  ): Promise<EvidenceArtifact> {
    try {
      // Compute canonical JSON hash (stable ordering)
      const canonicalContent = this.canonicalizeJSON(artifact.content);
      const hash = this.computeHash(canonicalContent);

      // Generate storage path
      const artifact_id = crypto.randomUUID();
      const storage_path = this.generateStoragePath(tenant_id, run_id, phase, artifact_id);

      // Write to filesystem (mandatory)
      await this.writeToStorage(storage_path, canonicalContent);

      // Get file size
      const stats = await fs.stat(storage_path);
      const size_bytes = stats.size;

      // Store metadata in database
      await this.db.query(
        `INSERT INTO evidence_artifacts (artifact_id, run_id, tenant_id, phase, artifact_type, storage_path, hash_sha256, size_bytes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [artifact_id, run_id, tenant_id, phase, artifact.type, storage_path, hash, size_bytes]
      );

      return {
        artifact_id,
        run_id,
        tenant_id,
        phase,
        artifact_type: artifact.type,
        storage_path,
        hash_sha256: hash,
        size_bytes,
        created_at: new Date(),
        metadata: {},
      };
    } catch (error) {
      // Evidence write failures are MANDATORY failures - abort run
      throw new Error(`CRITICAL: Evidence storage failed for run ${run_id} phase ${phase}: ${(error as Error).message}`);
    }
  }

  /**
   * Fetch all artifacts for a run
   */
  async fetchArtifacts(run_id: string): Promise<EvidenceArtifact[]> {
    const result = await this.db.query<EvidenceArtifactRow>(
      `SELECT * FROM evidence_artifacts WHERE run_id = $1 ORDER BY phase ASC, created_at ASC`,
      [run_id]
    );

    return result.rows.map((row) => ({
      artifact_id: row.artifact_id,
      run_id: row.run_id,
      tenant_id: row.tenant_id,
      phase: row.phase,
      artifact_type: row.artifact_type,
      storage_path: row.storage_path,
      hash_sha256: row.hash_sha256,
      size_bytes: row.size_bytes,
      created_at: new Date(row.created_at),
      metadata: row.metadata || {},
    }));
  }

  /**
   * Generate run manifest with artifact hashes
   */
  async generateManifest(run_id: string): Promise<RunManifest> {
    // Fetch run details
    const runResult = await this.db.query<RunRow>(
      `SELECT * FROM runs WHERE run_id = $1`,
      [run_id]
    );

    if (runResult.rows.length === 0) {
      throw new Error(`Run not found: ${run_id}`);
    }

    const run = runResult.rows[0];

    // Fetch all artifacts
    const artifacts = await this.fetchArtifacts(run_id);

    // Build artifact references
    const artifact_refs = artifacts.map((a) => ({
      artifact_id: a.artifact_id,
      phase: a.phase,
      type: a.artifact_type,
      hash: a.hash_sha256,
      size_bytes: a.size_bytes,
    }));

    // Compute manifest hash (canonical JSON of all artifact hashes)
    const manifestContent = {
      run_id: run.run_id,
      artifacts: artifact_refs,
    };
    const manifest_hash = this.computeHash(this.canonicalizeJSON(manifestContent));

    const manifest: RunManifest = {
      run_id: run.run_id,
      tenant_id: run.tenant_id,
      env_id: run.env_id,
      started_at: new Date(run.started_at),
      completed_at: run.completed_at ? new Date(run.completed_at) : new Date(),
      decision: run.decision || 'unknown',
      artifacts: artifact_refs,
      manifest_hash,
      signature: undefined, // v0.1: unsigned; v1.0: HMAC/Cosign
    };

    return manifest;
  }

  /**
   * Compute SHA-256 hash of content
   */
  private computeHash(content: string): string {
    return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
  }

  /**
   * Canonicalize JSON for deterministic hashing
   * Sorts keys alphabetically and removes whitespace
   */
  private canonicalizeJSON(obj: unknown): string {
    return JSON.stringify(obj, Object.keys(obj as object).sort(), 0);
  }

  /**
   * Generate storage path
   */
  private generateStoragePath(
    tenant_id: string,
    run_id: string,
    phase: number,
    artifact_id: string
  ): string {
    const phase_str = phase.toString().padStart(2, '0');
    return path.join(
      this.config.base_path,
      tenant_id,
      run_id,
      `phase-${phase_str}`,
      `${artifact_id}.json`
    );
  }

  /**
   * Write artifact to filesystem
   */
  private async writeToStorage(storage_path: string, content: string): Promise<void> {
    const dir = path.dirname(storage_path);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(storage_path, content, 'utf8');
  }
}
