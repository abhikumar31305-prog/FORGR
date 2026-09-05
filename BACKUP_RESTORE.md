# FORGR Backup & Restore Procedures

Complete guide for backing up and restoring FORGR application, database, and file storage.

## Overview

FORGR stores data in three locations that must be backed up:

1. **PostgreSQL Database** - Student records, submissions, audit logs
2. **File Storage** - Uploaded resumes and portfolios
3. **Configuration** - Environment variables and secrets (handled separately)

## Backup Strategy

### Frequency

| Component | Frequency | Retention |
|-----------|-----------|-----------|
| Database | Every 6 hours | 30 days |
| Files | Daily | 7 days |
| Full backup | Weekly | 12 weeks |

### Automated Backup with Cron

```bash
# Edit crontab
sudo crontab -e

# Add backup jobs
# Database backup every 6 hours at 00, 06, 12, 18
0 */6 * * * /usr/local/bin/backup-forgr-db.sh

# File backup daily at 02:00 AM
0 2 * * * /usr/local/bin/backup-forgr-files.sh

# Weekly full backup every Sunday at 03:00 AM
0 3 * * 0 /usr/local/bin/backup-forgr-full.sh
```

## Docker Compose Backup/Restore

### Backup Database

```bash
# Full database backup
docker exec forgr_db pg_dump -U forgr -d forgr_prod -Fc > backups/forgr_prod_$(date +%Y%m%d_%H%M%S).backup

# Custom format (best for partial restores)
docker exec forgr_db pg_dump -U forgr -d forgr_prod -F c -f /var/lib/postgresql/data/backup.dump

# Copy from container
docker cp forgr_db:/var/lib/postgresql/data/backup.dump ./backups/

# Plain text SQL format (human-readable)
docker exec forgr_db pg_dump -U forgr -d forgr_prod > backups/forgr_prod_$(date +%Y%m%d).sql
```

### Restore Database from Backup

```bash
# Check if database exists
docker exec forgr_db psql -U forgr -c "SELECT 1 FROM pg_database WHERE datname = 'forgr_prod';"

# Drop existing database (careful!)
docker exec forgr_db psql -U forgr -c "DROP DATABASE IF EXISTS forgr_prod;"

# Create fresh database
docker exec forgr_db psql -U forgr -c "CREATE DATABASE forgr_prod;"

# Restore from backup
cat backups/forgr_prod_20240101.backup | docker exec -i forgr_db pg_restore -U forgr -d forgr_prod

# Or using file mount
docker exec forgr_db pg_restore -U forgr -d forgr_prod /backups/forgr_prod_20240101.backup
```

### Backup File Storage

```bash
# Backup resumes
tar -czf backups/resumes_$(date +%Y%m%d).tar.gz \
  -C backend uploads/resumes

# Backup entire uploads directory
docker cp forgr_backend:/app/uploads ./backups/uploads_$(date +%Y%m%d)
```

### Restore File Storage

```bash
# Restore from tarball
tar -xzf backups/resumes_20240101.tar.gz -C backend/

# Or copy directory back
docker cp ./backups/uploads_20240101 forgr_backend:/app/uploads
```

## PostgreSQL Backup Scripts

### Backup Script (backup-forgr-db.sh)

```bash
#!/bin/bash
set -e

BACKUP_DIR="/backups/forgr"
RETENTION_DAYS=30
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/forgr_prod_${TIMESTAMP}.dump"

# Create backup directory
mkdir -p "${BACKUP_DIR}"

# PostgreSQL connection
export PGPASSWORD="${DB_PASSWORD}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="forgr"
DB_NAME="forgr_prod"

# Perform backup
echo "Starting database backup: ${BACKUP_FILE}"
pg_dump -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" \
  -F c -b -v -f "${BACKUP_FILE}"

# Verify backup
if [ -f "${BACKUP_FILE}" ]; then
  SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
  echo "Backup successful: ${SIZE}"
  
  # Upload to S3 (optional)
  if command -v aws &> /dev/null; then
    aws s3 cp "${BACKUP_FILE}" "s3://forgr-backups/database/"
    echo "Uploaded to S3"
  fi
else
  echo "Backup failed!"
  exit 1
fi

# Clean old backups
echo "Removing backups older than ${RETENTION_DAYS} days"
find "${BACKUP_DIR}" -name "forgr_prod_*.dump" -mtime +${RETENTION_DAYS} -delete

# Send alert
STATUS="✓ Backup successful ($(date))"
# Send to monitoring system
echo "${STATUS}"
```

### Restore Script (restore-forgr-db.sh)

