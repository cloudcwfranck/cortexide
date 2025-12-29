/**
 * Lock Service
 *
 * Distributed lock management with advisory locks and heartbeat mechanism
 */

import { Lock, LockRequest, LockResult } from '../types/lock';
import { DatabaseClient } from '../lib/database';

export class LockService {
  constructor(private db: DatabaseClient) {}

  /**
   * Acquire environment lock using Postgres advisory lock for atomicity
   */
  async acquireLock(request: LockRequest): Promise<LockResult> {
    const result = await this.db.query(
      `SELECT * FROM acquire_environment_lock($1, $2, $3, $4)`,
      [request.tenant_id, request.env_id, request.run_id, request.ttl_seconds]
    );

    const row = result.rows[0];

    if (row.success) {
      return {
        success: true,
        lock: {
          lock_id: row.lock_id,
          tenant_id: request.tenant_id,
          env_id: request.env_id,
          run_id: request.run_id,
          acquired_at: new Date(),
          expires_at: new Date(Date.now() + request.ttl_seconds * 1000),
          last_heartbeat_at: new Date(),
          released_at: null,
          override_reason: request.override_reason || null,
        },
      };
    } else {
      return {
        success: false,
        error: row.error_message,
        current_holder: row.current_holder,
      };
    }
  }

  /**
   * Release lock
   */
  async releaseLock(lock_id: string, run_id: string): Promise<void> {
    await this.db.query(
      `UPDATE locks SET released_at = NOW() WHERE lock_id = $1 AND run_id = $2 AND released_at IS NULL`,
      [lock_id, run_id]
    );
  }

  /**
   * Check if environment is locked
   */
  async checkLock(env_id: string): Promise<Lock | null> {
    const result = await this.db.query(
      `SELECT * FROM locks WHERE env_id = $1 AND released_at IS NULL LIMIT 1`,
      [env_id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      lock_id: row.lock_id,
      tenant_id: row.tenant_id,
      env_id: row.env_id,
      run_id: row.run_id,
      acquired_at: new Date(row.acquired_at),
      expires_at: new Date(row.expires_at),
      last_heartbeat_at: new Date(row.last_heartbeat_at),
      released_at: row.released_at ? new Date(row.released_at) : null,
      override_reason: row.override_reason,
    };
  }

  /**
   * Extend lock TTL (for long-running deployments)
   */
  async extendLock(lock_id: string, additional_seconds: number): Promise<void> {
    await this.db.query(
      `UPDATE locks SET expires_at = expires_at + INTERVAL '${additional_seconds} seconds' WHERE lock_id = $1 AND released_at IS NULL`,
      [lock_id]
    );
  }

  /**
   * Update heartbeat (called by worker every 30s)
   */
  async updateHeartbeat(lock_id: string): Promise<boolean> {
    const result = await this.db.query(`SELECT update_lock_heartbeat($1)`, [lock_id]);
    return result.rows[0]?.update_lock_heartbeat === true;
  }

  /**
   * Admin override: force release lock
   */
  async forceRelease(env_id: string, reason: string): Promise<void> {
    await this.db.query(
      `UPDATE locks SET released_at = NOW(), override_reason = $1 WHERE env_id = $2 AND released_at IS NULL`,
      [reason, env_id]
    );
  }

  /**
   * Background job: release expired locks
   * Should be called periodically (e.g., every minute)
   */
  async releaseExpiredLocks(): Promise<number> {
    const result = await this.db.query(`SELECT release_expired_locks()`, []);
    return result.rows[0]?.release_expired_locks || 0;
  }
}
