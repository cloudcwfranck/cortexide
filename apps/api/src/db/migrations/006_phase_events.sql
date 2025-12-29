-- Phase events table (append-only audit log)
CREATE TYPE phase_status AS ENUM ('started', 'success', 'failed');

CREATE TABLE phase_events (
  event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES runs(run_id) ON DELETE CASCADE,
  phase INTEGER NOT NULL,
  status phase_status NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  duration_ms INTEGER,
  outputs JSONB DEFAULT '{}'::jsonb,
  error TEXT,
  artifact_refs TEXT[] DEFAULT ARRAY[]::TEXT[],
  signature TEXT,  -- v0.1: NULL; v1.0: HMAC or Sigstore

  CONSTRAINT valid_phase CHECK (phase BETWEEN 1 AND 10),
  CONSTRAINT phase_duration CHECK (duration_ms IS NULL OR duration_ms >= 0),
  UNIQUE(run_id, phase, status)  -- one success/failure per phase
);

-- Indexes
CREATE INDEX idx_phase_events_run ON phase_events(run_id, phase);
CREATE INDEX idx_phase_events_timestamp ON phase_events(timestamp DESC);

-- RLS (v0.1: allow all; v0.3+: inherit from runs)
ALTER TABLE phase_events ENABLE ROW LEVEL SECURITY;

-- TODO(v0.3): Replace with proper tenant isolation:
-- CREATE POLICY tenant_isolation ON phase_events
--   FOR ALL
--   USING (run_id IN (
--     SELECT run_id FROM runs
--     WHERE tenant_id = current_setting('app.tenant_id', true)::uuid
--   ));
CREATE POLICY tenant_isolation_v01 ON phase_events
  FOR ALL
  USING (true);

-- Enforce append-only (no updates/deletes)
CREATE RULE phase_events_no_update AS
  ON UPDATE TO phase_events
  DO INSTEAD NOTHING;

CREATE RULE phase_events_no_delete AS
  ON DELETE TO phase_events
  DO INSTEAD NOTHING;

-- Helper function: check if phase completed
CREATE OR REPLACE FUNCTION is_phase_completed(p_run_id UUID, p_phase INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM phase_events
    WHERE run_id = p_run_id
      AND phase = p_phase
      AND status = 'success'
  );
END;
$$ LANGUAGE plpgsql;
