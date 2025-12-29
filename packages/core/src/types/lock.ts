/**
 * Lock service types
 */

export interface Lock {
  lock_id: string;
  tenant_id: string;
  env_id: string;
  run_id: string;
  acquired_at: Date;
  expires_at: Date;
  last_heartbeat_at: Date;
  released_at: Date | null;
  override_reason: string | null;
}

export interface LockRequest {
  tenant_id: string;
  env_id: string;
  run_id: string;
  ttl_seconds: number;
  override_reason?: string;
}

export interface LockResult {
  success: boolean;
  lock?: Lock;
  error?: string;
  current_holder?: string;
}
