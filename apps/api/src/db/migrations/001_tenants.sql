-- Tenants table (root entity for multi-tenancy)
CREATE TABLE tenants (
  tenant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  encryption_key_id TEXT NOT NULL,  -- Vault Transit key reference (v0.1: placeholder)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb,

  CONSTRAINT slug_format CHECK (slug ~ '^t_[a-z0-9_]+$')
);

-- Indexes
CREATE INDEX idx_tenants_slug ON tenants(slug);

-- Audit trigger (update updated_at)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS (v0.1: allow all; v0.3+: tenant_id scoped)
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- TODO(v0.3): Replace with proper tenant isolation:
-- CREATE POLICY tenant_isolation ON tenants
--   FOR ALL
--   USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
CREATE POLICY tenant_isolation_v01 ON tenants
  FOR ALL
  USING (true);

-- Seed data for v0.1
INSERT INTO tenants (slug, name, encryption_key_id)
VALUES ('t_default', 'Default Tenant', 'vault-transit-key-placeholder')
ON CONFLICT (slug) DO NOTHING;
