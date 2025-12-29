-- Extensions required for Cortexide
-- Execute this first before all other migrations

-- UUID generation (v4 random UUIDs)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Advisory locks (used by lock service)
-- Note: pg_advisory_lock is built-in, no extension needed

-- Verify extensions
SELECT extname, extversion FROM pg_extension WHERE extname = 'pgcrypto';