```bash
#!/bin/bash
set -e

BACKUP_FILE="${1}"
BACKUP_DIR="/backups/forgr"

if [ -z "${BACKUP_FILE}" ]; then
  echo "Usage: $0 <backup_file>"
  echo "Available backups:"
  ls -lh ${BACKUP_DIR}/forgr_prod_*.dump
  exit 1
fi

# Verify backup exists
if [ ! -f "${BACKUP_FILE}" ]; then
  echo "Backup file not found: ${BACKUP_FILE}"
  exit 1
fi

# PostgreSQL connection
export PGPASSWORD="${DB_PASSWORD}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="forgr"
DB_NAME="forgr_prod"

# Confirm restore
read -p "This will drop and restore database ${DB_NAME}. Continue? (yes/no) " CONFIRM
if [ "${CONFIRM}" != "yes" ]; then
  echo "Restore cancelled"
  exit 1
fi

echo "Dropping database ${DB_NAME}..."
psql -h "${DB_HOST}" -p "${DB_PORT}" -U postgres -c "DROP DATABASE IF EXISTS ${DB_NAME};"

echo "Creating database ${DB_NAME}..."
psql -h "${DB_HOST}" -p "${DB_PORT}" -U postgres -c "CREATE DATABASE ${DB_NAME};"

echo "Restoring from backup: ${BACKUP_FILE}"
pg_restore -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" \
  -v -c "${BACKUP_FILE}"

echo "Restore complete!"
```

## Kubernetes Backup/Restore

### Database Backup in Kubernetes

```bash
# Backup PostgreSQL pod
kubectl exec -n forgr statefulset/forgr-postgres -- \
  pg_dump -U forgr -d forgr_prod -Fc > forgr_prod_$(date +%Y%m%d).dump

# Backup with kubectl exec
POSTGRES_POD=$(kubectl get pod -n forgr -l app=forgr-postgres -o name | head -1)
kubectl exec -n forgr ${POSTGRES_POD} -- \
  pg_dump -U forgr -d forgr_prod -Fc > backup.dump

# Copy backup from pod
kubectl cp forgr/${POSTGRES_POD}:/var/lib/postgresql/data/backup.dump ./backup.dump
```

### Restore Database in Kubernetes

```bash
# Port forward PostgreSQL
kubectl port-forward -n forgr svc/forgr-postgres 5432:5432 &

# Restore from backup
pg_restore -h localhost -U forgr -d forgr_prod -c backup.dump

# Or restore in pod
POSTGRES_POD=$(kubectl get pod -n forgr -l app=forgr-postgres -o name | head -1)
kubectl cp backup.dump forgr/${POSTGRES_POD}:/tmp/backup.dump
kubectl exec -n forgr ${POSTGRES_POD} -- \
  pg_restore -U forgr -d forgr_prod -c /tmp/backup.dump
```

### File Storage Backup in Kubernetes

```bash
# Backup uploaded files from pod
BACKEND_POD=$(kubectl get pod -n forgr -l app=forgr-backend -o name | head -1)
kubectl cp forgr/${BACKEND_POD}:/app/uploads ./uploads_backup_$(date +%Y%m%d)

# Restore files
kubectl cp ./uploads_backup_20240101 forgr/${BACKEND_POD}:/app/uploads
```

## S3 Remote Backup (AWS)

### Backup to S3

```bash
#!/bin/bash
# Requires AWS CLI and S3 bucket configured

BUCKET="forgr-backups"
BACKUP_DIR="/backups/forgr"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Local backup first
pg_dump -U forgr -d forgr_prod -Fc > /tmp/forgr_backup_${TIMESTAMP}.dump

# Upload to S3
aws s3 cp /tmp/forgr_backup_${TIMESTAMP}.dump \
  s3://${BUCKET}/database/forgr_backup_${TIMESTAMP}.dump \
  --sse AES256 \
  --storage-class GLACIER

# Upload file storage
tar -czf /tmp/uploads_${TIMESTAMP}.tar.gz backend/uploads/
aws s3 cp /tmp/uploads_${TIMESTAMP}.tar.gz \
  s3://${BUCKET}/uploads/uploads_${TIMESTAMP}.tar.gz

# Cleanup
rm /tmp/forgr_backup_${TIMESTAMP}.dump /tmp/uploads_${TIMESTAMP}.tar.gz

echo "Backup uploaded to S3"
```

### Restore from S3

```bash
#!/bin/bash
BUCKET="forgr-backups"
TIMESTAMP="${1:-20240101_000000}"

# Download database backup
aws s3 cp s3://${BUCKET}/database/forgr_backup_${TIMESTAMP}.dump ./

# Restore
pg_restore -U forgr -d forgr_prod -c forgr_backup_${TIMESTAMP}.dump

# Download file backup
aws s3 cp s3://${BUCKET}/uploads/uploads_${TIMESTAMP}.tar.gz ./
tar -xzf uploads_${TIMESTAMP}.tar.gz -C backend/
```

## Point-in-Time Recovery (PITR)

### Enable WAL Archiving

```bash
# In /etc/postgresql/16/main/postgresql.conf
wal_level = replica
archive_mode = on
archive_command = 'cp %p /var/lib/postgresql/16/archive/%f'
archive_timeout = 3600
```

