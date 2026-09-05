#!/usr/bin/env bash
# migrate-test.sh — Test Alembic migrations against a clean PostgreSQL instance
# Usage: ./scripts/migrate-test.sh
#
# Requires Docker for spinning up a temporary PostgreSQL container.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

CONTAINER_NAME="forgr_migration_test"
DB_USER="forgr_test"
DB_PASS="test-migration-password"
DB_NAME="forgr_migration_test"
DB_PORT="5433"

echo "═══════════════════════════════════════════════════"
echo "  FORGR Migration Test"
echo "═══════════════════════════════════════════════════"

# Cleanup on exit
cleanup() {
    echo ""
    echo "Cleaning up..."
    docker stop "$CONTAINER_NAME" 2>/dev/null || true
    docker rm "$CONTAINER_NAME" 2>/dev/null || true
}
trap cleanup EXIT

# Start clean PostgreSQL container
echo "Starting clean PostgreSQL 16 instance..."
docker run -d \
    --name "$CONTAINER_NAME" \
    -e POSTGRES_USER="$DB_USER" \
    -e POSTGRES_PASSWORD="$DB_PASS" \
    -e POSTGRES_DB="$DB_NAME" \
    -p "$DB_PORT:5432" \
    postgres:16-alpine

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
for i in {1..30}; do
    if docker exec "$CONTAINER_NAME" pg_isready -U "$DB_USER" -q 2>/dev/null; then
        echo "PostgreSQL is ready."
        break
    fi
    sleep 1
done

# Run Alembic migrations
export FORGR_DATABASE_URL="postgresql://$DB_USER:$DB_PASS@localhost:$DB_PORT/$DB_NAME"
echo ""
echo "Running Alembic migrations..."
cd "$PROJECT_ROOT"
alembic upgrade head

# Verify tables exist
echo ""
echo "Verifying tables..."
TABLES=$(docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -t -c "
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name;
")

EXPECTED_TABLES=(
    "academics"
    "attendance"
    "audit_log"
    "auth_tokens"
    "consent_records"
    "drift_reports"
    "edit_audit_log"
    "email_verifications"
    "import_history"
    "login_audit_log"
    "model_registry"
    "placements"
    "portfolios"
    "prediction_logs"
    "risk_predictions"
    "skills"
    "student_profiles"
    "students"
    "users"
)

PASS=0
FAIL=0
for table in "${EXPECTED_TABLES[@]}"; do
    if echo "$TABLES" | grep -q "$table"; then
        echo "  ✓ $table"
        ((PASS++))
    else
        echo "  ✗ $table (MISSING)"
        ((FAIL++))
    fi
done

echo ""
echo "Results: $PASS passed, $FAIL failed out of ${#EXPECTED_TABLES[@]} expected tables."

if [ "$FAIL" -gt 0 ]; then
    echo "❌ Migration test FAILED."
    exit 1
else
    echo "✅ Migration test PASSED."
fi
