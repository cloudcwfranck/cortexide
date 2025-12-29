-- Evidence artifacts table (metadata + storage pointers)
CREATE TABLE evidence_artifacts (
  artifact_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES runs(run_id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  phase INTEGER NOT NULL,
  artifact_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,  -- v0.1: /tmp/cortexide-evidence/{tenant_id}/{run_id}/{phase}/{artifact_id}.json
  hash_sha256 TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb,

  CONSTRAINT valid_phase CHECK (phase BETWEEN 1 AND 10),
  CONSTRAINT valid_hash CHECK (hash_sha256 ~ '^[a-f0-9]{64}$'),
  UNIQUE(run_id, phase, artifact_type)
);

-- Indexes
CREATE INDEX idx_evidence_run ON evidence_artifacts(run_id);
CREATE INDEX idx_evidence_tenant ON evidence_artifacts(tenant_id);
CREATE INDEX idx_evidence_created ON evidence_artifacts(created_at DESC);

-- RLS (v0.1: allow all; v0.3+: tenant_id scoped)
ALTER TABLE evidence_artifacts ENABLE ROW LEVEL SECURITY;

-- TODO(v0.3): Replace with proper tenant isolation:
-- CREATE POLICY tenant_isolation ON evidence_artifacts
--   FOR ALL
--   USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
CREATE POLICY tenant_isolation_v01 ON evidence_artifacts
  FOR ALL
  USING (true);

-- Enforce immutability (append-only)
CREATE RULE evidence_artifacts_no_update AS
  ON UPDATE TO evidence_artifacts
  DO INSTEAD NOTHING;

CREATE RULE evidence_artifacts_no_delete AS
  ON DELETE TO evidence_artifacts
  DO INSTEAD NOTHING;

-- Helper function: generate storage path
CREATE OR REPLACE FUNCTION generate_storage_path(
  p_tenant_id UUID,
  p_run_id UUID,
  p_phase INTEGER,
  p_artifact_id UUID
)
RETURNS TEXT AS $$
BEGIN
  RETURN format(
    '/tmp/cortexide-evidence/%s/%s/phase-%s/%s.json',
    p_tenant_id,
    p_run_id,
    lpad(p_phase::TEXT, 2, '0'),
    p_artifact_id
  );
END;
$$ LANGUAGE plpgsql;
