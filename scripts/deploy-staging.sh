#!/bin/bash
# ===== Staging Deployment Script =====
# Run this on the staging server after cloning the repository.
#
# Prerequisites:
#   - Ubuntu 22.04+ or Debian 12+
#   - Docker and Docker Compose installed
#   - Domain names pointing to this server's public IP
#   - Ports 80 and 443 open in firewall
#
# Usage:
#   chmod +x scripts/deploy-staging.sh
#   sudo ./scripts/deploy-staging.sh

set -euo pipefail

echo "============================================"
echo "  Premium Casino - Staging Deployment"
echo "============================================"
echo ""

# Configuration - EDIT THESE
DOMAIN="staging.example.com"
ADMIN_DOMAIN="admin.staging.example.com"
ADMIN_EMAIL="admin@example.com"
POSTGRES_PASSWORD="$(openssl rand -base64 32)"
REDIS_PASSWORD="$(openssl rand -base64 32)"
SESSION_SECRET="$(openssl rand -base64 48)"
JWT_SECRET="$(openssl rand -base64 48)"
ADMIN_API_KEY="$(openssl rand -base64 32)"

echo "Step 1: Checking prerequisites..."
command -v docker >/dev/null 2>&1 || { echo "ERROR: Docker is required. Install it first."; exit 1; }
command -v docker compose >/dev/null 2>&1 || { echo "ERROR: Docker Compose is required."; exit 1; }
echo "  ✓ Docker found"

echo ""
echo "Step 2: Creating .env file..."
cat > .env << EOF
# ===== Staging Environment =====
# Auto-generated on $(date)

# Database
DATABASE_URL="postgresql://staging_user:${POSTGRES_PASSWORD}@postgres:5432/staging_db?schema=public"
POSTGRES_USER=staging_user
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_DB=staging_db

# Redis
REDIS_URL="redis://:${REDIS_PASSWORD}@redis:6379"
REDIS_PASSWORD=${REDIS_PASSWORD}

# Security
SESSION_SECRET=${SESSION_SECRET}
JWT_SECRET=${JWT_SECRET}
ADMIN_API_KEY=${ADMIN_API_KEY}

# URLs
NEXT_PUBLIC_SITE_URL="https://${DOMAIN}"
FRONTEND_URL="https://${DOMAIN}"
BACKEND_URL="https://${DOMAIN}"
BACKOFFICE_URL="https://${ADMIN_DOMAIN}"

# OTP
OTP_MANUAL_MODE="false"
EMAIL_MANUAL_MODE="false"
EOF
echo "  ✓ .env created with secure random passwords"

echo ""
echo "Step 3: Building Back Office..."
cd back-office
npm ci
npm run build
cd ..
echo "  ✓ Back Office built"

echo ""
echo "Step 4: Creating SSL certificates..."
mkdir -p ssl
docker compose run --rm certbot certonly --webroot \
  --webroot-path=/var/www/certbot \
  --email ${ADMIN_EMAIL} \
  --agree-tos \
  --no-eff-email \
  -d ${DOMAIN} -d ${ADMIN_DOMAIN}
echo "  ✓ SSL certificates obtained"

echo ""
echo "Step 5: Starting all services..."
docker compose up -d --build
echo "  ✓ All services started"

echo ""
echo "Step 6: Running database migrations..."
docker compose exec -T app npx prisma migrate deploy
echo "  ✓ Migrations applied"

echo ""
echo "Step 7: Seeding system data..."
docker compose exec -T app node scripts/seed-game-providers.mjs
echo "  ✓ System data seeded"

echo ""
echo "============================================"
echo "  Deployment Complete!"
echo "============================================"
echo ""
echo "Frontend:  https://${DOMAIN}"
echo "API:       https://${DOMAIN}/api"
echo "Back Off:  https://${ADMIN_DOMAIN}"
echo ""
echo "Health:    https://${DOMAIN}/api/health"
echo ""
echo "Admin API Key: ${ADMIN_API_KEY}"
echo ""
echo "Save the following credentials securely:"
echo "  POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}"
echo "  REDIS_PASSWORD: ${REDIS_PASSWORD}"
echo "  SESSION_SECRET: ${SESSION_SECRET}"
echo "  JWT_SECRET: ${JWT_SECRET}"
echo "============================================"