### Recover to Point in Time

```bash
# Create recovery environment
mkdir /var/lib/postgresql/recovery

# Copy base backup
cp forgr_prod_full_backup.dump /var/lib/postgresql/recovery/

# Restore base
pg_restore -d forgr_recovery /var/lib/postgresql/recovery/forgr_prod_full_backup.dump

# Create recovery.conf
cat > /var/lib/postgresql/16/main/recovery.conf <<EOF
restore_command = 'cp /var/lib/postgresql/16/archive/%f %p'
recovery_target_time = '2024-01-15 14:30:00'
EOF

# Start recovery
pg_ctl start

# Remove recovery.conf after completion
rm /var/lib/postgresql/16/main/recovery.conf
```

## Backup Verification

### Test Restore in Development

```bash
# Create test database
psql -U postgres -c "CREATE DATABASE forgr_test;"

# Restore backup to test database
pg_restore -d forgr_test backup.dump

# Run smoke tests
./tests/smoke_tests.sh

# Verify data integrity
psql -d forgr_test -c "SELECT COUNT(*) FROM users;"
psql -d forgr_test -c "SELECT COUNT(*) FROM students;"

# Drop test database
psql -U postgres -c "DROP DATABASE forgr_test;"
```

### Backup Health Monitoring

```bash
#!/bin/bash
# Check backup file size and age

BACKUP_DIR="/backups/forgr"
LATEST_BACKUP=$(ls -t ${BACKUP_DIR}/forgr_prod_*.dump | head -1)
BACKUP_AGE=$(find ${LATEST_BACKUP} -mtime +1)

if [ -z "${LATEST_BACKUP}" ]; then
  echo "ALERT: No backup found!"
  exit 1
fi

# Check size (should be 10-100MB for typical installation)
SIZE=$(stat -f%z "${LATEST_BACKUP}" 2>/dev/null || stat -c%s "${LATEST_BACKUP}")
echo "Backup size: $((SIZE / 1024 / 1024)) MB"

# Check if backup is recent
if [ ! -z "${BACKUP_AGE}" ]; then
  echo "WARNING: Backup is older than 1 day"
fi
```

## Disaster Recovery Runbook

### 1. Database Corruption

```bash
# Stop application
systemctl stop forgr-backend

# Restore from recent backup
./restore-forgr-db.sh /backups/forgr/forgr_prod_latest.dump

# Verify data
psql -d forgr_prod -c "SELECT COUNT(*) FROM users;"

# Restart application
systemctl start forgr-backend

# Verify health
curl http://localhost:8000/health
```

### 2. Data Loss

```bash
# Restore from S3
aws s3 cp s3://forgr-backups/database/forgr_backup_TIMESTAMP.dump ./

# Restore to new database
pg_restore -d forgr_prod backup.dump

# Restore file storage
aws s3 sync s3://forgr-backups/uploads/ backend/uploads/
```

### 3. Full System Recovery

```bash
# 1. Restore infrastructure (database, cache)
kubectl apply -f k8s/00-infrastructure.yaml

# 2. Wait for services
kubectl wait --for=condition=ready pod -l app=forgr-postgres -n forgr --timeout=5m

# 3. Restore database
kubectl cp backup.dump forgr/pod-name:/tmp/
kubectl exec forgr/pod-name -- pg_restore -d forgr_prod /tmp/backup.dump

# 4. Deploy application
kubectl apply -f k8s/01-backend.yaml k8s/02-frontend.yaml

# 5. Restore files
kubectl cp uploads_backup/ forgr/pod-name:/app/uploads

# 6. Verify
curl https://app.example.com/health
```

## Encryption & Security

### Backup Encryption

```bash
# Encrypt backup with GPG
gpg --symmetric --cipher-algo AES256 forgr_prod.dump

# Decrypt when needed
gpg --decrypt forgr_prod.dump.gpg > forgr_prod.dump

# Or use openssl
openssl enc -aes-256-cbc -salt -in forgr_prod.dump -out forgr_prod.dump.enc

# Decrypt
openssl enc -aes-256-cbc -d -in forgr_prod.dump.enc -out forgr_prod.dump
```

### Backup Access Control

```bash
# Restrict backup file permissions
chmod 600 /backups/forgr/*

# Create backup user with minimal privileges
sudo useradd -m backup
sudo chown backup:backup /backups/forgr
sudo chmod u+rwx,g-rwx,o-rwx /backups/forgr
```

## Compliance & Testing

- [ ] Backup created daily
- [ ] Backup uploaded to secure storage (S3, Azure Blob)
- [ ] Backup encryption verified
- [ ] Monthly restore test performed
- [ ] Recovery time objective (RTO): < 1 hour
- [ ] Recovery point objective (RPO): < 6 hours
- [ ] Backup retention policy follows GDPR/compliance requirements
