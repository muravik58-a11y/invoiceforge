#!/bin/bash
# Run this on the Namecheap server to deploy updates.
# Usage: bash scripts/deploy.sh

set -e

APP_DIR="$HOME/invoiceforge-uk"
NODE_ENV_DIR="$HOME/nodevenv/invoiceforge-uk/20"

echo "==> Pulling latest code..."
cd "$APP_DIR"
git pull origin main

echo "==> Activating Node.js virtual environment..."
source "$NODE_ENV_DIR/bin/activate"

echo "==> Installing dependencies..."
npm ci --omit=dev --prefer-offline 2>/dev/null || npm install --omit=dev

echo "==> Building..."
NODE_OPTIONS="--max-old-space-size=1536" npm run build

echo "==> Restarting app (touch restart.txt)..."
mkdir -p tmp
touch tmp/restart.txt

echo ""
echo "✓ Deploy complete. If the app doesn't restart automatically,"
echo "  go to cPanel → Node.js Apps → Restart."
