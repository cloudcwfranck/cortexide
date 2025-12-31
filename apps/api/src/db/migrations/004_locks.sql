-- Locks table (environment-level distributed locks)
CREATE TABLE locks (
  lock_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  env_id UUID NOT NULL REFERENCES environments(env_id) ON DELETE CASCADE,
  run_id UUID NOT NULL,  -- holder reference (run not created yet)
  acquired_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  last_heartbeat_at TIMESTAMPTZ NOT NULL DEFAULT now(),  -- worker heartbeat timestamp
  released_at TIMESTAMPTZ,
  override_reason TEXT,

  CONSTRAINT valid_ttl CHECK (expires_at > acquired_at)
);

-- Partial unique index to enforce single active lock per environment
-- (replaces CONSTRAINT single_active_lock which doesn't support WHERE in CREATE TABLE)
CREATE UNIQUE INDEX idx_locks_single_active ON locks(env_id) WHERE released_at IS NULL;

-- Indexes
CREATE INDEX idx_locks_env ON locks(env_id);
CREATE INDEX idx_locks_active ON locks(env_id, released_at) WHERE released_at IS NULL;
CREATE INDEX idx_locks_expired ON locks(expires_at) WHERE released_at IS NULL;
CREATE INDEX idx_locks_heartbeat ON locks(last_heartbeat_at) WHERE released_at IS NULL;

-- RLS (v0.1: allow all; v0.3+: tenant_id scoped)
ALTER TABLE locks ENABLE ROW LEVEL SECURITY;

-- TODO(v0.3): Replace with proper tenant isolation:
-- CREATE POLICY tenant_isolation ON locks
--   FOR ALL
--   USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
CREATE POLICY tenant_isolation_v01 ON locks
  FOR ALL
  USING (true);

-- Deadman cleanup function (called by background job)
-- Releases locks where TTL expired OR heartbeat stale (> 2 minutes)
CREATE OR REPLACE FUNCTION release_expired_locks()
RETURNS INTEGER AS $$
DECLARE
  released_count INTEGER;
BEGIN
  UPDATE locks
  SET released_at = now()
  WHERE released_at IS NULL
    AND (
      expires_at < now()  -- TTL expired
      OR last_heartbeat_at < now() - INTERVAL '2 minutes'  -- Heartbeat stale
    );

  GET DIAGNOSTICS released_count = ROW_COUNT;
  RETURN released_count;
END;
$$ LANGUAGE plpgsql;

-- Helper function: Update heartbeat (called by worker every 30s)
CREATE OR REPLACE FUNCTION update_lock_heartbeat(p_lock_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE locks
  SET last_heartbeat_at = now()
  WHERE lock_id = p_lock_id
    AND released_at IS NULL;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Helper function: Acquire lock with advisory lock for atomicity
-- Uses Postgres advisory lock to prevent race conditions
CREATE OR REPLACE FUNCTION acquire_environment_lock(
  p_tenant_id UUID,
  p_env_id UUID,
  p_run_id UUID,
  p_ttl_seconds INTEGER
)
RETURNS TABLE (
  success BOOLEAN,
  lock_id UUID,
  error_message TEXT,
  current_holder UUID
) AS $$
DECLARE
  v_lock_id UUID;
  v_existing_run_id UUID;
  v_advisory_lock_key BIGINT;
BEGIN
  -- Generate advisory lock key from env_id (hash to int8)
  v_advisory_lock_key := ('x' || substring(md5(p_env_id::text) from 1 for 15))::bit(60)::bigint;

  -- Acquire advisory lock (released automatically at transaction end)
  PERFORM pg_advisory_xact_lock(v_advisory_lock_key);

  -- Check for existing active lock
  SELECT run_id INTO v_existing_run_id
  FROM locks
  WHERE env_id = p_env_id
    AND released_at IS NULL
  LIMIT 1;

  IF FOUND THEN
    -- Environment is locked
    RETURN QUERY SELECT
      false AS success,
      NULL::UUID AS lock_id,
      'Environment is locked by another run'::TEXT AS error_message,
      v_existing_run_id AS current_holder;
    RETURN;
  END IF;

  -- Create new lock
  INSERT INTO locks (tenant_id, env_id, run_id, expires_at, last_heartbeat_at)
  VALUES (
    p_tenant_id,
    p_env_id,
    p_run_id,
    now() + (p_ttl_seconds || ' seconds')::INTERVAL,
    now()
  )
  RETURNING locks.lock_id INTO v_lock_id;

  -- Return success
  RETURN QUERY SELECT
    true AS success,
    v_lock_id AS lock_id,
    NULL::TEXT AS error_message,
    NULL::UUID AS current_holder;
END;
$$ LANGUAGE plpgsql;
