#!/bin/bash
# FORGR Quick Deploy Script for Docker Compose
# This script automates the initial deployment setup

set -e

echo "🚀 FORGR Quick Deployment Script"
echo "=================================="

# Check prerequisites
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✓ Docker and Docker Compose found"

# Generate secure values
echo ""
echo "Generating secure configuration values..."

SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")
DB_PASSWORD=$(python3 -c "import secrets; print(secrets.token_urlsafe(16))")
REDIS_PASSWORD=$(python3 -c "import secrets; print(secrets.token_urlsafe(16))")

# Create .env file
echo ""
echo "Creating .env file..."

cp .env.docker .env

# Update secrets in .env file
sed -i "s|FORGR_SECRET_KEY=.*|FORGR_SECRET_KEY=${SECRET_KEY}|" .env
sed -i "s|DB_PASSWORD=.*|DB_PASSWORD=${DB_PASSWORD}|" .env
sed -i "s|REDIS_PASSWORD=.*|REDIS_PASSWORD=${REDIS_PASSWORD}|" .env
sed -i "s|FORGR_DATABASE_URL=.*|FORGR_DATABASE_URL=postgresql://forgr:${DB_PASSWORD}@db:5432/forgr_prod|" .env
sed -i "s|FORGR_REDIS_URL=.*|FORGR_REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379/0|" .env

echo "✓ .env file created with secure values"

# Prompt for domain and CORS origins
echo ""
echo "Configure application domain (optional)"
read -p "Enter your domain (default: localhost): " DOMAIN
DOMAIN=${DOMAIN:-localhost}

if [ "${DOMAIN}" != "localhost" ]; then
    CORS_ORIGINS="https://${DOMAIN},https://www.${DOMAIN}"
    sed -i "s|FORGR_CORS_ORIGINS=.*|FORGR_CORS_ORIGINS=${CORS_ORIGINS}|" .env
    sed -i "s|VITE_API_URL=.*|VITE_API_URL=https://api.${DOMAIN}|" .env
fi

# Start services
echo ""
echo "Starting FORGR services..."
docker-compose up -d

# Wait for services to be ready
echo ""
echo "Waiting for services to initialize (30 seconds)..."
sleep 30

# Check health
echo ""
echo "Checking service health..."

# Test backend
BACKEND_HEALTH=$(curl -s http://localhost:8000/health || echo "{}")
if echo "$BACKEND_HEALTH" | grep -q "healthy"; then
    echo "✓ Backend API is healthy"
else
    echo "⚠️  Backend API health check inconclusive"
fi

# Test frontend
if curl -s http://localhost/ > /dev/null; then
    echo "✓ Frontend is running"
else
    echo "⚠️  Frontend check inconclusive"
fi

# Display access information
echo ""
echo "=================================="
echo "✓ FORGR Deployment Complete!"
echo "=================================="
echo ""
echo "Access the application:"
echo "  Frontend: http://localhost"
echo "  Backend: http://localhost:8000"
echo "  API Docs: http://localhost:8000/docs"
echo ""
echo "Default Bootstrap Accounts:"
echo "  Admin: admin@forgr.app"
echo "  Faculty: faculty@forgr.app"
echo "  Placement: placement@forgr.app"
echo "  Recruiter: recruiter@forgr.app"
echo ""
echo "⚠️  IMPORTANT: Change FORGR_SEED_PASSWORD immediately after first login!"
echo ""
echo "Next steps:"
echo "  1. Open http://localhost in your browser"
echo "  2. Login with admin@forgr.app / (check FORGR_SEED_PASSWORD in .env)"
echo "  3. Change default passwords"
echo "  4. Import student data using bulk import"
echo ""
echo "For production deployment, see:"
echo "  - DEPLOYMENT_GUIDE.md (Kubernetes, Cloud, Systemd)"
echo "  - BACKUP_RESTORE.md (Backup and disaster recovery)"
echo "  - RELEASE_RUNBOOK.md (Pre-launch validation)"
echo ""
echo "Stop services: docker-compose down"
echo "View logs: docker-compose logs -f"
echo ""
