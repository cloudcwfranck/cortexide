-- Environments table (deployment targets)
CREATE TABLE environments (
  env_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  region TEXT NOT NULL,
  provider TEXT NOT NULL,
  blueprint_id UUID,  -- nullable initially; FK added after blueprints table
  config JSONB NOT NULL DEFAULT '{}'::jsonb,  -- encrypted env vars (v0.1: plaintext)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT env_name_format CHECK (name ~ '^env_[a-z0-9_]+$'),
  CONSTRAINT provider_valid CHECK (provider IN ('mock', 'azure', 'aws', 'gcp')),
  UNIQUE(tenant_id, name)
);

-- Indexes
CREATE INDEX idx_environments_tenant ON environments(tenant_id);
CREATE INDEX idx_environments_name ON environments(tenant_id, name);

-- Audit trigger
CREATE TRIGGER environments_updated_at
  BEFORE UPDATE ON environments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS (v0.1: allow all; v0.3+: tenant_id scoped)
ALTER TABLE environments ENABLE ROW LEVEL SECURITY;

-- TODO(v0.3): Replace with proper tenant isolation:
-- CREATE POLICY tenant_isolation ON environments
--   FOR ALL
--   USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
CREATE POLICY tenant_isolation_v01 ON environments
  FOR ALL
  USING (true);

-- Seed data
INSERT INTO environments (tenant_id, name, region, provider, config)
SELECT
  tenant_id,
  'env_mock_dev',
  'local',
  'mock',
  '{"instance_count": 2}'::jsonb
FROM tenants
WHERE slug = 't_default'
ON CONFLICT (tenant_id, name) DO NOTHING;
