# FORGR Public Release Runbook

## Before staging

- Provision PostgreSQL and set `FORGR_DATABASE_URL`; do not use SQLite in production.
- Generate `FORGR_SECRET_KEY` with a cryptographically secure random generator. Set a unique `FORGR_SEED_PASSWORD`, then rotate or disable bootstrap accounts after first login.
- Set `FORGR_CORS_ORIGINS` to the exact staging or production frontend origin. Serve both services only over HTTPS.
- Add a real migration system (Alembic or equivalent). Capture the current schema as an initial migration; run migrations in staging before production.
- Configure encrypted database and resume-storage backups. Perform a restore into an isolated database and verify application startup and sample queries.
- Configure centralized structured logs, error tracking, uptime monitoring, and alerts for 5xx, 401/403 spikes, 429 responses, failed imports, disk usage, database health, and backup failures.

## Validation gates

- Run the complete backend test suite and frontend `npm run lint` and `npm run build`.
- Test admin, faculty, student, parent, placement, and recruiter permissions, including IDOR attempts.
- Test CSV preview, valid import, invalid rows, duplicate rows, replace mode, append mode, batch history, authenticated error-report download, and rollback after an import failure.
- Validate ML outputs against an approved production-like labeled sample. Record accuracy, drift thresholds, model version, and the deterministic fallback behavior for missing or invalid features.
- Complete written acceptance tests for admin, student, and parent workflows on staging.
- Confirm privacy notices, consent and retention rules, least-privilege access, resume deletion, export/correction requests, audit-log retention, and processor agreements for student data.

## Production deployment and rollback

- Deploy the API and frontend from a pinned commit through CI, with secrets supplied by the hosting secret manager.
- Run the migration, smoke-test `/health`, login, role dashboards, and one non-destructive history lookup.
- Keep the previous application image and database backup available. On failure, stop traffic, restore the last known-good image, and restore the database only when the migration is reversible or the backup is newer than the migration.
- Document an owner, escalation contact, incident channel, maintenance window, and public support address before launch.
- Start with a controlled pilot, monitor for 24 hours, then expand access gradually.
