# FORGR Systemd Deployment Guide

Deploy FORGR on a single Linux server using systemd services.

## Prerequisites

- Ubuntu 22.04 LTS or equivalent
- Python 3.12
- PostgreSQL 16
- Redis 7
- Nginx
- 4GB+ RAM, 20GB+ disk

## Installation

### 1. System Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install dependencies
sudo apt install -y python3.12 python3.12-venv python3-pip \
  postgresql postgresql-contrib redis-server nginx curl git

# Create application user
sudo useradd -m -s /bin/bash forgr
```

### 2. Database Setup

```bash
sudo -u postgres psql <<EOF
CREATE DATABASE forgr_prod;
CREATE USER forgr WITH PASSWORD 'your_secure_password';
ALTER ROLE forgr SET client_encoding TO 'utf8';
ALTER ROLE forgr SET default_transaction_isolation TO 'read committed';
ALTER ROLE forgr SET default_transaction_deferrable TO on;
ALTER ROLE forgr SET default_transaction_level TO 'read committed';
GRANT ALL PRIVILEGES ON DATABASE forgr_prod TO forgr;
EOF
```

### 3. Redis Setup

```bash
# Configure Redis
sudo sed -i 's/^# requirepass/requirepass your_secure_redis_password/' /etc/redis/redis.conf
sudo systemctl restart redis-server
sudo systemctl enable redis-server
```

### 4. Application Setup

```bash
# Clone repository
cd /home/forgr
sudo -u forgr git clone https://github.com/your-org/forgr.git app
cd app

# Create Python virtual environment
sudo -u forgr python3.12 -m venv venv
sudo -u forgr venv/bin/pip install --upgrade pip

# Install dependencies
sudo -u forgr venv/bin/pip install -r backend/requirements.txt

# Create .env file
sudo -u forgr cp .env.example .env
sudo -u forgr nano .env  # Edit with actual values

# Create uploads directory
sudo -u forgr mkdir -p backend/uploads/resumes backend/logs
```

### 5. Run Migrations

```bash
sudo -u forgr bash -c 'cd /home/forgr/app && venv/bin/alembic upgrade head'
```

### 6. Create Systemd Services

#### Backend API Service

```bash
sudo tee /etc/systemd/system/forgr-backend.service > /dev/null <<EOF
[Unit]
Description=FORGR Backend API
After=network.target postgresql.service redis-server.service
Wants=postgresql.service redis-server.service

[Service]
Type=notify
User=forgr
Group=forgr
WorkingDirectory=/home/forgr/app/backend
Environment="PATH=/home/forgr/app/venv/bin"
EnvironmentFile=/home/forgr/app/.env
ExecStart=/home/forgr/app/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
Restart=on-failure
RestartSec=10s
StandardOutput=journal
StandardError=journal

# Resource limits
MemoryLimit=2G
MemoryAccounting=true
TasksMax=4096

# Timeout
TimeoutStopSec=30

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable forgr-backend
sudo systemctl start forgr-backend
```

#### Frontend Service

```bash
# Build frontend
sudo -u forgr bash -c 'cd /home/forgr/app/frontend && npm ci && npm run build'

# Create Nginx config
sudo tee /etc/nginx/sites-available/forgr > /dev/null <<'EOF'
upstream forgr_backend {
    server 127.0.0.1:8000;
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name app.example.com api.example.com;
    return 301 https://$server_name$request_uri;
}

# Frontend
server {
    listen 443 ssl http2;
    server_name app.example.com;

    ssl_certificate /etc/letsencrypt/live/app.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    root /home/forgr/app/frontend/dist;
    index index.html;

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Static assets with caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|woff|woff2|ttf|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
}

# Backend API
server {
    listen 443 ssl http2;
    server_name api.example.com;

    ssl_certificate /etc/letsencrypt/live/api.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    client_max_body_size 20M;

    location / {
        proxy_pass http://forgr_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 30s;
        proxy_connect_timeout 30s;
    }

    # Security headers
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
}
EOF

sudo ln -s /etc/nginx/sites-available/forgr /etc/nginx/sites-enabled/
sudo systemctl restart nginx
```

### 7. SSL Certificates with Certbot

```bash
# Install certbot
sudo apt install -y certbot python3-certbot-nginx

# Get certificates
sudo certbot certonly --standalone -d app.example.com -d api.example.com

# Auto-renewal
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

## Operations

### Check Status

```bash
# Backend service
sudo systemctl status forgr-backend
sudo journalctl -u forgr-backend -n 100 -f

# Frontend/Nginx
sudo systemctl status nginx
sudo nginx -t

# Database
sudo -u postgres psql -d forgr_prod -c "SELECT version();"

# Redis
redis-cli -a your_password ping
```

### Restart Services

```bash
# Restart backend
sudo systemctl restart forgr-backend

# Restart Nginx
sudo systemctl restart nginx

# Restart all
sudo systemctl restart forgr-backend nginx
```

### Backup

```bash
# Database backup
sudo -u postgres pg_dump -d forgr_prod -Fc > /backups/forgr_prod_$(date +%Y%m%d).backup

# Restore backup
sudo -u postgres pg_restore -d forgr_prod /backups/forgr_prod_20240101.backup
```

### Logs

```bash
# Backend logs
sudo journalctl -u forgr-backend -n 100 -f

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-16-main.log
```

## Monitoring

### Systemd-based Monitoring

```bash
# Watch service health
watch -n 5 'systemctl status forgr-backend'

# Monitor resource usage
top -p $(systemctl show -p MainPID --value forgr-backend)
```

### Automated Restarts

Services are configured to restart on failure. Check logs for issues:

```bash
sudo journalctl -u forgr-backend -p err
```

## Update Procedure

```bash
# Stop services
sudo systemctl stop forgr-backend

# Update code
cd /home/forgr/app
sudo -u forgr git pull origin main

# Update dependencies
sudo -u forgr venv/bin/pip install -r backend/requirements.txt

# Run migrations
sudo -u forgr bash -c 'venv/bin/alembic upgrade head'

# Start services
sudo systemctl start forgr-backend

# Verify
curl https://api.example.com/health
```

## Rollback

```bash
# Revert to previous version
cd /home/forgr/app
sudo -u forgr git revert HEAD
sudo -u forgr bash -c 'venv/bin/alembic downgrade -1'

# Restart service
sudo systemctl restart forgr-backend
```
