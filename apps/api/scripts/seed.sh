#!/bin/bash
# Seed additional test data (optional)
# Most seed data is already in migrations (001-003)

set -e

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-cortexide}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-postgres}"

echo "============================================"
echo "Cortexide Database Seeding"
echo "============================================"
echo "Database: $DB_NAME"
echo "============================================"
echo ""

# Additional seed data can be added here
# For v0.1, all necessary seed data is in migrations

echo "✅ Seed data already applied via migrations"
echo "   - Tenant: t_default"
echo "   - Environment: env_mock_dev"
echo "   - Blueprint: mock-webapp v1.0.0"
echo ""
echo "No additional seeding required for v0.1"
