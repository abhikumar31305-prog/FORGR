# FORGR Deployment Guide

Comprehensive guide for deploying FORGR to production environments.

## Table of Contents

1. [Quick Start (Docker Compose)](#quick-start-docker-compose)
2. [Kubernetes Deployment](#kubernetes-deployment)
3. [Cloud Provider Deployments](#cloud-provider-deployments)
4. [Environment Configuration](#environment-configuration)
5. [Database Migrations](#database-migrations)
6. [Health Checks & Monitoring](#health-checks--monitoring)
7. [Rollback Procedures](#rollback-procedures)
8. [Troubleshooting](#troubleshooting)

---

## Quick Start (Docker Compose)

### Prerequisites

- Docker 20.10+
- Docker Compose 2.0+
- 4GB RAM minimum

### Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/forgr.git
   cd forgr
   ```

2. **Create environment file**
   ```bash
   cp .env.docker .env
   # Edit .env with your configuration:
   # - Change all REPLACE_WITH_* values
   # - Update database and Redis passwords
   # - Set FORGR_SECRET_KEY to a secure random value
   ```

3. **Generate secure secret key**
   ```bash
   python -c "import secrets; print(secrets.token_urlsafe(32))"
   # Copy output to FORGR_SECRET_KEY in .env
   ```

4. **Start services**
   ```bash
   docker-compose up -d
   ```

5. **Verify health**
   ```bash
   # Wait 30 seconds for services to initialize
   sleep 30
   curl http://localhost:8000/health
   curl http://localhost/
   ```

6. **Access application**
   - Frontend: http://localhost
   - API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

### Database Access

```bash
# PostgreSQL
docker exec forgr_db psql -U forgr -d forgr_prod

# Redis CLI
docker exec forgr_redis redis-cli -a <REDIS_PASSWORD>
```

### Stopping Services

```bash
docker-compose down
# To remove volumes and reset state:
docker-compose down -v
```

---

## Kubernetes Deployment

### Prerequisites

- Kubernetes 1.24+ cluster
- kubectl configured
- Container images pushed to registry
- Cert-manager installed (for HTTPS)

### Installation

1. **Prepare environment**
   ```bash
   # Update image registry in k8s/00-infrastructure.yaml
   sed -i 's|forgr-backend:1.0.0|your-registry.com/forgr-backend:v1.0.0|g' k8s/*.yaml
   sed -i 's|forgr-frontend:1.0.0|your-registry.com/forgr-frontend:v1.0.0|g' k8s/*.yaml
   ```

2. **Configure secrets**
   ```bash
   # Edit k8s/00-infrastructure.yaml and set all REPLACE_WITH_* values:
   # - FORGR_SECRET_KEY
   # - Database password
   # - Redis password
   # - CORS origins
   
   # Use strong random values:
   python -c "import secrets; print(secrets.token_urlsafe(32))"
   ```

3. **Create namespace and infrastructure**
   ```bash
   kubectl apply -f k8s/00-infrastructure.yaml
   
   # Wait for PostgreSQL and Redis
   kubectl wait --for=condition=ready pod -l app=forgr-postgres -n forgr --timeout=5m
   kubectl wait --for=condition=ready pod -l app=forgr-redis -n forgr --timeout=5m
   ```

4. **Deploy backend**
   ```bash
   kubectl apply -f k8s/01-backend.yaml
   
   # Wait for rollout
   kubectl rollout status deployment/forgr-backend -n forgr
   ```

5. **Deploy frontend**
   ```bash
   kubectl apply -f k8s/02-frontend.yaml
   
   # Wait for rollout
   kubectl rollout status deployment/forgr-frontend -n forgr
   ```

6. **Configure Ingress**
   ```bash
   # Update hostnames in k8s/03-ingress.yaml
   # Set your domain: app.example.com, api.example.com
   kubectl apply -f k8s/03-ingress.yaml
   
   # Wait for certificate provisioning (may take 1-5 minutes)
   kubectl describe certificate forgr-tls-cert -n forgr
   ```

7. **Verify deployment**
   ```bash
   kubectl get all -n forgr
   kubectl logs deployment/forgr-backend -n forgr --follow
   ```

### Kubernetes Commands Reference

```bash
# View deployment status
kubectl get deployments -n forgr
kubectl get pods -n forgr
kubectl get svc -n forgr

# View logs
kubectl logs deployment/forgr-backend -n forgr -f
kubectl logs pod/forgr-backend-abc123 -n forgr

# Execute commands in pod
kubectl exec -it pod/forgr-backend-abc123 -n forgr -- sh

# Scale deployment
kubectl scale deployment forgr-backend -n forgr --replicas 5

# Update image
kubectl set image deployment/forgr-backend -n forgr \
  backend=your-registry.com/forgr-backend:v1.1.0

# Describe resource
kubectl describe pod/forgr-backend-abc123 -n forgr
```

---

## Cloud Provider Deployments

### AWS ECS/Fargate

1. **Push images to ECR**
   ```bash
   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789.dkr.ecr.us-east-1.amazonaws.com
   docker tag forgr-backend:1.0.0 123456789.dkr.ecr.us-east-1.amazonaws.com/forgr-backend:1.0.0
   docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/forgr-backend:1.0.0
   ```

2. **Create RDS PostgreSQL**
   - Engine: PostgreSQL 16
   - Multi-AZ: Yes
   - Storage: 20GB with autoscaling
   - Backup: 30-day retention

3. **Create ElastiCache Redis**
   - Engine: Redis 7
   - Node type: cache.t4g.micro (or larger)
   - Multi-AZ: Yes
   - Automatic failover: Enabled

4. **Create ECS Cluster**
   - Launch type: Fargate
   - Network mode: awsvpc

5. **Configure Application Load Balancer**
   - Target groups: one for backend (port 8000), one for frontend (port 80)
   - Health check paths: `/health` for backend, `/` for frontend

### Google Cloud Run

```bash
# Build and push image
gcloud builds submit --tag gcr.io/PROJECT/forgr-backend:1.0.0

# Deploy backend
gcloud run deploy forgr-backend \
  --image gcr.io/PROJECT/forgr-backend:1.0.0 \
  --platform managed \
  --region us-central1 \
  --memory 2Gi \
  --cpu 2 \
  --set-env-vars FORGR_ENV=production \
  --set-secrets FORGR_SECRET_KEY=secret_key:latest

# Configure Cloud SQL for PostgreSQL
# Configure Memorystore for Redis
```

### Azure Container Instances

```bash
# Push to ACR
az acr build --registry myregistry --image forgr-backend:1.0.0 .

# Deploy with Container Group
az container create \
  --resource-group mygroup \
  --name forgr-backend \
  --image myregistry.azurecr.io/forgr-backend:1.0.0 \
  --cpu 2 --memory 2 \
  --environment-variables FORGR_ENV=production
```

---

## Environment Configuration

### Essential Variables (Production)

| Variable | Required | Example |
|----------|----------|---------|
| FORGR_ENV | Yes | production |
| FORGR_SECRET_KEY | Yes | [secure 32+ char random string] |
| FORGR_DATABASE_URL | Yes | postgresql://user:pwd@host:5432/db |
| FORGR_REDIS_URL | Yes | redis://:pwd@host:6379/0 |
| FORGR_CORS_ORIGINS | Yes | https://app.example.com |

### Generate Secure Values

```bash
# Secret key (minimum 32 characters)
python -c "import secrets; print(secrets.token_urlsafe(32))"

# Database password
openssl rand -base64 32

# Seeds and tokens
python -c "import secrets; print(secrets.token_hex(16))"
```

---

## Database Migrations

### Running Migrations

Migrations run automatically on service startup via init container/task.

**Manual migration:**

```bash
# Docker Compose
docker exec forgr_backend alembic upgrade head

# Kubernetes
kubectl exec deployment/forgr-backend -n forgr -- alembic upgrade head

# Direct PostgreSQL
alembic upgrade head
```

### Creating New Migrations

```bash
# Generate migration from model changes
alembic revision --autogenerate -m "Add new field to students table"

# Review generated migration
vim alembic/versions/001_add_new_field.py

# Test migration
alembic upgrade head
alembic downgrade -1
alembic upgrade head
```

### Rollback

```bash
# Go back one version
alembic downgrade -1

# Go to specific version
alembic downgrade 001_initial_schema
```

---

## Health Checks & Monitoring

### Health Endpoint

All deployments automatically configure health checks on `/health`:

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

### Monitoring Setup

1. **Prometheus** - Collect metrics
   ```bash
   kubectl apply -f k8s/04-monitoring.yaml
   ```

2. **Grafana** - Visualize metrics
   - Import dashboards from k8s/04-monitoring.yaml
   - Set up alert notification channels

3. **Loki** - Centralized logging
   - Forward logs from all pods
   - Query logs via Grafana

### Key Metrics to Monitor

- `http_requests_total` - Total requests
- `http_request_duration_seconds` - Request latency
- `pg_stat_activity_count` - Database connections
- `redis_connected_clients` - Redis connections
- `Error rate (5xx responses)` - Application errors

---

## Rollback Procedures

### Docker Compose Rollback

```bash
# Stop current version
docker-compose down

# Restore database backup
docker exec forgr_db pg_restore -U forgr -d forgr_prod /backups/forgr_prod.backup

# Start previous image version
docker-compose up -d
```

### Kubernetes Rollback

```bash
# View rollout history
kubectl rollout history deployment/forgr-backend -n forgr

# Rollback to previous version
kubectl rollout undo deployment/forgr-backend -n forgr

# Rollback to specific revision
kubectl rollout undo deployment/forgr-backend -n forgr --to-revision=2

# Watch rollback progress
kubectl rollout status deployment/forgr-backend -n forgr
```

### Database Rollback

```bash
# If migration caused issues, rollback database
alembic downgrade -1

# Then rollback application code
kubectl rollout undo deployment/forgr-backend -n forgr
```

---

## Troubleshooting

### Common Issues

#### Backend pod keeps restarting

```bash
# Check logs
kubectl logs deployment/forgr-backend -n forgr --previous

# Common causes:
# 1. Database connection failed
# 2. FORGR_SECRET_KEY not set
# 3. Migration failed
```

#### High memory usage

```bash
# Check pod resource usage
kubectl top pods -n forgr

# Increase resource limits in k8s/01-backend.yaml
# Or scale horizontally: kubectl scale deployment forgr-backend -n forgr --replicas 5
```

#### Redis connection errors

```bash
# Test Redis connectivity
kubectl exec deployment/forgr-backend -n forgr -- redis-cli -u redis://... ping

# Check Redis pod logs
kubectl logs statefulset/forgr-redis -n forgr
```

#### Database connection pool exhausted

```bash
# Increase pool size in k8s/00-infrastructure.yaml
FORGR_DB_POOL_SIZE: "30"  # was 20
FORGR_DB_MAX_OVERFLOW: "50"  # was 40

# Scale backend deployment to reduce per-pod connections
kubectl scale deployment forgr-backend -n forgr --replicas 5
```

#### Migrations failing

```bash
# Check which migrations have been applied
alembic current
alembic history

# View migration status
kubectl logs job/forgr-migration -n forgr

# Manual migration in pod
kubectl exec deployment/forgr-backend -n forgr -- alembic upgrade head
```

### Debug Commands

```bash
# SSH into running pod
kubectl exec -it pod/forgr-backend-abc123 -n forgr -- /bin/sh

# Port forward to local machine
kubectl port-forward svc/forgr-backend 8000:8000 -n forgr

# View events
kubectl get events -n forgr --sort-by=.metadata.creationTimestamp

# Describe pod for detailed status
kubectl describe pod/forgr-backend-abc123 -n forgr
```

---

## Security Checklist

- [ ] FORGR_SECRET_KEY is a secure random string (32+ characters)
- [ ] Database password is changed from default
- [ ] Redis password is set and strong
- [ ] CORS origins only include trusted domains
- [ ] HTTPS/TLS certificates are valid and auto-renewing
- [ ] Network policies restrict traffic between pods
- [ ] Database backups are automated and tested
- [ ] Secrets are stored in secure secret manager (not in git)
- [ ] RBAC policies follow least privilege principle
- [ ] Pod security policies enforce non-root users

---

## Support

For issues or questions:
1. Check application logs: `kubectl logs deployment/forgr-backend -n forgr`
2. Review RELEASE_RUNBOOK.md for validation gates
3. Check PRIVACY_CHECKLIST.md for compliance
