-- Blueprints table (deployment templates)
CREATE TABLE blueprints (
  blueprint_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  provider TEXT NOT NULL,
  schema JSONB NOT NULL,  -- full Blueprint JSON
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT version_format CHECK (version ~ '^\d+\.\d+\.\d+$'),
  CONSTRAINT provider_valid CHECK (provider IN ('mock', 'azure', 'aws', 'gcp')),
  UNIQUE(tenant_id, name, version)
);

-- Indexes
CREATE INDEX idx_blueprints_tenant ON blueprints(tenant_id);
CREATE INDEX idx_blueprints_name ON blueprints(tenant_id, name);

-- RLS (v0.1: allow all; v0.3+: tenant_id scoped)
ALTER TABLE blueprints ENABLE ROW LEVEL SECURITY;

-- TODO(v0.3): Replace with proper tenant isolation:
-- CREATE POLICY tenant_isolation ON blueprints
--   FOR ALL
--   USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
CREATE POLICY tenant_isolation_v01 ON blueprints
  FOR ALL
  USING (true);

-- Add FK to environments (now that blueprints exists)
ALTER TABLE environments
  ADD CONSTRAINT fk_blueprint
  FOREIGN KEY (blueprint_id)
  REFERENCES blueprints(blueprint_id)
  ON DELETE SET NULL;

-- Seed data (mock-webapp blueprint)
INSERT INTO blueprints (tenant_id, name, version, provider, schema)
SELECT
  tenant_id,
  'mock-webapp',
  '1.0.0',
  'mock',
  '{
    "name": "mock-webapp",
    "version": "1.0.0",
    "provider": "mock",
    "components": [
      {"id": "web-vm-pool", "type": "compute.vmss", "config": {"instance_count": 2}},
      {"id": "load-balancer", "type": "network.loadbalancer", "config": {"backend_pool": "web-vm-pool", "health_probe": "/healthz"}}
    ],
    "traffic_strategy": {"type": "canary", "steps": [10, 25, 50, 100], "soak_duration_seconds": 300},
    "readiness_checks": [{"component_id": "web-vm-pool", "check_type": "http", "endpoint": "http://web-vm-pool/healthz", "timeout_seconds": 120, "retries": 3}],
    "metrics_config": {
      "sources": [{"type": "mock", "config": {"baseline_error_rate": 0.001, "baseline_latency_p95_ms": 200}}],
      "metrics": [
        {"name": "error_rate", "query": "mock", "unit": "percent"},
        {"name": "latency_p95", "query": "mock", "unit": "milliseconds"}
      ],
      "observation_window_seconds": 300
    },
    "decision_rules": [
      {"metric": "error_rate", "operator": ">", "threshold": 0.01, "action": "rollback", "severity": "critical"},
      {"metric": "latency_p95", "operator": ">", "threshold": 300, "action": "rollback", "severity": "critical"}
    ],
    "policies_required": ["baseline-v1"],
    "evidence_requirements": {"retention_days": 90, "sign_manifest": false}
  }'::jsonb
FROM tenants
WHERE slug = 't_default'
ON CONFLICT (tenant_id, name, version) DO NOTHING;

-- Update env to reference blueprint
UPDATE environments
SET blueprint_id = (
  SELECT blueprint_id FROM blueprints
  WHERE name = 'mock-webapp' AND version = '1.0.0'
)
WHERE name = 'env_mock_dev';
