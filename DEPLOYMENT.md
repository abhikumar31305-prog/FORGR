# 🚀 FORGR Deployment

Complete production-ready deployment infrastructure for FORGR application.

## Deployment Options

Choose the deployment method that best fits your infrastructure:

### 1. **Docker Compose** (Easiest - Development/Staging)
- ✅ All-in-one container stack
- ✅ PostgreSQL + Redis included
- ✅ Quick setup: ~5 minutes
- ⚠️ Single server only
- ⚠️ Not recommended for high availability

**Get started:** `bash deploy.sh`

### 2. **Kubernetes** (Production - Cloud/On-Premise)
- ✅ Auto-scaling and load balancing
- ✅ High availability (3+ replicas)
- ✅ Rolling updates
- ✅ Health checks and auto-recovery
- ⚠️ Requires Kubernetes cluster
- ⚠️ More complex setup

**Setup:** See DEPLOYMENT_GUIDE.md - Kubernetes section

### 3. **Systemd** (Production - Single Server)
- ✅ Traditional Linux deployment
- ✅ Simple and reliable
- ✅ Good for small teams
- ⚠️ No auto-scaling
- ⚠️ Manual failover

**Setup:** See SYSTEMD_DEPLOYMENT.md

### 4. **Cloud Platforms** (AWS/GCP/Azure)
- ✅ Managed services (RDS, Cloud SQL)
- ✅ Auto-scaling built-in
- ✅ CDN and DDoS protection
- ⚠️ Higher costs
- ⚠️ Vendor lock-in

**Setup:** See DEPLOYMENT_GUIDE.md - Cloud Provider Deployments section

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Python 3 (for secure value generation)
- 4GB RAM, 20GB disk space

### 5-Minute Setup

```bash
# Clone repository
git clone <repo-url> forgr
cd forgr

# Run automated deployment
chmod +x deploy.sh
./deploy.sh

# Follow on-screen instructions
```

The script will:
1. Generate secure configuration values
2. Create `.env` file with secrets
3. Start all services (Database, Cache, API, Frontend)
4. Verify health checks
5. Display access information

### Manual Setup

```bash
# Copy environment template
cp .env.example .env

# Edit with your configuration
nano .env

# Update these minimum fields:
# - FORGR_SECRET_KEY (run: python -c "import secrets; print(secrets.token_urlsafe(32))")
# - FORGR_DATABASE_URL (PostgreSQL connection)
# - FORGR_REDIS_URL (Redis connection)
# - FORGR_CORS_ORIGINS (your frontend domain)

# Start services
docker-compose up -d

# Access application
# Frontend: http://localhost
# Backend: http://localhost:8000
```

## Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

**Required for Production:**
- `FORGR_ENV` = `production`
- `FORGR_SECRET_KEY` (min 32 characters)
- `FORGR_DATABASE_URL` (PostgreSQL)
- `FORGR_REDIS_URL` (Redis)
- `FORGR_CORS_ORIGINS` (your domain)

**Optional:**
- `FORGR_LOG_LEVEL` (INFO, DEBUG, WARNING)
- `FORGR_LOG_FORMAT` (json, text)
- `FORGR_NOTIFICATION_PROVIDER` (smtp, sendgrid)
- `FORGR_RATE_LIMIT_PER_MINUTE` (default: 120)

See `.env.example` for complete documentation.

## Database Migrations

Migrations run automatically on service startup.

### Manual Migration

```bash
# Docker Compose
docker exec forgr_backend alembic upgrade head

# Kubernetes
kubectl exec deployment/forgr-backend -n forgr -- alembic upgrade head

# Systemd
cd /home/forgr/app && venv/bin/alembic upgrade head
```

### Create New Migration

```bash
# After modifying models.py:
alembic revision --autogenerate -m "Add new field"
alembic upgrade head
```

See backend/README.md for more information.

## Monitoring & Health

### Health Check Endpoint

All deployments expose `/health`:

```bash
curl https://api.example.com/health
```

Response:
```json
{
  "status": "healthy",
  "service": "FORGR API",
  "version": "1.0.0",
  "checks": {
    "database": "ok",
    "storage": "ok",
    "ml": "ok"
  }
}
```

### Logs

**Docker Compose:**
```bash
docker-compose logs -f forgr_backend
```

**Kubernetes:**
```bash
kubectl logs deployment/forgr-backend -n forgr -f
```

**Systemd:**
```bash
sudo journalctl -u forgr-backend -f
```

## Backup & Restore

**Important:** Automated backups are NOT configured by default.

### Backup Database

```bash
# Docker Compose
docker exec forgr_db pg_dump -U forgr -d forgr_prod -Fc > backup.dump

# Kubernetes
kubectl exec -n forgr statefulset/forgr-postgres -- \
  pg_dump -U forgr -d forgr_prod -Fc > backup.dump

# Systemd
pg_dump -U forgr -d forgr_prod -Fc > backup.dump
```

### Restore Database

```bash
# Docker Compose
docker exec forgr_db psql -U forgr -c "DROP DATABASE forgr_prod; CREATE DATABASE forgr_prod;"
docker exec -i forgr_db pg_restore -U forgr -d forgr_prod < backup.dump

# Kubernetes
kubectl exec -i statefulset/forgr-postgres -n forgr -- \
  pg_restore -U forgr -d forgr_prod < backup.dump
```

