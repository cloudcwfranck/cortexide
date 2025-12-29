-- Runs table (deployment executions)
CREATE TYPE run_state AS ENUM (
  'PENDING',
  'LOCKED',
  'VERIFIED',
  'POLICY_CHECK',
  'PROVISIONING',
  'READY_WAIT',
  'TRAFFIC_SHIFT',
  'OBSERVING',
  'DECISION_MADE',
  'EVIDENCE_STORED',
  'COMPLETED',
  'ROLLED_BACK',
  'FAILED'
);

CREATE TABLE runs (
  run_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  env_id UUID NOT NULL REFERENCES environments(env_id) ON DELETE CASCADE,
  blueprint_id UUID NOT NULL REFERENCES blueprints(blueprint_id) ON DELETE RESTRICT,
  state run_state NOT NULL DEFAULT 'PENDING',
  config JSONB NOT NULL DEFAULT '{}'::jsonb,  -- runtime params (v0.1: plaintext)
  initiated_by TEXT,  -- v0.1: API key or "cli"; v0.3: user_id
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  decision TEXT,
  decision_reason TEXT,
  current_phase INTEGER,  -- current phase number (1-10) for operator visibility
  lock_id UUID,  -- reference to lock (if acquired)

  CONSTRAINT valid_decision CHECK (decision IS NULL OR decision IN ('promote', 'rollback', 'hold')),
  CONSTRAINT valid_current_phase CHECK (current_phase IS NULL OR (current_phase BETWEEN 1 AND 10))
);

-- Indexes
CREATE INDEX idx_runs_tenant ON runs(tenant_id);
CREATE INDEX idx_runs_env ON runs(env_id);
CREATE INDEX idx_runs_state ON runs(state);
CREATE INDEX idx_runs_started ON runs(started_at DESC);
CREATE INDEX idx_runs_lock ON runs(lock_id) WHERE lock_id IS NOT NULL;

-- RLS (v0.1: allow all; v0.3+: tenant_id scoped)
ALTER TABLE runs ENABLE ROW LEVEL SECURITY;

-- TODO(v0.3): Replace with proper tenant isolation:
-- CREATE POLICY tenant_isolation ON runs
--   FOR ALL
--   USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
CREATE POLICY tenant_isolation_v01 ON runs
  FOR ALL
  USING (true);

-- Prevent updates to immutable fields
CREATE OR REPLACE FUNCTION enforce_run_immutability()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.run_id IS DISTINCT FROM NEW.run_id THEN
    RAISE EXCEPTION 'run_id is immutable';
  END IF;
  IF OLD.tenant_id IS DISTINCT FROM NEW.tenant_id THEN
    RAISE EXCEPTION 'tenant_id is immutable';
  END IF;
  IF OLD.env_id IS DISTINCT FROM NEW.env_id THEN
    RAISE EXCEPTION 'env_id is immutable';
  END IF;
  IF OLD.blueprint_id IS DISTINCT FROM NEW.blueprint_id THEN
    RAISE EXCEPTION 'blueprint_id is immutable';
  END IF;
  IF OLD.started_at IS DISTINCT FROM NEW.started_at THEN
    RAISE EXCEPTION 'started_at is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER runs_immutability
  BEFORE UPDATE ON runs
  FOR EACH ROW
  EXECUTE FUNCTION enforce_run_immutability();
