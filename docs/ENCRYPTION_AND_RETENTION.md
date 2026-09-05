# Encryption-at-Rest & Data Retention Configuration

## Overview

This document describes the encryption-at-rest configuration, backup encryption procedures, and data retention policies for the FORGR platform.

---

## 1. Encryption-at-Rest

### 1.1 PostgreSQL Encryption

#### Transparent Data Encryption (TDE)
PostgreSQL does not natively support TDE, but encryption-at-rest can be achieved through:

**Option A: Filesystem-level encryption (Recommended)**
```bash
# Use LUKS encryption on the PostgreSQL data volume
cryptsetup luksFormat /dev/sdX
cryptsetup open /dev/sdX forgr_data
mkfs.ext4 /dev/mapper/forgr_data
mount /dev/mapper/forgr_data /var/lib/postgresql/data
```

**Option B: Column-level encryption with pgcrypto**
```sql
-- Enable pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Example: Encrypt sensitive columns
UPDATE students SET email = pgp_sym_encrypt(email, current_setting('app.encryption_key'));
```

> **Note**: For cloud deployments, use managed encryption:
> - **AWS RDS**: Enable storage encryption (AES-256) at instance creation
> - **GCP Cloud SQL**: Encryption is enabled by default (Google-managed keys)
> - **Azure Database**: Enable TDE in portal settings

#### Docker Compose Configuration
```yaml
# In docker-compose.yml, the postgres_data volume is encrypted
# if the host filesystem uses encryption (e.g., LUKS, BitLocker, FileVault)
volumes:
  postgres_data:
    driver: local
    driver_opts:
      type: none
      device: /encrypted-volume/postgres_data
      o: bind
```

### 1.2 Redis Encryption

Redis stores session data and rate-limit counters. Enable encryption:

```bash
# Redis TLS configuration
redis-server \
  --tls-port 6380 \
  --tls-cert-file /certs/redis.crt \
  --tls-key-file /certs/redis.key \
  --tls-ca-cert-file /certs/ca.crt
```

Update the connection string:
```env
FORGR_REDIS_URL=rediss://:password@redis:6380/0
```

### 1.3 Application-level Encryption

For sensitive fields beyond database-level encryption:

```python
# backend/security.py — add field-level encryption helpers
from cryptography.fernet import Fernet

FIELD_ENCRYPTION_KEY = os.getenv("FORGR_FIELD_ENCRYPTION_KEY")

def encrypt_field(plaintext: str) -> str:
    f = Fernet(FIELD_ENCRYPTION_KEY)
    return f.encrypt(plaintext.encode()).decode()

def decrypt_field(ciphertext: str) -> str:
    f = Fernet(FIELD_ENCRYPTION_KEY)
    return f.decrypt(ciphertext.encode()).decode()
```

---

## 2. Backup Encryption

### 2.1 Database Backups

All database backups must be encrypted before storage:

```bash
#!/bin/bash
# Encrypted backup script
BACKUP_FILE="forgr_backup_$(date +%Y%m%d_%H%M%S).sql.gz.gpg"

pg_dump -U forgr -h localhost forgr_prod \
  | gzip \
  | gpg --symmetric --cipher-algo AES256 --batch --passphrase-file /secrets/backup_passphrase \
  > /backups/$BACKUP_FILE

# Upload to S3 with server-side encryption
aws s3 cp /backups/$BACKUP_FILE s3://forgr-backups/ --sse aws:kms
```

### 2.2 Backup Restoration
```bash
# Decrypt and restore
gpg --decrypt --batch --passphrase-file /secrets/backup_passphrase /backups/$BACKUP_FILE \
  | gunzip \
  | psql -U forgr -h localhost forgr_prod
```

---

## 3. Data Retention Policies

### 3.1 Retention Schedule

| Data Type | Retention Period | Deletion Method | Justification |
|-----------|-----------------|-----------------|---------------|
| **Student records** | Duration of enrollment + 5 years | Soft delete → hard delete after grace period | Academic record requirements |
| **Academic data** | Duration of enrollment + 5 years | Cascading delete with student | Academic record requirements |
| **Login audit logs** | 90 days | Automated daily purge | Security monitoring |
| **Edit audit logs** | 1 year | Automated monthly purge | Compliance trail |
| **Comprehensive audit logs** | 1 year | Automated monthly purge | Compliance trail |
| **Prediction logs** | 180 days | Automated weekly purge | ML monitoring |
| **Drift reports** | 1 year | Automated monthly purge | ML governance |
| **Import history** | 1 year | Automated monthly purge | Operational records |
| **Consent records** | Indefinite | Manual deletion only | Legal requirement |
| **Auth tokens** | 30 days after expiry | Automated daily purge | Security hygiene |
| **Backup files** | 90 days | Automated lifecycle policy | Disaster recovery |

### 3.2 Automated Retention Jobs

```sql
-- Daily: Purge expired auth tokens
DELETE FROM auth_tokens WHERE expires_at < NOW() - INTERVAL '30 days';

-- Daily: Purge old login audit logs
DELETE FROM login_audit_log WHERE created_at < NOW() - INTERVAL '90 days';

-- Weekly: Purge old prediction logs
DELETE FROM prediction_logs WHERE created_at < NOW() - INTERVAL '180 days';

-- Monthly: Purge old audit logs
DELETE FROM edit_audit_log WHERE created_at < NOW() - INTERVAL '1 year';
DELETE FROM audit_log WHERE timestamp < NOW() - INTERVAL '1 year';
DELETE FROM drift_reports WHERE created_at < NOW() - INTERVAL '1 year';
DELETE FROM import_history WHERE created_at < NOW() - INTERVAL '1 year';
```

### 3.3 GDPR Data Subject Rights

When processing a data deletion request (Right to Erasure):

1. **Account deletion** (`DELETE /auth/account`):
   - Deletes user record, auth tokens, email verifications
   - Deletes linked student profile and all associated data
   - Logs the deletion in the audit trail
   - Consent records are anonymized (user_id set to 0)

2. **Data export** (`GET /auth/account/export`):
   - Returns all personal data in JSON format
   - Logged in audit trail

3. **Consent revocation** (`DELETE /api/consent/{type}`):
   - Immediately stops processing for that consent type
   - Logged with timestamp and IP

---

## 4. Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `FORGR_DATABASE_URL` | PostgreSQL connection string with SSL | Production |
| `FORGR_REDIS_URL` | Redis connection with TLS | Production |
| `FORGR_FIELD_ENCRYPTION_KEY` | Fernet key for field-level encryption | Optional |
| `FORGR_BACKUP_PASSPHRASE` | GPG passphrase for backup encryption | Production |
| `FORGR_SENTRY_DSN` | Sentry error tracking DSN | Recommended |

---

## 5. Compliance Checklist

- [ ] PostgreSQL storage encryption enabled (filesystem or cloud-managed)
- [ ] Redis TLS enabled in production
- [ ] Database backups encrypted with AES-256
- [ ] Backup passphrase stored in secret manager (not in code)
- [ ] Retention jobs scheduled via cron or pg_cron
- [ ] GDPR data export endpoint tested
- [ ] GDPR account deletion endpoint tested
- [ ] Consent management endpoints operational
- [ ] Audit trail captures all required events
- [ ] Field-level encryption configured for PII (if required)
