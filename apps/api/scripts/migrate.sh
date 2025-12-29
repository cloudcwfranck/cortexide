#!/bin/bash
# Database migration runner for Cortexide
# Executes all migrations in order

set -e

# Configuration from environment or defaults
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-cortexide}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-postgres}"

MIGRATIONS_DIR="$(cd "$(dirname "$0")/../src/db/migrations" && pwd)"

echo "============================================"
echo "Cortexide Database Migrations"
echo "============================================"
echo "Host: $DB_HOST:$DB_PORT"
echo "Database: $DB_NAME"
echo "User: $DB_USER"
echo "Migrations: $MIGRATIONS_DIR"
echo "============================================"
echo ""

# Check if database exists
if ! PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
  echo "Database '$DB_NAME' does not exist. Creating..."
  PGPASSWORD="$DB_PASSWORD" createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME"
  echo "✅ Database created"
  echo ""
fi

# Execute migrations in order
for migration in "$MIGRATIONS_DIR"/*.sql; do
  if [ -f "$migration" ]; then
    filename=$(basename "$migration")
    echo "📦 Applying: $filename"

    if PGPASSWORD="$DB_PASSWORD" psql \
      -h "$DB_HOST" \
      -p "$DB_PORT" \
      -U "$DB_USER" \
      -d "$DB_NAME" \
      -f "$migration" \
      -v ON_ERROR_STOP=1 \
      --quiet; then
      echo "✅ Success: $filename"
    else
      echo "❌ Failed: $filename"
      exit 1
    fi
    echo ""
  fi
done

echo "============================================"
echo "All migrations completed successfully!"
echo "============================================"