See [BACKUP_RESTORE.md](BACKUP_RESTORE.md) for comprehensive backup procedures.

## Troubleshooting

### Services won't start

```bash
# Check logs
docker-compose logs

# Check if ports are in use
lsof -i :8000
lsof -i :5432
lsof -i :6379

# Restart services
docker-compose restart
```

### Database connection failed

```bash
# Test PostgreSQL connection
docker exec forgr_db psql -U forgr -d forgr_prod -c "SELECT 1;"

# Check connection string in .env
# Format: postgresql://user:password@host:port/database
```

### Redis connection failed

```bash
# Test Redis connection
docker exec forgr_redis redis-cli -a <password> ping

# Ensure password matches in .env:
# FORGR_REDIS_URL=redis://:password@redis:6379/0
```

### API returns 502 Bad Gateway

```bash
# Check backend health
curl http://localhost:8000/health

# Check backend logs
docker-compose logs forgr_backend

# Restart backend
docker-compose restart forgr_backend
```

### High memory usage

```bash
# Check resource usage
docker stats

# Increase PostgreSQL shared_buffers in docker-compose.yml
# Reduce connection pool size
# Scale horizontally (Kubernetes)
```

See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md#troubleshooting) for more troubleshooting.

## Production Checklist

Before going live:

- [ ] All environment variables configured
- [ ] HTTPS certificates installed and auto-renewing
- [ ] Database backups automated and tested
- [ ] Monitoring and alerting configured
- [ ] SSL/TLS for all connections
- [ ] Secret rotation scheduled
- [ ] High availability setup (3+ backend replicas)
- [ ] Database connection pooling configured
- [ ] Rate limiting enabled
- [ ] CORS origins restricted to your domain
- [ ] Default passwords changed
- [ ] GDPR/privacy compliance verified
- [ ] Incident response plan documented

See [RELEASE_RUNBOOK.md](../RELEASE_RUNBOOK.md) for complete pre-launch validation.

## File Structure

```
forgr/
├── docker-compose.yml           # Docker Compose configuration
├── Dockerfile.backend           # Backend container image
├── Dockerfile.frontend          # Frontend container image
├── deploy.sh                    # Quick deployment script
├── .env.example                 # Environment template
├── .env.docker                  # Docker-specific template
├── alembic/                     # Database migrations
│   ├── env.py
│   ├── script.py.mako
│   └── versions/
│       └── 001_initial_schema.py
├── k8s/                         # Kubernetes manifests
│   ├── 00-infrastructure.yaml   # Database, Redis, Namespace
│   ├── 01-backend.yaml          # Backend API deployment
│   ├── 02-frontend.yaml         # Frontend deployment
│   ├── 03-ingress.yaml          # Ingress and networking
│   └── 04-monitoring.yaml       # Monitoring and logging
├── DEPLOYMENT_GUIDE.md          # Comprehensive deployment guide
├── SYSTEMD_DEPLOYMENT.md        # Single-server deployment
├── BACKUP_RESTORE.md            # Backup and recovery procedures
└── backend/
    ├── requirements.txt         # Python dependencies
    └── main.py                  # Updated with logging/HTTPS
```

## Documentation

- **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** - Complete deployment guide
  - Docker Compose quick start
  - Kubernetes deployment
  - Cloud provider deployments
  - Health checks and monitoring
  - Troubleshooting

- **[SYSTEMD_DEPLOYMENT.md](SYSTEMD_DEPLOYMENT.md)** - Single server deployment
  - Prerequisites and installation
  - Systemd service configuration
  - Nginx reverse proxy setup
  - SSL certificate management
  - Automated backups

- **[BACKUP_RESTORE.md](BACKUP_RESTORE.md)** - Backup and disaster recovery
  - Backup strategies and automation
  - Point-in-time recovery
  - S3 remote backups
  - Disaster recovery runbook
  - Compliance and testing

- **[../RELEASE_RUNBOOK.md](../RELEASE_RUNBOOK.md)** - Pre-launch validation
  - Staging environment checklist
  - Production deployment
  - Monitoring and alerts
  - Rollback procedures

## Key Features Implemented

✅ **Multi-environment support** (development, staging, production)
✅ **Database connection pooling** for PostgreSQL
✅ **HTTPS enforcement** in production
✅ **Structured JSON logging** for observability
✅ **Security headers** (HSTS, X-Frame-Options, CSP)
✅ **Rate limiting** with Redis or in-memory fallback
✅ **Database migrations** with Alembic
✅ **Automated health checks** for all services
✅ **Kubernetes-ready** with manifests for production
✅ **Docker multi-stage builds** for optimized images
✅ **Auto-scaling configuration** for Kubernetes
✅ **Comprehensive backup procedures**

## Support & Issues

For issues or questions:

1. Check relevant documentation file above
2. Review application logs
3. Verify environment configuration
4. Test connectivity to dependencies
5. Review [RELEASE_RUNBOOK.md](../RELEASE_RUNBOOK.md)

## License

See [LICENSE](../LICENSE) file in repository.
